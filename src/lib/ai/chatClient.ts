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

export async function sendChatMessage(token: string, conversationId: string, message: string): Promise<SendMessageResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ conversationId, message }),
  });
  const body = await res.json();
  if (!res.ok) throw Object.assign(new Error((body as ApiError).error ?? "Something went wrong."), { code: (body as ApiError).code });
  return body as SendMessageResponse;
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
