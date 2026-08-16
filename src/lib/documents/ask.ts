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
  description: "Record the answer to a question about a document, grounded strictly in what the document actually contains.",
  input_schema: {
    type: "object",
    properties: {
      answer: { type: "string", description: "The answer, written for the user. If the document doesn't contain the information needed to answer, say so plainly instead of guessing." },
      sourcePage: { type: "integer", description: "The PDF page number this answer is drawn from, ONLY if you're confident and the document is a PDF. Omit entirely otherwise — never guess a page number." },
      confidence: { type: "string", enum: ["grounded", "uncertain"], description: "'grounded' if the answer is directly supported by explicit content in the document; 'uncertain' if you're inferring, unsure, or the document doesn't clearly cover it." },
    },
    required: ["answer", "confidence"],
  },
};

export interface AskDocumentResult {
  answer: string;
  sourcePage?: number;
  confidence: "grounded" | "uncertain";
}

export type AskDocumentOutcome = { ok: true; result: AskDocumentResult } | { ok: false; error: string; status: number };

/**
 * Grounds an answer in exactly one document — native PDF/image content
 * block (cached) or the persisted extracted_text — and persists both
 * turns to document_chat_messages plus a document_activity row. Shared by
 * /api/documents/[id]/ask (the detail page's UI) and the documents_ask
 * Head Agent tool, so there is one implementation of the core Q&A logic.
 */
export async function askDocument(supabase: SupabaseClient, userId: string, documentId: string, question: string): Promise<AskDocumentOutcome> {
  const { data: docRow, error: docError } = await supabase
    .from("documents")
    .select("id,name,mime_type,storage_path,extracted_text,processing_status")
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (docError) return { ok: false, error: "Couldn't load that document.", status: 500 };
  if (!docRow) return { ok: false, error: "I couldn't find that document.", status: 404 };

  const isPdf = docRow.mime_type === "application/pdf";
  const isImage = (docRow.mime_type as string).startsWith("image/");

  const documentBlock: Anthropic.Messages.ContentBlockParam[] = [];
  if (isPdf || isImage) {
    const { data: fileBlob, error: downloadError } = await supabase.storage.from("documents").download(docRow.storage_path);
    if (downloadError || !fileBlob) return { ok: false, error: "Couldn't open that document right now.", status: 500 };
    const base64 = Buffer.from(await fileBlob.arrayBuffer()).toString("base64");
    if (isPdf) {
      documentBlock.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 }, cache_control: { type: "ephemeral" } });
    } else {
      documentBlock.push({
        type: "image",
        source: { type: "base64", media_type: docRow.mime_type as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: base64 },
        cache_control: { type: "ephemeral" },
      });
    }
  } else if (docRow.extracted_text) {
    documentBlock.push({ type: "text", text: (docRow.extracted_text as string).slice(0, 20000), cache_control: { type: "ephemeral" } });
  } else {
    return { ok: false, error: "Alxioum couldn't read this document, so it can't answer questions about it yet.", status: 422 };
  }

  const { data: historyRows } = await supabase
    .from("document_chat_messages")
    .select("role,content")
    .eq("document_id", documentId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(10);
  const history = (historyRows ?? []) as { role: "user" | "assistant"; content: string }[];

  const messages: Anthropic.Messages.MessageParam[] = [
    ...history.map((h) => ({ role: h.role, content: [{ type: "text" as const, text: h.content }] })),
    { role: "user", content: [...documentBlock, { type: "text", text: question }] },
  ];

  let answer: string;
  let sourcePage: number | undefined;
  let confidence: "grounded" | "uncertain";
  try {
    const response = await anthropic().messages.create({
      model: process.env.ALXIOUM_MODEL || "claude-sonnet-4-5-20250929",
      max_tokens: 800,
      system: `You are answering questions about one specific document ("${docRow.name}") on behalf of the user. Answer strictly from what the document actually contains — never invent facts, dates, or figures. If the document doesn't cover something, say so plainly rather than guessing. Only cite a page number when you're confident and the document is a PDF; leave it out otherwise.`,
      tools: [ANSWER_TOOL],
      tool_choice: { type: "tool", name: "record_answer" },
      messages,
    });
    const toolUse = response.content.find((b) => b.type === "tool_use");
    const input = (toolUse && "input" in toolUse ? (toolUse.input as { answer?: string; sourcePage?: number; confidence?: "grounded" | "uncertain" }) : undefined) ?? {};
    answer = input.answer ?? "I couldn't work out an answer to that.";
    sourcePage = input.sourcePage;
    confidence = input.confidence ?? "uncertain";
  } catch (err) {
    console.error("[documents/ask] failed:", err);
    return { ok: false, error: "Couldn't answer that right now. Try again shortly.", status: 502 };
  }

  await supabase.from("document_chat_messages").insert([
    { user_id: userId, document_id: documentId, role: "user", content: question },
    { user_id: userId, document_id: documentId, role: "assistant", content: answer, source_page: sourcePage ?? null },
  ]);
  await supabase.from("document_activity").insert({ user_id: userId, document_id: documentId, kind: "question_asked", description: `Asked: "${question}"` });

  return { ok: true, result: { answer, sourcePage, confidence } };
}
