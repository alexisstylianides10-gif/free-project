import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { checkEntitlement } from "@/lib/billing/entitlement";
import { callStudyAIForJSON } from "@/lib/study/ai";

export const runtime = "nodejs";

interface GenerateQuestionBody {
  topicId?: string;
  askedQuestions?: string[];
}

/**
 * Not one of the explicitly lettered routes in the brief, but Practice and
 * Quiz mode (section D) both need a fresh active-recall question generated
 * from a topic's own content, and callStudyAIForJSON is server-only — so a
 * small dedicated route is the only way to satisfy that without folding
 * unrelated concerns into /api/study/tutor or /api/study/evaluate-answer.
 * Kept intentionally tiny: one topic in, one question out, no persistence.
 */
export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error }, { status: 401 });
  if (!(await checkEntitlement(client, user.id))) {
    return NextResponse.json({ error: "This feature requires Alxioum Plus." }, { status: 402 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Study AI isn't configured yet. Add ANTHROPIC_API_KEY on the server." }, { status: 503 });
  }

  let body: GenerateQuestionBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const topicId = body.topicId;
  if (!topicId) return NextResponse.json({ error: "topicId is required." }, { status: 400 });

  const { data: topic } = await client.from("study_topics").select("*").eq("id", topicId).maybeSingle();
  if (!topic) return NextResponse.json({ error: "Topic not found." }, { status: 404 });

  const asked = (body.askedQuestions ?? []).filter(Boolean).slice(0, 10);

  const system = `You write one short active-recall study question at a time, using ONLY the given topic's own content. The question should require the student to explain or apply something, not just recognize it — avoid yes/no questions.

Topic: ${topic.name}
Topic summary: ${topic.summary ?? "(no summary provided)"}
Key concepts: ${topic.key_concepts.length ? topic.key_concepts.join(", ") : "(none listed)"}`;

  const userText = `${asked.length ? `Already asked (don't repeat these):\n${asked.map((q) => `- ${q}`).join("\n")}\n\n` : ""}Write one new active-recall question about this topic. Return JSON: {"question": string}`;

  try {
    const result = await callStudyAIForJSON<{ question: string }>({ system, userText, maxTokens: 300, effort: "low" });
    if (!result.question) throw new Error("empty");
    return NextResponse.json({ question: result.question });
  } catch {
    return NextResponse.json({ error: "Couldn't generate a question right now. Try again in a moment." }, { status: 502 });
  }
}
