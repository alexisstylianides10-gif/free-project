"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lightbulb, BookOpen, Compass, Footprints, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { authedFetch } from "@/lib/api";
import { useStudySubjects } from "@/lib/hooks/study";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";

interface LocalMessage {
  role: "user" | "assistant";
  content: string;
}

const ACTIONS: { key: string; label: string; icon: typeof Lightbulb; frame: (q: string) => string }[] = [
  {
    key: "hint",
    label: "Hint",
    icon: Lightbulb,
    frame: (q) => `Here's my homework question: "${q}". Give me a hint to get started, but don't solve it for me.`,
  },
  {
    key: "explain",
    label: "Explain",
    icon: BookOpen,
    frame: (q) => `Here's my homework question: "${q}". Help me understand the concept behind this question.`,
  },
  {
    key: "example",
    label: "Show Similar Example",
    icon: Compass,
    frame: (q) => `Here's my homework question: "${q}". Show me a similar worked example (not this exact problem) so I can figure mine out.`,
  },
  {
    key: "walkthrough",
    label: "Walk Me Through It",
    icon: Footprints,
    frame: (q) =>
      `Here's my homework question: "${q}". Walk me through it step by step. Ask me what I already know before telling me the next step. Don't just give me the final answer.`,
  },
];

export default function HomeworkHelpPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const { user } = useAuth();
  const { data: subjects } = useStudySubjects(user?.id);
  const subject = subjects.find((s) => s.id === subjectId);

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(framedMessage: string) {
    if (!framedMessage.trim() || sending) return;
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: framedMessage }]);
    setSending(true);
    try {
      const res = await authedFetch("/api/study/tutor", {
        method: "POST",
        body: JSON.stringify({ subjectId, message: framedMessage }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      setMessages((prev) => [...prev, { role: "assistant", content: json.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  if (!subject) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <Link href={`/app/school/subjects/${subjectId}`} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {subject.name}
      </Link>

      <div>
        <h1 className="text-xl font-extrabold text-foreground">Homework Help</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe the question you&rsquo;re stuck on. Your tutor will help you work through it, not do it for you.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type or paste your homework question here…"
            rows={4}
            className="resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            {ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.key}
                  type="button"
                  disabled={!question.trim() || sending}
                  onClick={() => ask(action.frame(question.trim()))}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-muted px-3 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-border-strong/40 disabled:opacity-40"
                >
                  <Icon className="h-3.5 w-3.5" /> {action.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {(messages.length > 0 || sending) && (
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  m.role === "user" ? "bg-gradient-brand text-white shadow-subtle" : "bg-surface border border-border text-foreground shadow-subtle"
                )}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-surface border border-border flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm text-muted-foreground shadow-subtle">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </div>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}

      <p className="text-center text-caption text-muted-foreground">Homework Help teaches the concept. It won&rsquo;t just hand you the answer.</p>
    </div>
  );
}
