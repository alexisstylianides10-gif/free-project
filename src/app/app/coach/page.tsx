"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Loader2, Sparkles, Plus, MessagesSquare, Check } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useChatHistory, useChatThreads, useHomework, useExams, useCareerPaths } from "@/lib/hooks/domain";
import { getCareer } from "@/lib/catalog/careers";
import { buildRecommendationChips } from "@/lib/recommendation";
import { authedFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  "What career fits me?",
  "How do I improve my grades?",
  "Help me choose a business idea.",
  "What should I learn this month?",
  "Help me plan my week.",
  "What should I do today?",
];

interface LocalMessage {
  role: "user" | "assistant";
  content: string;
}

function relativeDay(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CoachPage() {
  const { user, profile } = useAuth();
  const { data: threads, refetch: refetchThreads } = useChatThreads(user?.id);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadPanelOpen, setThreadPanelOpen] = useState(false);
  const [creatingThread, setCreatingThread] = useState(false);

  const { data: history, loading: historyLoading } = useChatHistory(user?.id, activeThreadId ?? undefined);
  const { data: homework } = useHomework(user?.id);
  const { data: exams } = useExams(user?.id);
  const { data: careerPaths } = useCareerPaths(user?.id);

  const primaryCareer = useMemo(() => {
    const primary = careerPaths.find((c) => c.is_primary) ?? careerPaths[0];
    return primary ? getCareer(primary.career_slug) : undefined;
  }, [careerPaths]);

  const chips = useMemo(
    () => buildRecommendationChips({ exams, homework: homework.filter((h) => h.status === "pending"), primaryCareer }),
    [exams, homework, primaryCareer]
  );

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pick the most recent thread once loaded, or create the founding one.
  useEffect(() => {
    if (activeThreadId || !user || !supabase) return;
    if (threads.length > 0) {
      setActiveThreadId(threads[0].id);
    } else {
      supabase
        .from("chat_threads")
        .insert({ user_id: user.id })
        .select("id")
        .single()
        .then(({ data }) => {
          if (data) {
            setActiveThreadId(data.id);
            refetchThreads();
          }
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads, user, activeThreadId]);

  useEffect(() => {
    if (!historyLoading) setMessages(history.map((h) => ({ role: h.role, content: h.content })));
  }, [historyLoading, history]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function newChat() {
    if (!supabase || !user || creatingThread) return;
    setCreatingThread(true);
    try {
      const { data } = await supabase.from("chat_threads").insert({ user_id: user.id }).select("id").single();
      if (data) {
        setActiveThreadId(data.id);
        setMessages([]);
        await refetchThreads();
      }
    } finally {
      setCreatingThread(false);
      setThreadPanelOpen(false);
    }
  }

  function switchThread(id: string) {
    setActiveThreadId(id);
    setThreadPanelOpen(false);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending || !activeThreadId) return;
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setSending(true);
    try {
      const res = await authedFetch("/api/coach", { method: "POST", body: JSON.stringify({ message: trimmed, threadId: activeThreadId }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      setMessages((prev) => [...prev, { role: "assistant", content: json.reply }]);
      if (json.title) await refetchThreads();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  const activeThread = threads.find((t) => t.id === activeThreadId);

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col animate-fade-in lg:mx-auto lg:w-full lg:max-w-2xl">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Coach</p>
          <h1 className="mt-0.5 truncate text-title font-bold tracking-tight text-foreground">{activeThread?.title || "New chat"}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setThreadPanelOpen((v) => !v)}
            aria-label="Chat history"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-border-strong"
          >
            <MessagesSquare className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={newChat}
            disabled={creatingThread}
            aria-label="New chat"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-white shadow-glow-accent disabled:opacity-40"
          >
            {creatingThread ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {threadPanelOpen && (
        <div className="glass mt-3 max-h-56 shrink-0 space-y-1 overflow-y-auto rounded-2xl p-2 shadow-raised">
          {threads.length === 0 ? (
            <p className="p-3 text-center text-xs text-muted-foreground">No conversations yet.</p>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => switchThread(t.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  t.id === activeThreadId ? "bg-accent-soft/50 text-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <span className="min-w-0 flex-1 truncate">{t.title || "New chat"}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{relativeDay(t.last_message_at)}</span>
                {t.id === activeThreadId && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
              </button>
            ))
          )}
        </div>
      )}

      <div ref={scrollRef} className="scrollbar-none mt-5 flex-1 space-y-3 overflow-y-auto pb-3">
        {messages.length === 0 && !sending && (
          <div className="glass rounded-2xl p-4 text-sm text-muted-foreground shadow-card">
            {profile?.track === "business"
              ? "Ask me anything about building your business — I'll keep it real, not hype."
              : "Ask me anything about school, skills, or your future — I'll always make sure school comes first."}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                m.role === "user" ? "bg-gradient-brand text-white shadow-subtle" : "glass text-foreground shadow-subtle"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="glass flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm text-muted-foreground shadow-subtle">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          </div>
        )}
        {error && <p className="text-xs text-danger">{error}</p>}

        {(chips.length > 0 || profile) && messages.length < 2 && (
          <div className="glass rounded-2xl p-4 shadow-card">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
              <Sparkles className="h-3.5 w-3.5" /> Today&rsquo;s Recommendation
            </p>
            <div className="mt-3 space-y-2">
              {chips.map((chip, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-muted px-3.5 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span>{chip.icon}</span> {chip.label}
                  </span>
                  <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-foreground">{chip.minutes} min</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {messages.length === 0 && (
        <div className="scrollbar-none mb-3 flex shrink-0 gap-2 overflow-x-auto pb-1">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              className="shrink-0 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:border-border-strong"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex shrink-0 items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Future Coach anything…"
          className="h-12 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          aria-label="Send"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-white shadow-glow-accent transition-opacity disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      <p className="mt-2 shrink-0 text-center text-caption text-muted-foreground">
        Future Coach is a study &amp; career guide, not a substitute for a teacher, parent, or professional.
      </p>
    </div>
  );
}
