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

interface HomeworkStep {
  title: string;
  guidance: string;
}

const WALKTHROUGH_TOOL: Anthropic.Messages.Tool = {
  name: "record_walkthrough",
  description: "Record a step-by-step tutoring walkthrough for a homework problem shown in a photo.",
  input_schema: {
    type: "object",
    properties: {
      subject: { type: "string", description: "Short subject/topic label, e.g. 'Algebra', 'Chemistry — stoichiometry'." },
      problemSummary: { type: "string", description: "One sentence restating what the problem is asking, so the student knows you read it correctly." },
      steps: {
        type: "array",
        description:
          "3-6 progressive steps that TEACH the student to solve it themselves — a Socratic nudge first, not the answer. Each step should build on the last. The final step's guidance may complete the working, but should still explain the reasoning, not just state a bare answer.",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short label for the step, e.g. 'Identify what's given'." },
            guidance: { type: "string", description: "1-3 sentences of guidance for this step." },
          },
          required: ["title", "guidance"],
        },
      },
      finalAnswer: { type: "string", description: "The final answer, stated plainly, with a one-line reason it's correct. Only fill this in if the image clearly shows a solvable, well-defined problem." },
    },
    required: ["subject", "problemSummary", "steps"],
  },
};

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: "Give it a moment before trying another problem." }, { status: 429 });
  }

  const { data: profileRow } = await client.from("profiles").select("plan").eq("id", user.id).maybeSingle();
  if (profileRow?.plan !== "Student") {
    return NextResponse.json({ error: "Homework Helper is part of the Study section (Student plan)." }, { status: 403 });
  }

  let body: { image?: { base64: string; mediaType: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.image) return NextResponse.json({ error: "Attach a photo of the problem." }, { status: 400 });
  if (!ALLOWED_IMAGE_TYPES.includes(body.image.mediaType as AllowedImageType)) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
  }
  if (!body.image.base64 || body.image.base64.length > MAX_IMAGE_BASE64_LENGTH) {
    return NextResponse.json({ error: "That image is too large." }, { status: 400 });
  }

  try {
    const response = await anthropic().messages.create({
      model: process.env.ALXIOUM_MODEL || "claude-sonnet-4-5-20250929",
      max_tokens: 900,
      system:
        "You are a patient, encouraging tutor. Your job is to help the student understand HOW to solve the problem themselves, not to just hand them the answer. Build genuine understanding step by step. If the photo is blurry, cut off, or you can't make out the problem clearly, say so honestly in problemSummary and keep steps minimal rather than guessing at a problem that isn't actually shown.",
      tools: [WALKTHROUGH_TOOL],
      tool_choice: { type: "tool", name: "record_walkthrough" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: body.image.mediaType as AllowedImageType, data: body.image.base64 } },
            { type: "text", text: "Here's a photo of my homework problem. Walk me through solving it." },
          ],
        },
      ],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    const input =
      (toolUse && "input" in toolUse
        ? (toolUse.input as { subject?: string; problemSummary?: string; steps?: HomeworkStep[]; finalAnswer?: string })
        : undefined) ?? {};

    if (!input.problemSummary || !input.steps?.length) {
      return NextResponse.json({ error: "Couldn't make out a problem in that photo — try a clearer, closer shot." }, { status: 422 });
    }

    return NextResponse.json({
      subject: input.subject ?? "",
      problemSummary: input.problemSummary,
      steps: input.steps,
      finalAnswer: input.finalAnswer ?? "",
    });
  } catch (err) {
    console.error("[study/homework] failed:", err);
    return NextResponse.json({ error: "Couldn't look at that problem right now. Try again shortly." }, { status: 502 });
  }
}
