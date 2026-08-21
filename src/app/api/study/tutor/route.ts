import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { checkEntitlement } from "@/lib/billing/entitlement";
import { callStudyAIForText } from "@/lib/study/ai";
import type { StudyTopic } from "@/lib/study/types";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 2000;
const HISTORY_LIMIT = 10;

interface TutorBody {
  subjectId?: string;
  topicId?: string | null;
  message?: string;
}

/**
 * Backs the Learn-mode tutor chat (and, subject-scoped with no topicId, the
 * Homework Help screen). Always resolves the topic itself from the
 * database rather than trusting anything about it from the client, and
 * only ever feeds Claude *that one topic's* name/summary/key_concepts —
 * never other topics or subjects — per the product's explicit privacy
 * requirement for this feature.
 */
export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error }, { status: 401 });
  if (!(await checkEntitlement(client, user.id))) {
    return NextResponse.json({ error: "This feature requires Alxioum Plus." }, { status: 402 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "The AI Tutor isn't configured yet — add ANTHROPIC_API_KEY on the server." }, { status: 503 });
  }

  let body: TutorBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const subjectId = body.subjectId;
  const message = (body.message ?? "").trim();
  if (!subjectId) return NextResponse.json({ error: "subjectId is required." }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Keep messages under ${MAX_MESSAGE_LENGTH} characters.` }, { status: 400 });
  }

  const { data: subject } = await client.from("study_subjects").select("*").eq("id", subjectId).maybeSingle();
  if (!subject) return NextResponse.json({ error: "Subject not found." }, { status: 404 });

  let topic: StudyTopic | null = null;
  if (body.topicId) {
    const { data: topicRow } = await client.from("study_topics").select("*").eq("id", body.topicId).maybeSingle();
    // Only trust the topic if it actually belongs to this subject — this is
    // the enforcement point for "never send unrelated topics/subjects".
    if (topicRow && topicRow.subject_id === subjectId) topic = topicRow as StudyTopic;
  }
  const topicId = topic?.id ?? null;

  const { data: historyRows } = await client
    .from("study_tutor_messages")
    .select("role, content")
    .eq("subject_id", subjectId)
    .eq("user_id", user.id)
    .filter("topic_id", topicId ? "eq" : "is", topicId ?? null)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  const history = ((historyRows as { role: "user" | "assistant"; content: string }[]) ?? []).reverse();

  const knowledgeContext = topic
    ? `You are tutoring the student on ONE specific topic within "${subject.name}": "${topic.name}".
Topic summary: ${topic.summary ?? "(no summary provided)"}
Key concepts: ${topic.key_concepts.length ? topic.key_concepts.join(", ") : "(none listed)"}
Only use this topic's content as your knowledge context — do not reference or assume other topics or subjects the student may be studying.`
    : `You are tutoring the student generally within their "${subject.name}" subject. No single topic is selected, so keep guidance general to the subject rather than inventing specifics about topics you weren't given.`;

  const system = `You are a supportive, patient AI tutor inside a study app. Your job is to TEACH, not just answer — help the student build real understanding rather than handing them a finished answer to copy. If they say they still don't understand, try a genuinely different explanation approach (a new analogy, a simpler breakdown, a worked example) rather than repeating yourself.

${knowledgeContext}

The student may ask you to explain something at a particular level — adapt your register accordingly:
- "simple" level: plain everyday language plus a relatable analogy, minimal jargon.
- "normal" level: a clear, balanced explanation a student their age would expect in class.
- "detailed" level: more thorough, covering nuance and how the pieces connect.
- "exam level": precise, technical, exam-register language using the vocabulary a grader would expect.

Never claim a guaranteed exam outcome or grade. Keep your tone premium and mature, not childish. Keep replies focused and not overly long — this is a chat, not an essay.`;

  const messages = [...history.map((h) => ({ role: h.role, content: h.content })), { role: "user" as const, content: message }];

  let replyText: string;
  try {
    replyText = await callStudyAIForText({ system, messages, maxTokens: 900, effort: "low" });
  } catch {
    return NextResponse.json({ error: "The AI Tutor is having trouble responding right now. Try again in a moment." }, { status: 502 });
  }

  await client.from("study_tutor_messages").insert([
    { user_id: user.id, subject_id: subjectId, topic_id: topicId, role: "user", content: message },
    { user_id: user.id, subject_id: subjectId, topic_id: topicId, role: "assistant", content: replyText },
  ]);

  return NextResponse.json({ reply: replyText });
}
