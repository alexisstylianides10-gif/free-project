"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, Plus, Send, Trash2, Loader2, AlertCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MessageBubble } from "@/components/ai/MessageBubble";
import { useAlxioum } from "@/lib/store";
import * as db from "@/lib/db";
import { ChatMessage, Conversation } from "@/lib/types";
import { confirmPendingAction, sendChatMessage } from "@/lib/ai/chatClient";
import { useVoiceInput } from "@/lib/useVoiceInput";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const authUserId = useAlxioum((s) => s.authUserId);
  const getAccessToken = useAlxioum((s) => s.getAccessToken);
  const refreshAll = useAlxioum((s) => s.refreshAll);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convOpen, setConvOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { supported: voiceSupported, listening, toggle: toggleVoice } = useVoiceInput((text) => setInput((v) => (v ? `${v} ${text}` : text)));

  useEffect(() => {
    if (!authUserId) return;
    (async () => {
      const list = await db.fetchConversations(authUserId);
      if (list.length === 0) {
        const created = await db.createConversation(authUserId);
        setConversations([created]);
        setActiveId(created.id);
      } else {
        setConversations(list);
        setActiveId(list[0].id);
      }
    })();
  }, [authUserId]);

  useEffect(() => {
    if (!activeId) return;
    setLoadingMessages(true);
    db.fetchMessages(activeId)
      .then(setMessages)
      .finally(() => setLoadingMessages(false));
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function newConversation() {
    if (!authUserId) return;
    const created = await db.createConversation(authUserId);
    setConversations((c) => [created, ...c]);
    setActiveId(created.id);
    setConvOpen(false);
  }

  async function deleteConversation(id: string) {
    if (!confirm("Delete this conversation?")) return;
    await db.deleteConversation(id);
    setConversations((c) => c.filter((x) => x.id !== id));
    if (activeId === id) {
      const remaining = conversations.filter((x) => x.id !== id);
      if (remaining.length > 0) setActiveId(remaining[0].id);
      else newConversation();
    }
  }

  async function send(text?: string) {
    const messageText = (text ?? input).trim();
    if (!messageText || !activeId || sending) return;
    setInput("");
    setError(null);
    setSending(true);

    const optimisticId = `optimistic_${Date.now()}`;
    setMessages((m) => [
      ...m,
      { id: optimisticId, conversationId: activeId, role: "user", content: messageText, toolCalls: [], pendingAction: null, resolvedAction: null, createdAt: new Date().toISOString() },
    ]);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const { userMessage, assistantMessage } = await sendChatMessage(token, activeId, messageText);
      setMessages((m) => [...m.filter((x) => x.id !== optimisticId), userMessage, assistantMessage]);
      setConversations((c) => {
        const rest = c.filter((x) => x.id !== activeId);
        const active = c.find((x) => x.id === activeId);
        return active ? [{ ...active, updatedAt: new Date().toISOString() }, ...rest] : c;
      });
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== optimisticId));
      setInput(messageText);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

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

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] gap-4 md:h-[calc(100dvh-2rem)]">
      <aside className="hidden w-56 shrink-0 flex-col gap-1 md:flex">
        <Button size="sm" variant="outline" className="mb-2 w-full justify-start" onClick={newConversation}>
          <Plus className="h-3.5 w-3.5" /> New chat
        </Button>
        <div className="flex-1 space-y-0.5 overflow-y-auto">
          {conversations.map((c) => (
            <div key={c.id} className="group relative">
              <button
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "w-full truncate rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors",
                  c.id === activeId ? "bg-accent-soft text-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {c.title}
              </button>
              <button
                onClick={() => deleteConversation(c.id)}
                className="absolute right-1.5 top-1.5 hidden rounded p-1 text-muted-foreground hover:bg-muted group-hover:block"
                aria-label="Delete conversation"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5 md:hidden">
          <button onClick={() => setConvOpen((v) => !v)} className="truncate text-[13.5px] font-semibold text-foreground">
            {conversations.find((c) => c.id === activeId)?.title ?? "Chat"}
          </button>
          <button onClick={newConversation} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="New chat">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <AnimatePresence>
          {convOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-b border-border md:hidden">
              <div className="max-h-48 overflow-y-auto p-2">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveId(c.id);
                      setConvOpen(false);
                    }}
                    className={cn("block w-full truncate rounded-lg px-2.5 py-2 text-left text-[13px]", c.id === activeId ? "bg-accent-soft text-accent" : "text-foreground hover:bg-muted")}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {loadingMessages ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <EmptyState icon={MessageCircle} title="Tell Alxioum what you need." body={'Try "What’s on my calendar tomorrow?" or "Remind me to call the dentist."'} />
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m} onDecide={handleDecide} />)
          )}
          {sending && (
            <div className="flex items-center gap-2 pl-9 text-[13px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          )}
        </div>

        {error && (
          <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[12.5px] text-danger">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
            </span>
            <button onClick={() => send(input)} className="shrink-0 font-semibold underline underline-offset-2">
              Retry
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2 border-t border-border p-3"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Tell Alxioum what you need…"
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              aria-label="Voice input"
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                listening ? "bg-danger text-white" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Mic className="h-4 w-4" />
            </button>
          )}
          <Button type="submit" size="icon" disabled={!input.trim() || sending} aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
