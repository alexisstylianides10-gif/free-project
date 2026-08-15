import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/ai/rateLimit";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif", "text/plain", "text/markdown"];
const MAX_SIZE_BYTES = 15 * 1024 * 1024;

let cachedClient: Anthropic | null = null;
function anthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

interface ExtractedDate {
  label: string;
  date: string;
}

const ANALYSIS_TOOL: Anthropic.Messages.Tool = {
  name: "record_analysis",
  description: "Record a structured summary of an uploaded document.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "A concise summary, under 100 words, of what the document contains." },
      extractedDates: {
        type: "array",
        items: {
          type: "object",
          properties: { label: { type: "string" }, date: { type: "string", description: "ISO date, yyyy-mm-dd." } },
          required: ["label", "date"],
        },
        description: "Deadlines, due dates, or other important dates explicitly stated in the document. Empty array if none — never guess a date.",
      },
    },
    required: ["summary", "extractedDates"],
  },
};

// Uses Claude's native document (PDF) / image content-block support to
// analyze the file directly — no OCR or PDF-parsing library needed. This is
// a one-off call outside the Head Agent's tool loop (the ClaudeProvider
// abstraction doesn't model document blocks), so it talks to the Anthropic
// SDK directly, same as the Study section's research-school route does.
async function analyzeDocument(mimeType: string, base64: string, fileName: string): Promise<{ summary: string; extractedDates: ExtractedDate[] }> {
  const content: Anthropic.Messages.ContentBlockParam[] = [];
  if (mimeType === "application/pdf") {
    content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } });
  } else if (mimeType.startsWith("image/")) {
    content.push({ type: "image", source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: base64 } });
  } else {
    content.push({ type: "text", text: Buffer.from(base64, "base64").toString("utf-8").slice(0, 20000) });
  }
  content.push({
    type: "text",
    text: `Summarize this document ("${fileName}") and extract any deadlines or important dates it mentions.`,
  });

  const response = await anthropic().messages.create({
    model: process.env.ALXIOUM_MODEL || "claude-sonnet-4-5-20250929",
    max_tokens: 500,
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: "tool", name: "record_analysis" },
    messages: [{ role: "user", content }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  const input = (toolUse && "input" in toolUse ? (toolUse.input as { summary?: string; extractedDates?: ExtractedDate[] }) : undefined) ?? {};
  return { summary: input.summary ?? "", extractedDates: input.extractedDates ?? [] };
}

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: "Give it a moment before uploading again." }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Unsupported file type — PDF, image, or plain text only." }, { status: 400 });
  if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: "That file is too large (15MB max)." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "upload";
  const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await client.storage.from("documents").upload(storagePath, buffer, { contentType: file.type });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: docRow, error: insertError } = await client
    .from("documents")
    .insert({ user_id: user.id, name: file.name, storage_path: storagePath, mime_type: file.type, size_bytes: file.size })
    .select("*")
    .single();
  if (insertError) {
    await client.storage.from("documents").remove([storagePath]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  let analysisError = false;
  let summary = "";
  let extractedDates: ExtractedDate[] = [];
  try {
    const analyzed = await analyzeDocument(file.type, base64, file.name);
    summary = analyzed.summary;
    extractedDates = analyzed.extractedDates;
    await client.from("documents").update({ summary, extracted_dates: extractedDates }).eq("id", docRow.id);
  } catch (err) {
    console.error("[documents/upload] analysis failed:", err);
    analysisError = true;
  }

  return NextResponse.json({
    document: {
      id: docRow.id,
      name: docRow.name,
      storagePath: docRow.storage_path,
      mimeType: docRow.mime_type,
      sizeBytes: docRow.size_bytes,
      summary,
      extractedDates,
      createdAt: docRow.created_at,
    },
    analysisError,
  });
}
