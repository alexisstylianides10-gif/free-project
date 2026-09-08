"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GraduationCap,
  Target,
  ListChecks,
  RotateCcw,
  Send,
  Loader2,
  Play,
  Pause,
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  CircleDashed,
  Square,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { authedFetch } from "@/lib/api";
import { useStudySubjects, useStudyTopics, useStudyTutorMessages } from "@/lib/hooks/study";
import { logFocusSession, updateTopicMastery } from "@/lib/study/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import type { StudyMode, AnswerVerdict } from "@/lib/study/types";

const QUIZ_LENGTH = 3;

interface LocalMessage {
  role: "user" | "assistant";
  content: string;
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function VerdictBadge({ verdict, t }: { verdict: AnswerVerdict; t: ReturnType<typeof useTranslations> }) {
  if (verdict === "correct") {
    return (
      <p className="flex items-center gap-1.5 text-sm font-bold text-success">
        <CheckCircle2 className="h-4 w-4" /> {t("verdict.correct")}
      </p>
    );
  }
  if (verdict === "almost") {
    return (
      <p className="flex items-center gap-1.5 text-sm font-bold text-warning">
        <CircleDashed className="h-4 w-4" /> {t("verdict.almost")}
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-sm font-bold text-danger">
      <XCircle className="h-4 w-4" /> {t("verdict.review")}
    </p>
  );
}

export default function StudySessionPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicIdParam = searchParams.get("topic");
  const planItemId = searchParams.get("plan_item");
  const t = useTranslations("StudySessionPage");

  const MODES: { key: StudyMode; label: string; icon: typeof GraduationCap }[] = [
    { key: "learn", label: t("modes.learn"), icon: GraduationCap },
    { key: "practice", label: t("modes.practice"), icon: Target },
    { key: "quiz", label: t("modes.quiz"), icon: ListChecks },
    { key: "review", label: t("modes.review"), icon: RotateCcw },
  ];

  const EXPLANATION_LEVELS: { key: string; label: string }[] = [
    { key: "simple", label: t("levels.simple") },
    { key: "normal", label: t("levels.normal") },
    { key: "detailed", label: t("levels.detailed") },
    { key: "exam", label: t("levels.exam") },
  ];

  const { user, profile, refreshProfile } = useAuth();
  const { data: subjects } = useStudySubjects(user?.id);
  const { data: topics } = useStudyTopics(user?.id, subjectId);
  const { data: tutorMessages, loading: tutorLoading } = useStudyTutorMessages(user?.id, subjectId);

  const subject = subjects.find((s) => s.id === subjectId);
  const explicitTopic = useMemo(() => topics.find((t) => t.id === topicIdParam) ?? null, [topics, topicIdParam]);
  const weakestTopic = useMemo(() => (topics.length ? [...topics].sort((a, b) => a.mastery - b.mastery)[0] : null), [topics]);
  // Practice/Quiz/Review need *some* topic's content to work with — if the
  // student started a general session, quietly fall back to their weakest
  // topic for those modes rather than blocking the feature outright. Learn
  // mode and the header intentionally do NOT use this fallback: an
  // unrequested topic must never silently become "the topic" the tutor
  // chat is scoped to (see the header + tutor call below).
  const activeTopic = explicitTopic ?? weakestTopic;

  const goalLine = explicitTopic
    ? explicitTopic.summary
      ? explicitTopic.summary.length > 120
        ? `${explicitTopic.summary.slice(0, 117)}…`
        : explicitTopic.summary
      : t("buildUnderstanding", { topic: explicitTopic.name })
    : subject
      ? t("makeProgress", { subject: subject.name })
      : "";

  // --- Timer ---------------------------------------------------------
  const [durationMin, setDurationMin] = useState(25);
  const [remainingSec, setRemainingSec] = useState(25 * 60);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemainingSec((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  function adjustDuration(deltaMin: number) {
    setDurationMin((d) => Math.max(5, Math.min(120, d + deltaMin)));
    setRemainingSec((s) => Math.max(0, s + deltaMin * 60));
  }

  // --- Mode -----------------------------------------------------------
  const [mode, setMode] = useState<StudyMode>("learn");

  // --- Learn mode (AI tutor chat) --------------------------------------
  const [learnMessages, setLearnMessages] = useState<LocalMessage[]>([]);
  const [learnInput, setLearnInput] = useState("");
  const [learnSending, setLearnSending] = useState(false);
  const [learnError, setLearnError] = useState<string | null>(null);
  const learnScrollRef = useRef<HTMLDivElement>(null);
  const learnTopicId = explicitTopic?.id ?? null;

  useEffect(() => {
    if (tutorLoading) return;
    setLearnMessages(
      tutorMessages.filter((m) => (m.topic_id ?? null) === learnTopicId).map((m) => ({ role: m.role, content: m.content }))
    );
    // Deliberately re-runs only when history finishes loading or the
    // scoped topic changes — not on every tutorMessages reference change —
    // so our own optimistic appends below aren't clobbered mid-chat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorLoading, learnTopicId]);

  useEffect(() => {
    learnScrollRef.current?.scrollTo({ top: learnScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [learnMessages, learnSending]);

  async function sendTutorMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || learnSending) return;
    setLearnError(null);
    setLearnMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setLearnInput("");
    setLearnSending(true);
    try {
      const res = await authedFetch("/api/study/tutor", {
        method: "POST",
        body: JSON.stringify({ subjectId, topicId: learnTopicId, message: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("somethingWentWrong"));
      setLearnMessages((prev) => [...prev, { role: "assistant", content: json.reply }]);
    } catch (e) {
      setLearnError(e instanceof Error ? e.message : t("somethingWentWrong"));
    } finally {
      setLearnSending(false);
    }
  }

  // --- Practice mode (active recall, one question at a time) -----------
  const [practiceQuestion, setPracticeQuestion] = useState<string | null>(null);
  const [practiceAnswer, setPracticeAnswer] = useState("");
  const [practiceResult, setPracticeResult] = useState<{ verdict: AnswerVerdict; explanation: string } | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceAsked, setPracticeAsked] = useState<string[]>([]);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  const [answeredTotal, setAnsweredTotal] = useState(0);
  const [answeredCorrect, setAnsweredCorrect] = useState(0);

  async function loadPracticeQuestion() {
    if (!activeTopic || practiceLoading) return;
    setPracticeLoading(true);
    setPracticeError(null);
    setPracticeResult(null);
    setPracticeAnswer("");
    try {
      const res = await authedFetch("/api/study/generate-question", {
        method: "POST",
        body: JSON.stringify({ topicId: activeTopic.id, askedQuestions: practiceAsked }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("couldNotLoadQuestion"));
      setPracticeQuestion(json.question);
      setPracticeAsked((prev) => [...prev, json.question]);
    } catch (e) {
      setPracticeError(e instanceof Error ? e.message : t("couldNotLoadQuestion"));
    } finally {
      setPracticeLoading(false);
    }
  }

  useEffect(() => {
    if (mode === "practice" && activeTopic && practiceQuestion === null && !practiceLoading && !practiceError) {
      loadPracticeQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activeTopic?.id]);

  async function submitPracticeAnswer() {
    if (!activeTopic || !practiceQuestion || !practiceAnswer.trim() || practiceLoading) return;
    setPracticeLoading(true);
    setPracticeError(null);
    try {
      const res = await authedFetch("/api/study/evaluate-answer", {
        method: "POST",
        body: JSON.stringify({ topicId: activeTopic.id, question: practiceQuestion, studentAnswer: practiceAnswer }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("couldNotGrade"));
      setPracticeResult(json);
      const correct = json.verdict === "correct";
      setAnsweredTotal((total) => total + 1);
      setAnsweredCorrect((c) => c + (correct ? 1 : 0));
      if (supabase) await updateTopicMastery(supabase, activeTopic.id, correct);
    } catch (e) {
      setPracticeError(e instanceof Error ? e.message : t("couldNotGrade"));
    } finally {
      setPracticeLoading(false);
    }
  }

  // --- Quiz mode (3-question in-session check) --------------------------
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizQuestion, setQuizQuestion] = useState<string | null>(null);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizResult, setQuizResult] = useState<{ verdict: AnswerVerdict; explanation: string } | null>(null);
  const [quizAsked, setQuizAsked] = useState<string[]>([]);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  async function loadQuizQuestion(asked: string[]) {
    if (!activeTopic) return;
    setQuizLoading(true);
    setQuizError(null);
    setQuizResult(null);
    setQuizAnswer("");
    try {
      const res = await authedFetch("/api/study/generate-question", {
        method: "POST",
        body: JSON.stringify({ topicId: activeTopic.id, askedQuestions: asked }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("couldNotLoadQuestion"));
      setQuizQuestion(json.question);
      setQuizAsked([...asked, json.question]);
    } catch (e) {
      setQuizError(e instanceof Error ? e.message : t("couldNotLoadQuestion"));
    } finally {
      setQuizLoading(false);
    }
  }

  useEffect(() => {
    if (mode === "quiz" && activeTopic && !quizDone && quizQuestion === null && !quizLoading && !quizError) {
      loadQuizQuestion(quizAsked);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activeTopic?.id]);

  async function submitQuizAnswer() {
    if (!activeTopic || !quizQuestion || !quizAnswer.trim() || quizLoading) return;
    setQuizLoading(true);
    setQuizError(null);
    try {
      const res = await authedFetch("/api/study/evaluate-answer", {
        method: "POST",
        body: JSON.stringify({ topicId: activeTopic.id, question: quizQuestion, studentAnswer: quizAnswer }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("couldNotGrade"));
      setQuizResult(json);
      const correct = json.verdict === "correct";
      setAnsweredTotal((total) => total + 1);
      setAnsweredCorrect((c) => c + (correct ? 1 : 0));
      if (correct) setQuizScore((s) => s + 1);
      if (supabase) await updateTopicMastery(supabase, activeTopic.id, correct);
    } catch (e) {
      setQuizError(e instanceof Error ? e.message : t("couldNotGrade"));
    } finally {
      setQuizLoading(false);
    }
  }

  function nextQuizQuestion() {
    if (quizIndex + 1 >= QUIZ_LENGTH) {
      setQuizDone(true);
      return;
    }
    setQuizIndex((i) => i + 1);
    setQuizQuestion(null);
    loadQuizQuestion(quizAsked);
  }

  function restartQuiz() {
    setQuizIndex(0);
    setQuizScore(0);
    setQuizDone(false);
    setQuizAsked([]);
    setQuizQuestion(null);
    setQuizResult(null);
    setQuizError(null);
  }

  // --- End session -------------------------------------------------------
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [ending, setEnding] = useState(false);

  async function endSession() {
    if (!user || !profile || !supabase || ending) return;
    setEnding(true);
    try {
      const elapsedMin = Math.max(1, Math.round((durationMin * 60 - remainingSec) / 60));
      const accuracyPercent = answeredTotal > 0 ? Math.round((answeredCorrect / answeredTotal) * 100) : null;
      await logFocusSession(
        supabase,
        user.id,
        { subjectId, topicId: explicitTopic?.id ?? activeTopic?.id ?? null, mode, durationMin: elapsedMin, accuracyPercent },
        profile
      );
      if (planItemId) {
        await supabase.from("study_plan_items").update({ completed: true }).eq("id", planItemId);
      }
      await refreshProfile();
      router.push(`/app/school/subjects/${subjectId}`);
    } finally {
      setEnding(false);
    }
  }

  if (!subject) {
    return <p className="py-12 text-center text-sm text-muted-foreground">{t("loading")}</p>;
  }

  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col animate-fade-in">
      {/* Header */}
      <div className="shrink-0 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-accent">{subject.name}</p>
            <h1 className="truncate text-lg font-extrabold text-foreground">{explicitTopic ? explicitTopic.name : t("generalStudy")}</h1>
            {goalLine && <p className="mt-0.5 truncate text-xs text-muted-foreground">{goalLine}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => adjustDuration(-5)}
              aria-label={t("reduceTimer")}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-14 text-center text-sm font-bold tabular-nums text-foreground">{formatClock(remainingSec)}</span>
            <button
              type="button"
              onClick={() => adjustDuration(5)}
              aria-label={t("addTimer")}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              aria-label={running ? t("pauseTimer") : t("resumeTimer")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground hover:bg-border-strong/40"
            >
              {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {remainingSec === 0 && !confirmingEnd && (
          <div className="bg-surface border border-border rounded-xl px-3.5 py-2.5 text-xs text-muted-foreground shadow-subtle">
            {t("timesUp")}
          </div>
        )}

        {/* Mode pills */}
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-0.5">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  active ? "bg-gradient-brand text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="mt-4 flex-1 overflow-y-auto scrollbar-none">
        {mode === "learn" && (
          <div className="flex h-full flex-col">
            <div ref={learnScrollRef} className="flex-1 space-y-3 overflow-y-auto pb-3 scrollbar-none">
              {learnMessages.length === 0 && !learnSending && (
                <div className="bg-surface border border-border rounded-2xl p-4 text-sm text-muted-foreground shadow-card">
                  {t("askOrPickLevel", { topic: explicitTopic ? explicitTopic.name : subject.name })}
                </div>
              )}
              {learnMessages.map((m, i) => (
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
              {learnSending && (
                <div className="flex justify-start">
                  <div className="bg-surface border border-border flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm text-muted-foreground shadow-subtle">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("thinking")}
                  </div>
                </div>
              )}
              {learnError && <p className="text-xs text-danger">{learnError}</p>}
            </div>

            <div className="shrink-0 space-y-2.5 pt-2">
              <div className="scrollbar-none flex gap-2 overflow-x-auto pb-0.5">
                {EXPLANATION_LEVELS.map((lvl) => (
                  <button
                    key={lvl.key}
                    type="button"
                    disabled={learnSending}
                    onClick={() =>
                      sendTutorMessage(t("explainAtLevel", { topic: explicitTopic ? explicitTopic.name : subject.name, level: lvl.label.toLowerCase() }))
                    }
                    className="shrink-0 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-border-strong disabled:opacity-40"
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendTutorMessage(learnInput);
                }}
                className="flex items-center gap-2"
              >
                <Input
                  value={learnInput}
                  onChange={(e) => setLearnInput(e.target.value)}
                  placeholder={t("askAnything")}
                  className="h-11 flex-1 rounded-full"
                />
                <button
                  type="submit"
                  disabled={learnSending || !learnInput.trim()}
                  aria-label={t("send")}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-white shadow-raised transition-opacity disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {mode === "practice" && (
          <div className="space-y-4">
            {!activeTopic ? (
              <div className="bg-surface border border-border rounded-2xl p-4 text-sm text-muted-foreground shadow-card">
                {t("addMaterialToPractice")}
              </div>
            ) : (
              <>
                {!explicitTopic && (
                  <p className="text-xs text-muted-foreground">
                    {t("practicingWeakest")} <span className="font-semibold text-foreground">{activeTopic.name}</span>
                  </p>
                )}
                {practiceLoading && !practiceQuestion ? (
                  <div className="bg-surface border border-border flex items-center gap-2 rounded-2xl p-4 text-sm text-muted-foreground shadow-subtle">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("loadingQuestion")}
                  </div>
                ) : practiceQuestion ? (
                  <div className="bg-surface border border-border space-y-3 rounded-2xl p-4 shadow-card">
                    <p className="text-sm font-semibold leading-relaxed text-foreground">{practiceQuestion}</p>
                    {!practiceResult ? (
                      <>
                        <Textarea
                          value={practiceAnswer}
                          onChange={(e) => setPracticeAnswer(e.target.value)}
                          placeholder={t("typeYourAnswer")}
                          rows={3}
                          className="resize-none"
                        />
                        <Button
                          size="md"
                          className="w-full"
                          onClick={submitPracticeAnswer}
                          disabled={!practiceAnswer.trim() || practiceLoading}
                        >
                          {practiceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("submitAnswer")}
                        </Button>
                      </>
                    ) : (
                      <>
                        <VerdictBadge verdict={practiceResult.verdict} t={t} />
                        <p className="text-sm leading-relaxed text-muted-foreground">{practiceResult.explanation}</p>
                        <Button size="md" variant="secondary" className="w-full" onClick={loadPracticeQuestion} disabled={practiceLoading}>
                          {practiceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("nextQuestion")}
                        </Button>
                      </>
                    )}
                  </div>
                ) : null}
                {practiceError && <p className="text-xs text-danger">{practiceError}</p>}
              </>
            )}
          </div>
        )}

        {mode === "quiz" && (
          <div className="space-y-4">
            {!activeTopic ? (
              <div className="bg-surface border border-border rounded-2xl p-4 text-sm text-muted-foreground shadow-card">
                {t("addMaterialToQuiz")}
              </div>
            ) : quizDone ? (
              <div className="bg-surface border border-border space-y-3 rounded-2xl p-5 text-center shadow-card">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("quickCheckComplete")}</p>
                <p className="text-3xl font-extrabold text-foreground">
                  {quizScore}/{QUIZ_LENGTH}
                </p>
                <Button size="md" variant="secondary" onClick={restartQuiz}>
                  {t("retakeQuickCheck")}
                </Button>
              </div>
            ) : (
              <>
                {!explicitTopic && (
                  <p className="text-xs text-muted-foreground">
                    {t("quickCheckWeakest")} <span className="font-semibold text-foreground">{activeTopic.name}</span>
                  </p>
                )}
                <p className="text-xs font-semibold text-muted-foreground">
                  {t("questionXOfY", { current: quizIndex + 1, total: QUIZ_LENGTH })}
                </p>
                {quizLoading && !quizQuestion ? (
                  <div className="bg-surface border border-border flex items-center gap-2 rounded-2xl p-4 text-sm text-muted-foreground shadow-subtle">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("loadingQuestion")}
                  </div>
                ) : quizQuestion ? (
                  <div className="bg-surface border border-border space-y-3 rounded-2xl p-4 shadow-card">
                    <p className="text-sm font-semibold leading-relaxed text-foreground">{quizQuestion}</p>
                    {!quizResult ? (
                      <>
                        <Textarea
                          value={quizAnswer}
                          onChange={(e) => setQuizAnswer(e.target.value)}
                          placeholder={t("typeYourAnswer")}
                          rows={3}
                          className="resize-none"
                        />
                        <Button size="md" className="w-full" onClick={submitQuizAnswer} disabled={!quizAnswer.trim() || quizLoading}>
                          {quizLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("submitAnswer")}
                        </Button>
                      </>
                    ) : (
                      <>
                        <VerdictBadge verdict={quizResult.verdict} t={t} />
                        <p className="text-sm leading-relaxed text-muted-foreground">{quizResult.explanation}</p>
                        <Button size="md" variant="secondary" className="w-full" onClick={nextQuizQuestion} disabled={quizLoading}>
                          {quizIndex + 1 >= QUIZ_LENGTH ? t("seeScore") : t("nextQuestion")}
                        </Button>
                      </>
                    )}
                  </div>
                ) : null}
                {quizError && <p className="text-xs text-danger">{quizError}</p>}
              </>
            )}
          </div>
        )}

        {mode === "review" && (
          <div className="space-y-3">
            {!activeTopic ? (
              <div className="bg-surface border border-border rounded-2xl p-4 text-sm text-muted-foreground shadow-card">
                {t("addMaterialToReview")}
              </div>
            ) : (
              <div className="bg-surface border border-border space-y-4 rounded-2xl p-4 shadow-card">
                {!explicitTopic && (
                  <p className="text-xs text-muted-foreground">
                    {t("reviewingWeakest")} <span className="font-semibold text-foreground">{activeTopic.name}</span>
                  </p>
                )}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{activeTopic.name}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground">{activeTopic.summary || t("noSummary")}</p>
                </div>
                {activeTopic.key_concepts.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("keyConcepts")}</p>
                    <ul className="space-y-1.5">
                      {activeTopic.key_concepts.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* End session */}
      <div className="mt-3 shrink-0">
        {!confirmingEnd ? (
          <button
            type="button"
            onClick={() => setConfirmingEnd(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-full border border-border py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <Square className="h-3 w-3" /> {t("endSession")}
          </button>
        ) : (
          <div className="bg-surface border border-border space-y-2.5 rounded-2xl p-4 shadow-raised">
            <p className="text-sm text-foreground">
              {answeredTotal > 0
                ? t.rich("endConfirmWithAccuracy", {
                    minutes: Math.max(1, Math.round((durationMin * 60 - remainingSec) / 60)),
                    accuracy: Math.round((answeredCorrect / answeredTotal) * 100),
                    b: (chunks) => <span className="font-bold">{chunks}</span>,
                  })
                : t.rich("endConfirm", {
                    minutes: Math.max(1, Math.round((durationMin * 60 - remainingSec) / 60)),
                    b: (chunks) => <span className="font-bold">{chunks}</span>,
                  })}
            </p>
            <div className="flex gap-2">
              <Button size="md" className="flex-1" onClick={endSession} disabled={ending}>
                {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("finishAndSave")}
              </Button>
              <Button size="md" variant="secondary" onClick={() => setConfirmingEnd(false)} disabled={ending}>
                {t("keepStudying")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
