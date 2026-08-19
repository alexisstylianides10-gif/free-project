"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useChatHistory, useHomework, useExams, useCareerPaths } from "@/lib/hooks/domain";
import { getCareer } from "@/lib/catalog/careers";
import { buildRecommendationChips } from "@/lib/recommendation";
import { authedFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ScreenHeader } from "@/components/shared/ScreenHeader";

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

export default function CoachPage() {
  const { user, profile } = useAuth();
  const { data: history, loading: historyLoading } = useChatHistory(user?.id);
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

  useEffect(() => {
    if (!historyLoading) setMessages(history.map((h) => ({ role: h.role, content: h.content })));
  }, [historyLoading, history]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setSending(true);
    try {
      const res = await authedFetch("/api/coach", { method: "POST", body: JSON.stringify({ message: trimmed }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      setMessages((prev) => [...prev, { role: "assistant", content: json.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col animate-fade-in">
      <ScreenHeader title="Future Coach" subtitle="Your supportive AI mentor." className="shrink-0" />

      <div ref={scrollRef} className="scrollbar-none mt-5 flex-1 space-y-3 overflow-y-auto pb-3">
        {messages.length === 0 && !sending && (
          <div className="glass rounded-2xl p-4 text-sm text-muted-foreground">
            Ask me anything about school, skills, or your future — I&rsquo;ll always make sure school comes first.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                m.role === "user" ? "bg-gradient-brand text-white" : "glass text-foreground"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="glass flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          </div>
        )}
        {error && <p className="text-xs text-danger">{error}</p>}

        {(chips.length > 0 || profile) && messages.length < 2 && (
          <div className="glass rounded-2xl p-4">
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
    </div>
  );
}
