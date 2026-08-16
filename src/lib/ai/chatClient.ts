"use client";

import { ChatMessage } from "@/lib/types";

export interface SendMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

export interface ApiError {
  error: string;
  code?: string;
}

type StreamEvent =
  | { type: "status"; label: string }
  | ({ type: "done" } & SendMessageResponse)
  | { type: "error"; error: string };

/**
 * Reads /api/chat's newline-delimited JSON stream — zero or more "status"
 * events (onStatus) followed by exactly one "done" (resolves) or "error"
 * (throws). If the response isn't a stream at all (a validation error
 * returned before streaming started), falls back to reading it as plain JSON
 * so callers only ever have to handle one shape of failure.
 */
export async function sendChatMessage(
  token: string,
  conversationId: string,
  message: string,
  image?: { base64: string; mediaType: string },
  onStatus?: (label: string) => void
): Promise<SendMessageResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ conversationId, message, image }),
  });

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}) as ApiError);
    throw Object.assign(new Error((body as ApiError).error ?? "Something went wrong."), { code: (body as ApiError).code });
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line) continue;
      const event = JSON.parse(line) as StreamEvent;
      if (event.type === "status") onStatus?.(event.label);
      else if (event.type === "done") return { userMessage: event.userMessage, assistantMessage: event.assistantMessage };
      else if (event.type === "error") throw new Error(event.error);
    }
  }

  throw new Error("Something went wrong.");
}

export async function confirmPendingAction(token: string, pendingActionId: string, decision: "confirm" | "cancel") {
  const res = await fetch("/api/chat/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pendingActionId, decision }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error((body as ApiError).error ?? "Couldn't complete that.");
  return body as { resolvedAction: NonNullable<ChatMessage["resolvedAction"]>; ok?: boolean };
}

export async function undoResolvedAction(token: string, messageId: string) {
  const res = await fetch("/api/chat/undo", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messageId }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error((body as ApiError).error ?? "Couldn't undo that.");
  return body as { resolvedAction: NonNullable<ChatMessage["resolvedAction"]> };
}
