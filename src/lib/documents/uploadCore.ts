import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ALLOWED_TYPES, DOCX_MIME_TYPE, MAX_SIZE_BYTES } from "./constants";

let cachedClient: Anthropic | null = null;
function anthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

interface AnalyzedDate {
  label: string;
  date: string;
  kind?: "deadline" | "event" | "other";
  description?: string;
}
interface AnalyzedTask {
  title: string;
  description?: string;
}
interface AnalyzedAmount {
  label: string;
  value: string;
  currency?: string;
}
interface AnalysisResult {
  suggestedName: string;
  documentType: string;
  summary: string;
  dates: AnalyzedDate[];
  tasks: AnalyzedTask[];
  people: string[];
  organizations: string[];
  amounts: AnalyzedAmount[];
  locations: string[];
  keyTopics: string[];
  detectedText: string;
  suggestedCategory: string;
}

const ANALYSIS_TOOL: Anthropic.Messages.Tool = {
  name: "record_document_analysis",
  description: "Record a structured analysis of an uploaded document. Only populate a field when the document genuinely contains that kind of information — leave arrays empty and strings blank rather than guessing.",
  input_schema: {
    type: "object",
    properties: {
      suggestedName: {
        type: "string",
        description:
          "A short, human-readable file name (no extension) derived from what the document actually is, e.g. 'Electricity Bill - March 2026', 'Rental Agreement - 123 Main St', 'Chemistry Lab Report - Titration'. Write it in English regardless of the document's own language, but keep real proper nouns (names, places, organizations) as written. Empty string only if the document is blank, unreadable, or gives you nothing to name it from — the upload will fall back to the original filename in that case.",
      },
      documentType: { type: "string", description: "A short label for what kind of document this is, e.g. 'School assignment', 'Invoice', 'Travel itinerary'. Empty string if unclear." },
      summary: { type: "string", description: "A concise summary, under 100 words, of what the document contains." },
      dates: {
        type: "array",
        description: "Deadlines, due dates, or other important dates explicitly stated in the document. Empty array if none — never guess a date.",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            date: { type: "string", description: "ISO date, yyyy-mm-dd." },
            kind: { type: "string", enum: ["deadline", "event", "other"] },
            description: { type: "string" },
          },
          required: ["label", "date"],
        },
      },
      tasks: {
        type: "array",
        description: "Concrete, actionable requirements or to-dos explicitly stated in the document (e.g. 'Submit the signed form', 'Pay the deposit'). Empty array if the document doesn't ask the reader to do anything.",
        items: {
          type: "object",
          properties: { title: { type: "string" }, description: { type: "string" } },
          required: ["title"],
        },
      },
      people: { type: "array", items: { type: "string" }, description: "Names of people mentioned, if any." },
      organizations: { type: "array", items: { type: "string" }, description: "Organizations/companies/institutions mentioned, if any." },
      amounts: {
        type: "array",
        description: "Monetary amounts explicitly stated, if any.",
        items: {
          type: "object",
          properties: { label: { type: "string", description: "What the amount is for." }, value: { type: "string" }, currency: { type: "string" } },
          required: ["label", "value"],
        },
      },
      locations: { type: "array", items: { type: "string" }, description: "Locations/addresses mentioned, if any." },
      keyTopics: { type: "array", items: { type: "string" }, description: "A few short keyword topics for this document, for search/categorization." },
      detectedText: { type: "string", description: "For an image/screenshot: the readable text you can actually see in it, transcribed as-is. Empty string if the image has no readable text or isn't legible." },
      suggestedCategory: { type: "string", description: "One suggested category if one clearly fits: School, Work, Personal, Finance, Travel, Legal, Receipts, Projects, Other. Empty string if nothing fits well." },
    },
    required: ["suggestedName", "documentType", "summary", "dates", "tasks", "people", "organizations", "amounts", "locations", "keyTopics", "detectedText", "suggestedCategory"],
  },
};

// Uses Claude's native document (PDF) / image content-block support to
// analyze the file directly for those two types — no OCR/PDF-parsing
// library needed there. DOCX is extracted to plain text via mammoth first
// (Claude's API has no native docx content-block type), and that same
// extracted text is what gets persisted for later search/Q&A, not thrown
// away after this one call.
async function analyzeDocument(mimeType: string, base64: string, fileName: string, extractedText: string | null): Promise<AnalysisResult> {
  const content: Anthropic.Messages.ContentBlockParam[] = [];
  if (mimeType === "application/pdf") {
    content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 }, cache_control: { type: "ephemeral" } });
  } else if (mimeType.startsWith("image/")) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: base64 },
      cache_control: { type: "ephemeral" },
    });
  } else {
    content.push({ type: "text", text: (extractedText ?? Buffer.from(base64, "base64").toString("utf-8")).slice(0, 20000) });
  }
  content.push({ type: "text", text: `Analyze this document ("${fileName}").` });

  const response = await anthropic().messages.create({
    model: process.env.ALXIOUM_MODEL || "claude-sonnet-4-5-20250929",
    max_tokens: 1200,
    system:
      "You are analyzing a document a user uploaded to their personal assistant. Be thorough but strictly grounded — only report what the document actually contains. Never invent dates, amounts, or requirements that aren't explicitly present. The document may be written in any language or script (including non-Latin scripts and mixed-language documents) and may be handwritten — read and understand it accurately regardless of language before analyzing it. Write every field in English for consistency in the app, except real proper nouns (people, places, organizations, titles) which should stay as written in the source.",
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: "tool", name: "record_document_analysis" },
    messages: [{ role: "user", content }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  const input = (toolUse && "input" in toolUse ? (toolUse.input as Partial<AnalysisResult>) : undefined) ?? {};
  return {
    suggestedName: input.suggestedName ?? "",
    documentType: input.documentType ?? "",
    summary: input.summary ?? "",
    dates: input.dates ?? [],
    tasks: input.tasks ?? [],
    people: input.people ?? [],
    organizations: input.organizations ?? [],
    amounts: input.amounts ?? [],
    locations: input.locations ?? [],
    keyTopics: input.keyTopics ?? [],
    detectedText: input.detectedText ?? "",
    suggestedCategory: input.suggestedCategory ?? "",
  };
}

// A client can lie about a file's Content-Type; check the bytes it actually
// sent for the binary types instead of trusting file.type blindly. No
// reliable magic-byte signature exists for text/plain or text/markdown, so
// those aren't checked here.
const MAGIC_BYTE_CHECKS: Partial<Record<string, (buf: Buffer) => boolean>> = {
  "application/pdf": (buf) => buf.subarray(0, 5).toString("latin1") === "%PDF-",
  "image/jpeg": (buf) => buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  "image/png": (buf) => buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (buf) => buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP",
  "image/gif": (buf) => buf.subarray(0, 4).toString("latin1") === "GIF8",
  // DOCX is a zip container — this confirms it's at least a valid zip, not
  // specifically a docx, which is the practical limit of a magic-byte check.
  [DOCX_MIME_TYPE]: (buf) => buf.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
};

function matchesClaimedType(buffer: Buffer, mimeType: string): boolean {
  const check = MAGIC_BYTE_CHECKS[mimeType];
  return check ? check(buffer) : true;
}

export type UploadCoreOutcome =
  | {
      ok: true;
      document: Record<string, unknown>;
      dates: Record<string, unknown>[];
      tasks: Record<string, unknown>[];
    }
  | { ok: false; error: string; status: number };

/**
 * The full upload -> Storage -> AI analysis -> persistence pipeline,
 * shared by /api/documents/upload (Documents tab) and /api/chat/attach
 * (chat's "attach a document" action) so there's one real pipeline
 * instead of two — chat attachments become genuine Documents rows, not an
 * ephemeral chat-only preview.
 */
export async function analyzeAndStoreDocument(supabase: SupabaseClient, userId: string, file: File): Promise<UploadCoreOutcome> {
  if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, error: "This file type isn't supported yet — try a PDF, DOCX, image, or plain text file.", status: 400 };
  }
  if (file.size > MAX_SIZE_BYTES) return { ok: false, error: "The document is too large to process (15MB max).", status: 400 };

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesClaimedType(buffer, file.type)) {
    return { ok: false, error: "That file doesn't look like the type it claims to be — try re-exporting or re-saving it.", status: 400 };
  }
  const base64 = buffer.toString("base64");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "upload";
  const storagePath = `${userId}/${crypto.randomUUID()}-${safeName}`;

  let docxText: string | null = null;
  if (file.type === DOCX_MIME_TYPE) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      docxText = result.value.trim();
    } catch (err) {
      console.error("[uploadCore] docx extraction failed:", err);
    }
  }

  const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, buffer, { contentType: file.type });
  if (uploadError) return { ok: false, error: "Couldn't store that file. Try again shortly.", status: 500 };

  const { data: docRow, error: insertError } = await supabase
    .from("documents")
    .insert({ user_id: userId, name: file.name, storage_path: storagePath, mime_type: file.type, size_bytes: file.size, processing_status: "analyzing" })
    .select("*")
    .single();
  if (insertError) {
    await supabase.storage.from("documents").remove([storagePath]);
    return { ok: false, error: "Couldn't save that document. Try again shortly.", status: 500 };
  }

  let analysis: AnalysisResult | null = null;
  let processingStatus: "ready" | "error" = "ready";
  let processingError: string | null = null;

  try {
    analysis = await analyzeDocument(file.type, base64, file.name, docxText);
  } catch (err) {
    console.error("[uploadCore] analysis failed:", err);
    processingStatus = "error";
    processingError = "We couldn't read this document. You can try uploading it again.";
  }

  const extractedText = docxText || (file.type === "text/plain" || file.type === "text/markdown" ? Buffer.from(base64, "base64").toString("utf-8").slice(0, 20000) : analysis?.detectedText || null);
  const finalName = analysis?.suggestedName?.trim().slice(0, 150) || file.name;

  const { error: updateError } = await supabase
    .from("documents")
    .update({
      name: finalName,
      processing_status: processingStatus,
      processing_error: processingError,
      summary: analysis?.summary ?? "",
      document_type: analysis?.documentType || null,
      extracted_text: extractedText,
      people: analysis?.people ?? [],
      organizations: analysis?.organizations ?? [],
      amounts: analysis?.amounts ?? [],
      locations: analysis?.locations ?? [],
      key_topics: analysis?.keyTopics ?? [],
      suggested_category: analysis?.suggestedCategory || null,
    })
    .eq("id", docRow.id);
  if (updateError) console.error("[uploadCore] failed to persist analysis:", updateError);

  let dateRows: { id: string; label: string; date: string; kind: string; description: string }[] = [];
  let taskRows: { id: string; title: string; description: string }[] = [];
  if (analysis?.dates.length) {
    const { data } = await supabase
      .from("document_dates")
      .insert(analysis.dates.map((d) => ({ user_id: userId, document_id: docRow.id, label: d.label, date: d.date, kind: d.kind ?? "other", description: d.description ?? "" })))
      .select("*");
    dateRows = data ?? [];
  }
  if (analysis?.tasks.length) {
    const { data } = await supabase
      .from("document_tasks")
      .insert(analysis.tasks.map((t) => ({ user_id: userId, document_id: docRow.id, title: t.title, description: t.description ?? "" })))
      .select("*");
    taskRows = data ?? [];
  }

  await supabase.from("document_activity").insert({ user_id: userId, document_id: docRow.id, kind: "uploaded", description: `Uploaded "${file.name}"` });
  if (processingStatus === "ready") {
    await supabase.from("document_activity").insert({ user_id: userId, document_id: docRow.id, kind: "analyzed", description: "AI analysis completed" });
  }

  return {
    ok: true,
    document: {
      id: docRow.id,
      name: finalName,
      storagePath: docRow.storage_path,
      mimeType: docRow.mime_type,
      sizeBytes: docRow.size_bytes,
      summary: analysis?.summary ?? "",
      createdAt: docRow.created_at,
      tags: [],
      starred: false,
      processingStatus,
      processingError: processingError ?? undefined,
      extractedText: extractedText ?? undefined,
      documentType: analysis?.documentType || undefined,
      people: analysis?.people ?? [],
      organizations: analysis?.organizations ?? [],
      amounts: analysis?.amounts ?? [],
      locations: analysis?.locations ?? [],
      keyTopics: analysis?.keyTopics ?? [],
      suggestedCategory: analysis?.suggestedCategory || undefined,
    },
    dates: dateRows.map((d) => ({ id: d.id, documentId: docRow.id, label: d.label, date: d.date, kind: d.kind, description: d.description, createdAt: docRow.created_at })),
    tasks: taskRows.map((t) => ({ id: t.id, documentId: docRow.id, title: t.title, description: t.description, createdAt: docRow.created_at })),
  };
}
