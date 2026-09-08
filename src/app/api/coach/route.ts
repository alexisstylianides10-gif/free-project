import "server-only";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/supabase/server";
import { checkEntitlement } from "@/lib/billing/entitlement";
import { buildCoachSystemPrompt } from "@/lib/coach/systemPrompt";
import { languageInstruction } from "@/lib/i18n/aiInstruction";
import { getUserLanguage } from "@/lib/i18n/serverLocale";
import { generateWeakAreaPlan } from "@/lib/study/weakArea";
import { StudyAIError } from "@/lib/study/ai";
import type { Homework, Exam, OnboardingResponse, Profile, CareerPath, BusinessProfile, BusinessMilestone } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const WEAK_AREA_TOOL: Anthropic.Messages.Tool = {
  name: "create_weak_area_plan",
  description:
    "Builds a personalized improvement plan (practice exercises, a step-by-step roadmap, and/or resource recommendations, " +
    "whichever actually fits) for a specific difficulty the student describes with one of their school subjects, and saves " +
    "it under that subject in the app. Only call this when the student clearly describes a specific, real difficulty with " +
    "a subject they study (e.g. 'my English reading is bad', 'I don't get fractions') — not for vague complaints or " +
    "questions you can just answer directly in chat.",
  input_schema: {
    type: "object",
    properties: {
      subjectName: {
        type: "string",
        description: "The subject name, as close as possible to one of the student's existing subjects (e.g. 'English', 'Maths').",
      },
      description: {
        type: "string",
        description: "A clear restatement of the specific problem the student described, in their own terms.",
      },
    },
    required: ["subjectName", "description"],
  },
};

async function runWeakAreaTool(
  client: SupabaseClient,
  userId: string,
  input: { subjectName?: string; description?: string }
): Promise<string> {
  const subjectName = (input.subjectName ?? "").trim();
  const description = (input.description ?? "").trim();
  if (!subjectName || !description) return JSON.stringify({ error: "Missing subjectName or description." });

  const { data: subjects } = await client.from("study_subjects").select("id, name").eq("user_id", userId);
  const normalized = subjectName.toLowerCase();
  const match =
    (subjects ?? []).find((s) => s.name.toLowerCase() === normalized) ??
    (subjects ?? []).find((s) => s.name.toLowerCase().includes(normalized) || normalized.includes(s.name.toLowerCase()));

  if (!match) {
    return JSON.stringify({
      error: "no_matching_subject",
      availableSubjects: (subjects ?? []).map((s) => s.name),
    });
  }

  try {
    const plan = await generateWeakAreaPlan({
      client,
      userId,
      subjectId: match.id,
      subjectName: match.name,
      description,
      language: await getUserLanguage(client, userId),
    });
    return JSON.stringify({ ok: true, subjectName: match.name, summary: plan.plan?.summary ?? null });
  } catch (err) {
    return JSON.stringify({ error: err instanceof StudyAIError ? err.message : "Couldn't build a plan for that." });
  }
}

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

  // Only students have study_subjects to attach a plan to — the tool is
  // simply omitted for founder-track accounts rather than offered and then
  // always failing to find a matching subject.
  const tools = profile.track === "student" ? [WEAK_AREA_TOOL] : undefined;

  let replyText: string;
  try {
    let response = await anthropicClient().messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      tools,
      output_config: { effort: "low" },
    });

    // Single tool-use round trip: run the tool, feed its result back, and
    // let the model compose the actual reply from it. No further tool calls
    // are honored in that follow-up (no `tools` on the second request) —
    // one plan per message is plenty, and it keeps this from looping.
    if (response.stop_reason === "tool_use") {
      const toolUseBlock = response.content.find((b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use");
      if (toolUseBlock && toolUseBlock.name === "create_weak_area_plan") {
        const toolResult = await runWeakAreaTool(client, user.id, toolUseBlock.input as { subjectName?: string; description?: string });
        const followUp = await anthropicClient().messages.create({
          model: MODEL,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            ...messages,
            { role: "assistant", content: response.content },
            { role: "user", content: [{ type: "tool_result", tool_use_id: toolUseBlock.id, content: toolResult }] },
          ],
          output_config: { effort: "low" },
        });
        response = followUp;
      }
    }

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
        system: `Give a 3-6 word title summarizing this conversation. No quotes, no punctuation at the end, no markdown.${languageInstruction(profile.language)}`,
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
