"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { authedPost, ApiError } from "@/lib/apiClient";
import { useAlxioum } from "@/lib/store";

interface PendingAction {
  tool: string;
  params: unknown;
  preview: string;
}

interface ResolvedAction extends PendingAction {
  decision: "confirmed" | "cancelled" | "failed";
}

interface Msg {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  pending_action: PendingAction | null;
  resolved_action: ResolvedAction | null;
  created_at: string;
}

const SUGGESTIONS = [
  "Add tennis Friday at 6.",
  "What do I have this week?",
  "Move my dentist appointment to 4pm.",
];

export default function ChatPage() {
  const profile = useAlxioum((s) => s.profile);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      setInput(q);
      window.history.replaceState(null, "", "/app");
    }
  }, []);

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: convo } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (convo) {
        const { data: rows } = await supabase
          .from("messages")
          .select("id, role, content, pending_action, resolved_action, created_at")
          .eq("conversation_id", convo.id)
          .order("created_at", { ascending: true });
        setMessages((rows as Msg[]) ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, sending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError(null);
    setInput("");

    const optimistic: Msg = {
      id: `local-${Date.now()}`,
      role: "user",
      content: trimmed,
      pending_action: null,
      resolved_action: null,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setSending(true);

    try {
      const res = await authedPost<{
        messageId: string;
        reply: string;
        pendingAction: PendingAction | null;
        createdAt: string;
      }>("/api/chat", { message: trimmed });

      setMessages((m) => [
        ...m,
        {
          id: res.messageId,
          role: "assistant",
          content: res.reply,
          pending_action: res.pendingAction,
          resolved_action: null,
          created_at: res.createdAt,
        },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function resolve(messageId: string, decision: "confirm" | "cancel") {
    setResolvingId(messageId);
    setError(null);
    try {
      const res = await authedPost<{ messageId: string; reply: string; createdAt: string }>(
        "/api/tools/resolve",
        { messageId, decision }
      );
      setMessages((m) => [
        ...m.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                pending_action: null,
                resolved_action: msg.pending_action
                  ? { ...msg.pending_action, decision: decision === "confirm" ? "confirmed" : "cancelled" }
                  : null,
              }
            : msg
        ),
        {
          id: res.messageId,
          role: "assistant",
          content: res.reply,
          pending_action: null,
          resolved_action: null,
          created_at: res.createdAt,
        },
      ] as Msg[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setResolvingId(null);
    }
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-2xl flex-col md:h-[calc(100dvh-6rem)]">
      <div className="mb-1">
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          Hi {profile.name?.split(" ")[0] || "there"}.
        </h1>
        <p className="text-[13.5px] text-muted-foreground">Tell Alxioum what you need — it'll act on it.</p>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <p className="max-w-xs text-[13.5px] text-muted-foreground">
              Try one of these, or type your own request.
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-border px-3.5 py-2 text-[13px] text-foreground transition-colors hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <ChatBubble key={m.id} msg={m} onResolve={resolve} resolving={resolvingId === m.id} />
            ))}
            {sending && (
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-surface px-3.5 py-3 w-fit">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mb-2 text-[12.5px] text-danger">{error}</p>}

      <form onSubmit={submitForm} className="flex items-center gap-2 border-t border-border pt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tell Alxioum what you need..."
          className="h-11 flex-1 rounded-lg border border-border bg-surface px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <Button type="submit" size="icon" disabled={!input.trim() || sending} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function ChatBubble({
  msg,
  onResolve,
  resolving,
}: {
  msg: Msg;
  onResolve: (id: string, decision: "confirm" | "cancel") => void;
  resolving: boolean;
}) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={isUser ? "ml-auto max-w-[85%]" : "mr-auto max-w-[90%]"}
    >
      <div
        className={
          isUser
            ? "rounded-2xl rounded-tr-sm bg-accent px-3.5 py-2.5 text-[14px] text-accent-foreground"
            : "rounded-2xl rounded-tl-sm border border-border bg-surface px-3.5 py-2.5 text-[14px] text-foreground"
        }
      >
        {msg.content}
      </div>

      <AnimatePresence>
        {msg.pending_action && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 rounded-xl border border-accent/25 bg-accent-soft/40 px-3.5 py-3"
          >
            <p className="text-[13px] font-medium text-foreground">{msg.pending_action.preview}</p>
            <div className="mt-2.5 flex gap-2">
              <Button size="sm" disabled={resolving} onClick={() => onResolve(msg.id, "confirm")} className="gap-1.5">
                <Check className="h-3.5 w-3.5" /> Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={resolving}
                onClick={() => onResolve(msg.id, "cancel")}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {msg.resolved_action?.decision === "cancelled" && (
        <p className="mt-1 text-[11.5px] text-muted-foreground">Cancelled</p>
      )}
    </motion.div>
  );
}
