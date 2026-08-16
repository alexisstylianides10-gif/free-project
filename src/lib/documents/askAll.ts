import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

let cachedClient: Anthropic | null = null;
function anthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

const ANSWER_TOOL: Anthropic.Messages.Tool = {
  name: "record_answer",
  description: "Record the answer to a question asked across the user's documents, citing exactly which document(s) support each claim.",
  input_schema: {
    type: "object",
    properties: {
      answer: {
        type: "string",
        description:
          "The answer, written for the user. If none of the provided documents contain the information needed, say so plainly instead of guessing. When citing facts, name the specific document (e.g. \"According to Lease Agreement.pdf...\").",
      },
      citedDocumentIds: { type: "array", items: { type: "string" }, description: "IDs of the documents (from the ones provided) that were actually used to answer." },
      confidence: { type: "string", enum: ["grounded", "uncertain"], description: "'grounded' if directly supported by the provided document content; 'uncertain' if inferring or unsure." },
    },
    required: ["answer", "confidence"],
  },
};

export interface AskAllResult {
  answer: string;
  citedDocuments: { id: string; name: string }[];
  confidence: "grounded" | "uncertain";
}

export type AskAllOutcome = { ok: true; result: AskAllResult } | { ok: false; error: string; status: number };

/**
 * Multi-document retrieval — real Postgres full-text search (no
 * embeddings), the same search_documents() RPC used by documents_search /
 * the Command Palette / single-document Q&A's sibling. Retrieves the top
 * handful of matches, sends each one's summary plus a short extracted_text
 * snippet (PDFs/images without stored text fall back to summary-only —
 * stated in the answer when it matters), and asks for one answer grounded
 * across all of them. Shared by /api/documents/ask-all and the
 * documents_ask_all Head Agent tool.
 */
export async function askAllDocuments(supabase: SupabaseClient, userId: string, question: string): Promise<AskAllOutcome> {
  const { data: matches, error: searchError } = await supabase.rpc("search_documents", { p_user_id: userId, p_query: question, p_limit: 5 });
  if (searchError) return { ok: false, error: "Couldn't search your documents right now.", status: 500 };

  const docs = (matches ?? []) as { id: string; name: string; summary: string; extracted_text: string | null }[];
  if (docs.length === 0) {
    return { ok: true, result: { answer: "I couldn't find any documents that seem relevant to that.", citedDocuments: [], confidence: "uncertain" } };
  }

  const context = docs
    .map((d, i) => {
      const snippet = d.extracted_text ? d.extracted_text.slice(0, 1500) : null;
      return `[Document ${i + 1}] id: ${d.id}\nName: ${d.name}\nSummary: ${d.summary || "(no summary)"}\n${snippet ? `Excerpt: ${snippet}` : "(no extracted text available — summary only)"}`;
    })
    .join("\n\n");

  let answer: string;
  let citedDocumentIds: string[];
  let confidence: "grounded" | "uncertain";
  try {
    const response = await anthropic().messages.create({
      model: process.env.ALXIOUM_MODEL || "claude-sonnet-4-5-20250929",
      max_tokens: 800,
      system:
        "You are answering a question across several of the user's documents on their behalf. You are given each document's summary and, when available, a short excerpt of its extracted text — not the full document. Answer strictly from what's provided; never invent facts. If a document only has a summary (no excerpt), be more cautious about specific details from it. Always name which document(s) support your answer.",
      tools: [ANSWER_TOOL],
      tool_choice: { type: "tool", name: "record_answer" },
      messages: [{ role: "user", content: `${context}\n\nQuestion: ${question}` }],
    });
    const toolUse = response.content.find((b) => b.type === "tool_use");
    const input = (toolUse && "input" in toolUse ? (toolUse.input as { answer?: string; citedDocumentIds?: string[]; confidence?: "grounded" | "uncertain" }) : undefined) ?? {};
    answer = input.answer ?? "I couldn't work out an answer to that.";
    citedDocumentIds = (input.citedDocumentIds ?? []).filter((id) => docs.some((d) => d.id === id));
    confidence = input.confidence ?? "uncertain";
  } catch (err) {
    console.error("[documents/askAll] failed:", err);
    return { ok: false, error: "Couldn't answer that right now. Try again shortly.", status: 502 };
  }

  const citedDocuments = docs.filter((d) => citedDocumentIds.includes(d.id)).map((d) => ({ id: d.id, name: d.name }));
  return { ok: true, result: { answer, citedDocuments, confidence } };
}
