import "server-only";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/supabase/server";
import { checkEntitlement } from "@/lib/billing/entitlement";
import { buildCoachSystemPrompt } from "@/lib/coach/systemPrompt";
import type { Homework, Exam, OnboardingResponse, Profile, CareerPath, BusinessProfile, BusinessMilestone } from "@/lib/types";

export const runtime = "nodejs";

const MODEL = process.env.FUTUREOS_MODEL || "claude-opus-5";
const MAX_MESSAGE_LENGTH = 2000;

let cachedClient: Anthropic | null = null;
function anthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured on the server.");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error }, { status: 401 });
  if (!(await checkEntitlement(client, user.id))) {
    return NextResponse.json({ error: "This feature requires Alxioum Plus." }, { status: 402 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "The AI Coach isn't configured yet. Add ANTHROPIC_API_KEY on the server." }, { status: 503 });
  }

  let body: { message?: string; threadId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  const threadId = (body.threadId ?? "").trim();
  if (!message) return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Keep messages under ${MAX_MESSAGE_LENGTH} characters.` }, { status: 400 });
  }
  if (!threadId) return NextResponse.json({ error: "Missing threadId." }, { status: 400 });

  const { data: profileRow } = await client.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const profile = profileRow as Profile | null;
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  const { data: thread } = await client.from("chat_threads").select("id, title").eq("id", threadId).eq("user_id", user.id).maybeSingle();
  if (!thread) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  const needsTitle = !thread.title;

  const [historyRes, systemPrompt] = await Promise.all([
    client.from("chat_messages").select("role, content").eq("thread_id", threadId).order("created_at", { ascending: false }).limit(12),
    profile.track === "business"
      ? (async () => {
          const [businessProfileRes, milestonesRes] = await Promise.all([
            client.from("business_profiles").select("*").eq("user_id", user.id).maybeSingle(),
            client.from("business_milestones").select("*").eq("user_id", user.id).neq("status", "done").order("order_index", { ascending: true }).limit(6),
          ]);
          return buildCoachSystemPrompt({
            profile,
            onboarding: null,
            pendingHomework: [],
            upcomingExams: [],
            primaryCareerSlug: null,
            businessProfile: (businessProfileRes.data as BusinessProfile | null) ?? null,
            openMilestones: (milestonesRes.data as BusinessMilestone[]) ?? [],
          });
        })()
      : (async () => {
          const [onboardingRes, homeworkRes, examsRes, careerRes] = await Promise.all([
            client.from("onboarding_responses").select("*").eq("user_id", user.id).maybeSingle(),
            client.from("homework").select("*").eq("user_id", user.id).eq("status", "pending").order("due_date", { ascending: true }).limit(6),
            client.from("exams").select("*").eq("user_id", user.id).order("exam_date", { ascending: true }).limit(4),
            client.from("career_paths").select("*").eq("user_id", user.id).eq("is_primary", true).maybeSingle(),
          ]);
          return buildCoachSystemPrompt({
            profile,
            onboarding: (onboardingRes.data as OnboardingResponse | null) ?? null,
            pendingHomework: (homeworkRes.data as Homework[]) ?? [],
            upcomingExams: (examsRes.data as Exam[]) ?? [],
            primaryCareerSlug: (careerRes.data as CareerPath | null)?.career_slug ?? null,
          });
        })(),
  ]);

  const history = ((historyRes.data as { role: "user" | "assistant"; content: string }[]) ?? []).reverse();

  const messages: Anthropic.Messages.MessageParam[] = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user" as const, content: message },
  ];

  let replyText: string;
  try {
    const response = await anthropicClient().messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      output_config: { effort: "low" },
    });
    const textBlock = response.content.find((b): b is Anthropic.Messages.TextBlock => b.type === "text");
    replyText = textBlock?.text ?? "Sorry, I couldn't put that into words just now. Try asking again.";
  } catch {
    return NextResponse.json({ error: "The AI Coach is having trouble responding right now. Try again in a moment." }, { status: 502 });
  }

  await Promise.all([
    client.from("chat_messages").insert([
      { user_id: user.id, thread_id: threadId, role: "user", content: message },
      { user_id: user.id, thread_id: threadId, role: "assistant", content: replyText },
    ]),
    client.from("chat_threads").update({ last_message_at: new Date().toISOString() }).eq("id", threadId),
  ]);

  let title: string | null = null;
  if (needsTitle) {
    try {
      const titleResponse = await anthropicClient().messages.create({
        model: MODEL,
        max_tokens: 20,
        system: "Give a 3-6 word title summarizing this conversation. No quotes, no punctuation at the end, no markdown.",
        messages: [
          { role: "user", content: message },
          { role: "assistant", content: replyText },
        ],
        output_config: { effort: "low" },
      });
      const titleBlock = titleResponse.content.find((b): b is Anthropic.Messages.TextBlock => b.type === "text");
      title = titleBlock?.text.trim().replace(/^["']|["']$/g, "") || null;
      if (title) await client.from("chat_threads").update({ title }).eq("id", threadId);
    } catch {
      // Auto-naming is a nice-to-have — leave the thread untitled on failure.
    }
  }

  return NextResponse.json({ reply: replyText, title });
}
