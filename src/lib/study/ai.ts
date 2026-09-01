import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.FUTUREOS_MODEL || "claude-opus-5";

let cachedClient: Anthropic | null = null;

/** Shared Anthropic client for every Study API route — same credential/model
 * convention as the AI Coach (src/app/api/coach/route.ts), so the two
 * subsystems don't drift onto different models or client configs. */
export function studyAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured on the server.");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

export class StudyAIError extends Error {}

/** Strips a ```json ... ``` fence (or any ``` fence) if present, then parses
 * the first balanced {...} or [...] value in the text. Every Study AI route
 * asks Claude for "ONLY valid JSON, no prose, no markdown fences" in its
 * prompt, but models occasionally wrap the answer in a fence anyway — this
 * makes parsing robust to that instead of failing the whole request. */
export function extractJSON<T>(text: string): T {
  let candidate = text.trim();
  const fenceMatch = candidate.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) candidate = fenceMatch[1].trim();

  const firstBrace = candidate.search(/[{[]/);
  if (firstBrace === -1) throw new StudyAIError("No JSON object found in the AI response.");

  const openChar = candidate[firstBrace];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let endIndex = -1;
  for (let i = firstBrace; i < candidate.length; i++) {
    if (candidate[i] === openChar) depth++;
    else if (candidate[i] === closeChar) {
      depth--;
      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
  }
  if (endIndex === -1) throw new StudyAIError("Unbalanced JSON in the AI response.");

  const jsonSlice = candidate.slice(firstBrace, endIndex + 1);
  try {
    return JSON.parse(jsonSlice) as T;
  } catch {
    throw new StudyAIError("Couldn't parse the AI response as JSON.");
  }
}

export interface DocumentInput {
  /** application/pdf or an image/* MIME type. */
  mediaType: string;
  base64: string;
}

/**
 * Calls Claude with a system + user prompt (optionally attaching a PDF or
 * image document) and parses the reply as JSON. This is the one path every
 * Study API route should call through — it keeps the model, JSON-only
 * instruction, and parsing/error behavior identical across analyze/plan/
 * quiz/flashcard/grade endpoints instead of each route reinventing it.
 */
export async function callStudyAIForJSON<T>(params: {
  system: string;
  userText: string;
  document?: DocumentInput;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}): Promise<T> {
  const content: Anthropic.Messages.ContentBlockParam[] = [];
  if (params.document) {
    if (params.document.mediaType === "application/pdf") {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: params.document.base64 },
      });
    } else {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: params.document.mediaType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
          data: params.document.base64,
        },
      });
    }
  }
  content.push({ type: "text", text: params.userText });

  const response = await studyAnthropicClient().messages.create({
    model: MODEL,
    max_tokens: params.maxTokens ?? 4096,
    system: `${params.system}\n\nRespond with ONLY valid JSON. No prose before or after it, no markdown code fences.`,
    messages: [{ role: "user", content }],
    output_config: { effort: params.effort ?? "medium" },
  });

  const textBlock = response.content.find((b): b is Anthropic.Messages.TextBlock => b.type === "text");
  if (!textBlock) throw new StudyAIError("The AI didn't return a text response.");
  return extractJSON<T>(textBlock.text);
}

/** Plain-text Claude call (no JSON parsing) — for the AI tutor chat, where
 * the reply is meant to be read as-is, not parsed. */
export async function callStudyAIForText(params: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}): Promise<string> {
  const response = await studyAnthropicClient().messages.create({
    model: MODEL,
    max_tokens: params.maxTokens ?? 1024,
    system: params.system,
    messages: params.messages,
    output_config: { effort: params.effort ?? "low" },
  });
  const textBlock = response.content.find((b): b is Anthropic.Messages.TextBlock => b.type === "text");
  return textBlock?.text ?? "Sorry, I couldn't put that into words just now. Try asking again.";
}
