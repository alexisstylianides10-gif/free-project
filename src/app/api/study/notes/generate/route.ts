import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { ClaudeProvider } from "@/lib/ai/claudeProvider";
import { isRateLimited } from "@/lib/ai/rateLimit";

export const runtime = "nodejs";

const provider = new ClaudeProvider();

interface NotesRequestBody {
  topic: string;
  subjectId?: string;
}

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: "Give it a moment before generating more notes." }, { status: 429 });
  }

  const { data: profileRow } = await client.from("profiles").select("plan").eq("id", user.id).maybeSingle();
  if (profileRow?.plan !== "Student") {
    return NextResponse.json({ error: "AI notes are part of the Study section (Student plan)." }, { status: 403 });
  }

  let body: NotesRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const topic = (body.topic ?? "").trim();
  if (!topic) return NextResponse.json({ error: "Give Alxioum a topic or some text to make notes from." }, { status: 400 });
  if (topic.length > 8000) return NextResponse.json({ error: "That's too long — try pasting a shorter excerpt." }, { status: 400 });

  if (body.subjectId) {
    const { data: subject } = await client.from("subjects").select("id").eq("id", body.subjectId).eq("user_id", user.id).maybeSingle();
    if (!subject) return NextResponse.json({ error: "That subject wasn't found." }, { status: 400 });
  }

  const prompt = `Turn the following into clear, well-organized study notes a student can revise from. If it reads like a specific topic (e.g. "photosynthesis", "the French Revolution"), write notes teaching that topic accurately. If it reads like pasted material (an excerpt, a definition list, class content), summarize and structure THAT content rather than writing about something else.

Format as plain text (no markdown symbols like # or **): a short title-worthy line first, then organize the body into a few clearly labeled sections in ALL CAPS as headers, with "-" for bullet points under each. Keep it focused and exam-useful — key facts, definitions, and relationships, not filler. Under 400 words.

Content to turn into notes:
"""
${topic}
"""`;

  let text: string;
  try {
    const response = await provider.createMessage({
      system:
        "You are a careful study-notes assistant for a student. Only include facts you're confident about — if you're unsure of a detail, omit it rather than guessing. Never invent citations, dates, or figures.",
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      tools: [],
      maxTokens: 900,
      enableWebSearch: false,
    });
    text = response.content
      .filter((b): b is Extract<typeof response.content[number], { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("\n\n")
      .trim();
    if (!text) throw new Error("empty response");
  } catch (err) {
    console.error("[study/notes/generate] failed:", err);
    return NextResponse.json({ error: "Couldn't generate notes right now. Try again shortly." }, { status: 502 });
  }

  const firstLine = text.split("\n")[0]?.trim() || topic.slice(0, 60);
  const title = firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;

  const { data: noteRow, error: insertError } = await client
    .from("study_notes")
    .insert({ user_id: user.id, subject_id: body.subjectId ?? null, title, content: text, source_input: topic.slice(0, 500) })
    .select("*")
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({
    note: {
      id: noteRow.id,
      subjectId: noteRow.subject_id ?? undefined,
      title: noteRow.title,
      content: noteRow.content,
      sourceInput: noteRow.source_input,
      createdAt: noteRow.created_at,
    },
  });
}
