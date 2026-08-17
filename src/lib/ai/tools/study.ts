import type { ToolSpec } from "./types";
import { generateFlashcards, resolveStudySource } from "@/lib/study/flashcards";
import { generateQuiz } from "@/lib/study/quizzes";

export const studyGenerateFlashcards: ToolSpec<{ source: "note" | "document" | "text"; noteId?: string; documentId?: string; text?: string; subjectId?: string }> = {
  name: "study_generate_flashcards",
  statusLabel: "Making flashcards…",
  description:
    "Generate a deck of flashcards grounded strictly in a study note, an existing document, or pasted text — never invents facts beyond the source. Saves the deck immediately (Student plan feature).",
  inputSchema: {
    type: "object",
    properties: {
      source: { type: "string", enum: ["note", "document", "text"] },
      noteId: { type: "string", description: "Required if source is 'note' — an exact id from a prior study notes lookup." },
      documentId: { type: "string", description: "Required if source is 'document' — an exact id from documents_search." },
      text: { type: "string", description: "Required if source is 'text' — the pasted material." },
      subjectId: { type: "string", description: "Optional subject to file the deck under." },
    },
    required: ["source"],
  },
  consequential: false,
  execute: async (ctx, input) => {
    const { data: profile } = await ctx.supabase.from("profiles").select("plan").eq("id", ctx.userId).maybeSingle();
    if (profile?.plan !== "Student") return { ok: false, error: "Flashcards are part of the Study section (Student plan)." };

    const src =
      input.source === "note" && input.noteId
        ? ({ kind: "note", noteId: input.noteId } as const)
        : input.source === "document" && input.documentId
          ? ({ kind: "document", documentId: input.documentId } as const)
          : input.source === "text" && input.text
            ? ({ kind: "text", text: input.text } as const)
            : null;
    if (!src) return { ok: false, error: "Missing the material to generate flashcards from." };

    const resolved = await resolveStudySource(ctx.supabase, ctx.userId, src);
    if (!resolved.ok) return { ok: false, error: resolved.error };

    const outcome = await generateFlashcards(resolved.text);
    if (!outcome.ok) return { ok: false, error: outcome.error };

    const { data, error } = await ctx.supabase
      .from("study_flashcard_decks")
      .insert({
        user_id: ctx.userId,
        subject_id: input.subjectId ?? resolved.subjectId ?? null,
        source_note_id: input.source === "note" ? input.noteId : null,
        title: outcome.title,
        cards: outcome.cards,
      })
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: { deck: data } };
  },
};

export const studyGenerateQuiz: ToolSpec<{ source: "note" | "document" | "text"; noteId?: string; documentId?: string; text?: string; subjectId?: string }> = {
  name: "study_generate_quiz",
  statusLabel: "Making a quiz…",
  description:
    "Generate a practice quiz grounded strictly in a study note, an existing document, or pasted text — never invents facts beyond the source. Saves the quiz immediately (Student plan feature).",
  inputSchema: {
    type: "object",
    properties: {
      source: { type: "string", enum: ["note", "document", "text"] },
      noteId: { type: "string" },
      documentId: { type: "string" },
      text: { type: "string" },
      subjectId: { type: "string" },
    },
    required: ["source"],
  },
  consequential: false,
  execute: async (ctx, input) => {
    const { data: profile } = await ctx.supabase.from("profiles").select("plan").eq("id", ctx.userId).maybeSingle();
    if (profile?.plan !== "Student") return { ok: false, error: "Quizzes are part of the Study section (Student plan)." };

    const src =
      input.source === "note" && input.noteId
        ? ({ kind: "note", noteId: input.noteId } as const)
        : input.source === "document" && input.documentId
          ? ({ kind: "document", documentId: input.documentId } as const)
          : input.source === "text" && input.text
            ? ({ kind: "text", text: input.text } as const)
            : null;
    if (!src) return { ok: false, error: "Missing the material to generate a quiz from." };

    const resolved = await resolveStudySource(ctx.supabase, ctx.userId, src);
    if (!resolved.ok) return { ok: false, error: resolved.error };

    const outcome = await generateQuiz(resolved.text);
    if (!outcome.ok) return { ok: false, error: outcome.error };

    const { data, error } = await ctx.supabase
      .from("study_quizzes")
      .insert({
        user_id: ctx.userId,
        subject_id: input.subjectId ?? resolved.subjectId ?? null,
        source_note_id: input.source === "note" ? input.noteId : null,
        title: outcome.title,
        questions: outcome.questions,
      })
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: { quiz: data } };
  },
};

export const studyTools = [studyGenerateFlashcards, studyGenerateQuiz];
