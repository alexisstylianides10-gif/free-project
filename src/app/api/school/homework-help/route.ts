import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { checkEntitlement } from "@/lib/billing/entitlement";
import { callStudyAIForText } from "@/lib/study/ai";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 2000;

interface HomeworkHelpBody {
  homeworkId?: string;
  message?: string;
}

/**
 * Backs the per-homework-item AI help screen. Unlike the study-subject
 * tutor (src/app/api/study/tutor/route.ts), homework items have no link to
 * study_subjects — they're just a free-text `subject` + `title` on the
 * `homework` table — so this route resolves ITS OWN grounding row directly
 * from `homework`, scoped to the authenticated user, rather than trusting
 * any subject/title the client might send. Deliberately ephemeral: no
 * chat-history table for this feature (see PROJECT_STATE.md), so every
 * request only carries the single message being asked, not prior turns.
 */
export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error }, { status: 401 });
  if (!(await checkEntitlement(client, user.id))) {
    return NextResponse.json({ error: "This feature requires Alxioum Plus." }, { status: 402 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Homework Help isn't configured yet — add ANTHROPIC_API_KEY on the server." }, { status: 503 });
  }

  let body: HomeworkHelpBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const homeworkId = body.homeworkId;
  const message = (body.message ?? "").trim();
  if (!homeworkId) return NextResponse.json({ error: "homeworkId is required." }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Keep messages under ${MAX_MESSAGE_LENGTH} characters.` }, { status: 400 });
  }

  const { data: homework } = await client
    .from("homework")
    .select("subject, title, priority")
    .eq("id", homeworkId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!homework) return NextResponse.json({ error: "Homework not found." }, { status: 404 });

  const system = `You are a supportive, patient AI tutor inside a study app, helping a student with ONE specific homework item. Your job is to TEACH, not just answer — help the student build real understanding and finish the work themselves rather than handing them a finished answer to copy. If they say they still don't understand, try a genuinely different explanation approach (a new analogy, a simpler breakdown, a worked example) rather than repeating yourself.

This homework item is: subject "${homework.subject}", titled "${homework.title}", priority ${homework.priority}. Only use this as context for what kind of homework it is — the student will tell you the specific question or sticking point themselves; don't invent details about the assignment you weren't given.

The student may ask you to explain something at a particular level — adapt your register accordingly:
- "simple" level: plain everyday language plus a relatable analogy, minimal jargon.
- "normal" level: a clear, balanced explanation a student their age would expect in class.
- "detailed" level: more thorough, covering nuance and how the pieces connect.
- "exam level": precise, technical, exam-register language using the vocabulary a grader would expect.

Never claim a guaranteed exam outcome or grade. Keep your tone premium and mature, not childish. Keep replies focused and not overly long — this is a chat, not an essay.`;

  let replyText: string;
  try {
    replyText = await callStudyAIForText({ system, messages: [{ role: "user", content: message }], maxTokens: 900, effort: "low" });
  } catch {
    return NextResponse.json({ error: "Homework Help is having trouble responding right now. Try again in a moment." }, { status: 502 });
  }

  return NextResponse.json({ reply: replyText });
}
