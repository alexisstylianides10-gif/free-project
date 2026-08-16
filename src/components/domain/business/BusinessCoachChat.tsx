"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { MessageBubble } from "@/components/ai/MessageBubble";
import { Button } from "@/components/ui/Button";
import { useAlxioum } from "@/lib/store";
import * as db from "@/lib/db";
import { ChatMessage } from "@/lib/types";
import { confirmPendingAction, sendChatMessage, undoResolvedAction } from "@/lib/ai/chatClient";

const COACH_PROMPTS = ["What should I do next?", "Why aren't people buying?", "How should I price this?", "Give me 5 marketing ideas."];

export interface BusinessCoachChatHandle {
  send: (text: string) => void;
}

export const BusinessCoachChat = forwardRef<BusinessCoachChatHandle, { businessId: string; businessName: string }>(function BusinessCoachChat({ businessId, businessName }, ref) {
  const authUserId = useAlxioum((s) => s.authUserId);
  const getAccessToken = useAlxioum((s) => s.getAccessToken);
  const refreshAll = useAlxioum((s) => s.refreshAll);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const conversation = await db.getOrCreateBusinessConversation(authUserId, businessId, businessName);
        if (cancelled) return;
        setConversationId(conversation.id);
        const msgs = await db.fetchMessages(conversation.id);
        if (cancelled) return;
        setMessages(msgs);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load the Business Coach chat.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, businessId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = useCallback(
    async (text?: string) => {
      const messageText = (text ?? input).trim();
      if (!messageText || !conversationId || sending) return;
      setInput("");
      setError(null);
      setSending(true);
      setStatus("Thinking…");

      const optimisticId = `optimistic_${Date.now()}`;
      setMessages((m) => [
        ...m,
        { id: optimisticId, conversationId, role: "user", content: messageText, toolCalls: [], pendingAction: null, resolvedAction: null, createdAt: new Date().toISOString() },
      ]);

      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Your session expired. Please sign in again.");
        const { userMessage, assistantMessage } = await sendChatMessage(token, conversationId, messageText, undefined, setStatus);
        setMessages((m) => [...m.filter((x) => x.id !== optimisticId), userMessage, assistantMessage]);
        refreshAll();
      } catch (err) {
        setMessages((m) => m.filter((x) => x.id !== optimisticId));
        setInput(messageText);
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setSending(false);
        setStatus(null);
      }
    },
    [input, conversationId, sending, getAccessToken, refreshAll]
  );

  useImperativeHandle(ref, () => ({ send }), [send]);

  async function handleDecide(messageId: string, pendingActionId: string, decision: "confirm" | "cancel") {
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired.");
      const { resolvedAction } = await confirmPendingAction(token, pendingActionId, decision);
      setMessages((m) => m.map((msg) => (msg.id === messageId ? { ...msg, resolvedAction } : msg)));
      if (decision === "confirm") refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't complete that action.");
    }
  }

  async function handleUndo(messageId: string) {
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired.");
      const { resolvedAction } = await undoResolvedAction(token, messageId);
      setMessages((m) => m.map((msg) => (msg.id === messageId ? { ...msg, resolvedAction } : msg)));
      refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't undo that.");
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div ref={scrollRef} className="max-h-[420px] min-h-[160px] space-y-4 overflow-y-auto rounded-lg border border-border/70 bg-background p-3.5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-6 text-center">
            <Sparkles className="h-5 w-5 text-accent" />
            <p className="text-[12.5px] text-muted-foreground">Ask your AI co-founder anything about {businessName}.</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {COACH_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="rounded-full border border-border/70 px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} onDecide={handleDecide} onUndo={handleUndo} onChoiceSelect={(v) => send(v)} />)
        )}
        {sending && status && <p className="text-[12px] text-muted-foreground">{status}</p>}
      </div>

      {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-2.5 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your Business Coach…"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <Button type="submit" size="icon" disabled={!input.trim() || sending} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
});
