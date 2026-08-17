import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Flashcard } from "@/lib/types";

let cachedClient: Anthropic | null = null;
function anthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

const FLASHCARDS_TOOL: Anthropic.Messages.Tool = {
  name: "record_flashcards",
  description: "Record a set of flashcards generated strictly from the supplied study material.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "A short deck title summarizing the material, e.g. 'Cell Biology — Photosynthesis'." },
      cards: {
        type: "array",
        minItems: 5,
        maxItems: 20,
        description: "Flashcards covering the key facts/definitions/relationships actually present in the material — never invent a fact that isn't there.",
        items: {
          type: "object",
          properties: {
            front: { type: "string", description: "A question or term." },
            back: { type: "string", description: "The answer or definition." },
          },
          required: ["front", "back"],
        },
      },
    },
    required: ["title", "cards"],
  },
};

export type GenerateFlashcardsOutcome = { ok: true; title: string; cards: Flashcard[] } | { ok: false; error: string };

/**
 * Grounded only in the supplied material — never fabricates facts beyond it.
 * Shared by the study_generate_flashcards tool and the Study Mode UI route,
 * same pattern as business/strategy.ts's generateMarketingIdeas.
 */
export async function generateFlashcards(material: string): Promise<GenerateFlashcardsOutcome> {
  const trimmed = material.trim();
  if (!trimmed) return { ok: false, error: "No material to generate flashcards from." };

  try {
    const response = await anthropic().messages.create({
      model: process.env.ALXIOUM_MODEL || "claude-sonnet-4-5-20250929",
      max_tokens: 1500,
      system:
        "You are creating flashcards for a student to revise from. Only include facts, definitions, and relationships that are actually present in the supplied material — never invent something not there, and never pad with generic filler cards. If the material is too thin for 5 good cards, make fewer rather than inventing content.",
      tools: [FLASHCARDS_TOOL],
      tool_choice: { type: "tool", name: "record_flashcards" },
      messages: [{ role: "user", content: [{ type: "text", text: `Study material:\n"""\n${trimmed.slice(0, 20000)}\n"""` }] }],
    });
    const toolUse = response.content.find((b) => b.type === "tool_use");
    const input = (toolUse && "input" in toolUse ? (toolUse.input as { title?: string; cards?: Flashcard[] }) : undefined) ?? {};
    if (!input.cards?.length) return { ok: false, error: "Couldn't make flashcards from that material." };
    return { ok: true, title: input.title || "Untitled deck", cards: input.cards };
  } catch (err) {
    console.error("[study/flashcards] failed:", err);
    return { ok: false, error: "Couldn't generate flashcards right now. Try again shortly." };
  }
}

/** Resolves the raw text to generate from, given one of note/document/text sources. Never guesses — throws a user-facing error string if the source can't be resolved. */
export async function resolveStudySource(
  supabase: SupabaseClient,
  userId: string,
  source: { kind: "note"; noteId: string } | { kind: "document"; documentId: string } | { kind: "text"; text: string }
): Promise<{ ok: true; text: string; subjectId?: string } | { ok: false; error: string }> {
  if (source.kind === "text") {
    if (!source.text.trim()) return { ok: false, error: "Paste some material first." };
    return { ok: true, text: source.text };
  }
  if (source.kind === "note") {
    const { data } = await supabase.from("study_notes").select("content,subject_id").eq("id", source.noteId).eq("user_id", userId).maybeSingle();
    if (!data) return { ok: false, error: "That note wasn't found." };
    return { ok: true, text: data.content, subjectId: data.subject_id ?? undefined };
  }
  const { data } = await supabase.from("documents").select("extracted_text,summary").eq("id", source.documentId).eq("user_id", userId).maybeSingle();
  if (!data) return { ok: false, error: "That document wasn't found." };
  const text = data.extracted_text || data.summary;
  if (!text) return { ok: false, error: "That document doesn't have readable text yet." };
  return { ok: true, text };
}
