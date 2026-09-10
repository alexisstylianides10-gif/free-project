"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lightbulb, BookOpen, Compass, Footprints, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/AuthProvider";
import { authedFetch } from "@/lib/api";
import { useHomework } from "@/lib/hooks/domain";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { PriorityBadge } from "@/components/ui/PriorityBadge";

interface LocalMessage {
  role: "user" | "assistant";
  content: string;
}

export default function HomeworkHelpPage({ params }: { params: Promise<{ homeworkId: string }> }) {
  const { homeworkId } = use(params);
  const { user } = useAuth();
  const t = useTranslations("HomeworkHelpPage");
  const { data: homework, loading: homeworkLoading } = useHomework(user?.id);
  const hw = homework.find((h) => h.id === homeworkId);

  const ACTIONS: { key: string; label: string; icon: typeof Lightbulb; frame: (q: string) => string }[] = [
    {
      key: "hint",
      label: t("actions.hint.label"),
      icon: Lightbulb,
      frame: (q) => (q ? t("actions.hint.framed", { question: q }) : t("actions.hint.unframed")),
    },
    {
      key: "explain",
      label: t("actions.explain.label"),
      icon: BookOpen,
      frame: (q) => (q ? t("actions.explain.framed", { question: q }) : t("actions.explain.unframed")),
    },
    {
      key: "example",
      label: t("actions.example.label"),
      icon: Compass,
      frame: (q) => (q ? t("actions.example.framed", { question: q }) : t("actions.example.unframed")),
    },
    {
      key: "walkthrough",
      label: t("actions.walkthrough.label"),
      icon: Footprints,
      frame: (q) => (q ? t("actions.walkthrough.framed", { question: q }) : t("actions.walkthrough.unframed")),
    },
  ];

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(framedMessage: string) {
    if (!framedMessage.trim() || sending) return;
    setError(null);
    const history = messages;
    setMessages((prev) => [...prev, { role: "user", content: framedMessage }]);
    setSending(true);
    try {
      const res = await authedFetch("/api/school/homework-help", {
        method: "POST",
        body: JSON.stringify({ homeworkId, message: framedMessage, history }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("somethingWentWrong"));
      setMessages((prev) => [...prev, { role: "assistant", content: json.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("somethingWentWrong"));
    } finally {
      setSending(false);
    }
  }

  if (homeworkLoading && !hw) {
    return <p className="py-12 text-center text-sm text-muted-foreground">{t("loading")}</p>;
  }

  if (!hw) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Link href="/app/school" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("school")}
        </Link>
        <p className="py-12 text-center text-sm text-muted-foreground">{t("notFound")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <Link href="/app/school" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("school")}
      </Link>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold text-foreground">
            {hw.subject}: {hw.title}
          </h1>
          <PriorityBadge priority={hw.priority} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("intro")}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("questionPlaceholder")}
            rows={3}
            className="resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            {ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.key}
                  type="button"
                  disabled={sending}
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
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("thinking")}
              </div>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}

      <p className="text-center text-caption text-muted-foreground">{t("footerNote")}</p>
    </div>
  );
}
