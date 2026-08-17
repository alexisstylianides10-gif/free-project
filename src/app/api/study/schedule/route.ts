import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/ai/rateLimit";

export const runtime = "nodejs";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];
const MAX_IMAGE_BASE64_LENGTH = 6_000_000; // ~4.5MB raw

let cachedClient: Anthropic | null = null;
function anthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

interface ExtractedLesson {
  subject: string;
  dayOfWeek: (typeof DAYS)[number];
  startTime: string;
  endTime: string;
  room?: string;
  teacher?: string;
}

const SCHEDULE_TOOL: Anthropic.Messages.Tool = {
  name: "record_schedule",
  description: "Record the class/lesson timetable shown in a photo of a school schedule.",
  input_schema: {
    type: "object",
    properties: {
      lessons: {
        type: "array",
        description:
          "Every lesson block actually visible in the photo — one entry per (subject, day, time) combination. If a subject meets on several days at the same time, list it once per day. Never invent a subject, day, or time that isn't shown.",
        items: {
          type: "object",
          properties: {
            subject: { type: "string", description: "The class/subject name as written, e.g. 'Algebra II', 'Chemistry'." },
            dayOfWeek: { type: "string", enum: DAYS as unknown as string[] },
            startTime: { type: "string", description: "HH:mm, 24h." },
            endTime: { type: "string", description: "HH:mm, 24h." },
            room: { type: "string", description: "Room/location if shown." },
            teacher: { type: "string", description: "Teacher name if shown." },
          },
          required: ["subject", "dayOfWeek", "startTime", "endTime"],
        },
      },
      note: { type: "string", description: "If the photo doesn't look like a class schedule, or is too unclear to read reliably, explain why here and leave lessons empty." },
    },
    required: ["lessons"],
  },
};

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: "Give it a moment before trying again." }, { status: 429 });
  }

  const { data: profileRow } = await client.from("profiles").select("plan").eq("id", user.id).maybeSingle();
  if (profileRow?.plan !== "Student") {
    return NextResponse.json({ error: "Schedule import is part of the Study section (Student plan)." }, { status: 403 });
  }

  let body: { image?: { base64: string; mediaType: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.image) return NextResponse.json({ error: "Attach a photo of your schedule." }, { status: 400 });
  if (!ALLOWED_IMAGE_TYPES.includes(body.image.mediaType as AllowedImageType)) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
  }
  if (!body.image.base64 || body.image.base64.length > MAX_IMAGE_BASE64_LENGTH) {
    return NextResponse.json({ error: "That image is too large." }, { status: 400 });
  }

  try {
    const response = await anthropic().messages.create({
      model: process.env.ALXIOUM_MODEL || "claude-sonnet-4-5-20250929",
      max_tokens: 1500,
      system:
        "You are reading a photo of a school class schedule/timetable to help a student import it. Only record lessons you can actually read in the image — never guess a subject, day, or time that isn't legibly shown. If the photo is blurry, cropped, or clearly isn't a class schedule, say so in `note` and return an empty lessons array rather than fabricating a plausible-looking timetable.",
      tools: [SCHEDULE_TOOL],
      tool_choice: { type: "tool", name: "record_schedule" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: body.image.mediaType as AllowedImageType, data: body.image.base64 } },
            { type: "text", text: "Here's a photo of my class schedule. Extract every lesson block shown." },
          ],
        },
      ],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    const input = (toolUse && "input" in toolUse ? (toolUse.input as { lessons?: ExtractedLesson[]; note?: string }) : undefined) ?? {};
    const lessons = input.lessons ?? [];

    if (!lessons.length) {
      return NextResponse.json({ error: input.note || "Couldn't make out a schedule in that photo — try a clearer, closer shot of the timetable." }, { status: 422 });
    }

    return NextResponse.json({ lessons, note: input.note ?? "" });
  } catch (err) {
    console.error("[study/schedule] failed:", err);
    return NextResponse.json({ error: "Couldn't read that schedule right now. Try again shortly." }, { status: 502 });
  }
}
