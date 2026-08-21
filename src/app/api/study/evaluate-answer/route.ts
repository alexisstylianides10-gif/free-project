import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { checkEntitlement } from "@/lib/billing/entitlement";
import { callStudyAIForJSON } from "@/lib/study/ai";
import type { AnswerVerdict } from "@/lib/study/types";

export const runtime = "nodejs";

interface EvaluateBody {
  topicId?: string;
  question?: string;
  studentAnswer?: string;
}

interface EvaluateResult {
  verdict: AnswerVerdict;
  explanation: string;
}

const VALID_VERDICTS: AnswerVerdict[] = ["correct", "almost", "review"];

/**
 * Pure grading endpoint — grades one active-recall answer against a topic's
 * own content and returns a verdict + explanation. Deliberately does NOT
 * touch study_topics mastery itself; the caller (Practice/Quiz mode client)
 * decides when to call updateTopicMastery, so this route stays reusable by
 * both without double-updating mastery.
 */
export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error }, { status: 401 });
  if (!(await checkEntitlement(client, user.id))) {
    return NextResponse.json({ error: "This feature requires Alxioum Plus." }, { status: 402 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Answer grading isn't configured yet — add ANTHROPIC_API_KEY on the server." }, { status: 503 });
  }

  let body: EvaluateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const topicId = body.topicId;
  const question = (body.question ?? "").trim();
  const studentAnswer = (body.studentAnswer ?? "").trim();
  if (!topicId) return NextResponse.json({ error: "topicId is required." }, { status: 400 });
  if (!question) return NextResponse.json({ error: "question is required." }, { status: 400 });
  if (!studentAnswer) return NextResponse.json({ error: "studentAnswer is required." }, { status: 400 });

  const { data: topic } = await client.from("study_topics").select("*").eq("id", topicId).maybeSingle();
  if (!topic) return NextResponse.json({ error: "Topic not found." }, { status: 404 });

  const system = `You are grading a student's free-text answer to an active-recall study question, using ONLY the given topic's own content as the source of truth. Be fair and encouraging but honest — don't mark a wrong or vague answer as correct.

Topic: ${topic.name}
Topic summary: ${topic.summary ?? "(no summary provided)"}
Key concepts: ${topic.key_concepts.length ? topic.key_concepts.join(", ") : "(none listed)"}

Verdicts:
- "correct": the answer demonstrates real understanding of what was asked.
- "almost": on the right track but missing something important or partly wrong.
- "review": the answer is wrong, missing, or shows a real misunderstanding.

The explanation should be brief (1-3 sentences), say specifically why, and if the answer was wrong or partial, clarify the actual concept so the student learns something from the grading itself.`;

  const userText = `Question: ${question}\nStudent's answer: ${studentAnswer}\n\nReturn JSON: {"verdict": "correct" | "almost" | "review", "explanation": string}`;

  let result: EvaluateResult;
  try {
    result = await callStudyAIForJSON<EvaluateResult>({ system, userText, maxTokens: 500, effort: "low" });
  } catch {
    return NextResponse.json({ error: "Couldn't grade that answer right now. Try again in a moment." }, { status: 502 });
  }

  if (!VALID_VERDICTS.includes(result.verdict)) {
    result.verdict = "review";
  }
  if (!result.explanation) {
    result.explanation = "Take another look at this topic's key concepts and try again.";
  }

  return NextResponse.json(result);
}
