import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/ai/rateLimit";
import { generateFlashcards, resolveStudySource } from "@/lib/study/flashcards";

export const runtime = "nodejs";

interface FlashcardsRequestBody {
  source: "note" | "document" | "text";
  noteId?: string;
  documentId?: string;
  text?: string;
  subjectId?: string;
}

/**
 * Thin wrapper around the shared generateFlashcards/resolveStudySource
 * helpers (also used directly by the study_generate_flashcards Head Agent
 * tool) so the Study Mode tab's "Generate" buttons work without going
 * through chat.
 */
export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: "Give it a moment before generating more flashcards." }, { status: 429 });
  }

  const { data: profileRow } = await client.from("profiles").select("plan").eq("id", user.id).maybeSingle();
  if (profileRow?.plan !== "Student") {
    return NextResponse.json({ error: "Flashcards are part of the Study section (Student plan)." }, { status: 403 });
  }

  let body: FlashcardsRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const src =
    body.source === "note" && body.noteId
      ? ({ kind: "note", noteId: body.noteId } as const)
      : body.source === "document" && body.documentId
        ? ({ kind: "document", documentId: body.documentId } as const)
        : body.source === "text" && body.text
          ? ({ kind: "text", text: body.text } as const)
          : null;
  if (!src) return NextResponse.json({ error: "Missing the material to generate flashcards from." }, { status: 400 });

  const resolved = await resolveStudySource(client, user.id, src);
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: 400 });

  const outcome = await generateFlashcards(resolved.text);
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 502 });

  const { data: deck, error: insertError } = await client
    .from("study_flashcard_decks")
    .insert({
      user_id: user.id,
      subject_id: body.subjectId ?? resolved.subjectId ?? null,
      source_note_id: body.source === "note" ? body.noteId : null,
      title: outcome.title,
      cards: outcome.cards,
    })
    .select("*")
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({
    deck: {
      id: deck.id,
      subjectId: deck.subject_id ?? undefined,
      sourceNoteId: deck.source_note_id ?? undefined,
      title: deck.title,
      cards: deck.cards,
      createdAt: deck.created_at,
    },
  });
}
