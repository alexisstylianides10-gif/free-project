"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, TriangleAlert, XCircle } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { authedFetch } from "@/lib/api";
import { useStudySubjects, useStudyTopics } from "@/lib/hooks/study";
import type { StudyQuiz } from "@/lib/study/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { cn } from "@/lib/utils";

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TakeQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [quiz, setQuiz] = useState<StudyQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const { data: subjects } = useStudySubjects(user?.id);
  const { data: topics } = useStudyTopics(user?.id);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  const [checked, setChecked] = useState(false); // immediate feedback shown for the current MC/TF question (non-exam only)
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) return;
      const { data, error: fetchError } = await supabase.from("study_quizzes").select("*").eq("id", quizId).maybeSingle();
      if (cancelled) return;
      if (fetchError || !data) {
        setNotFound(true);
      } else {
        setQuiz(data as StudyQuiz);
        if ((data as StudyQuiz).is_mock_exam && (data as StudyQuiz).time_limit_min) {
          setSecondsLeft((data as StudyQuiz).time_limit_min! * 60);
        }
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  const subject = quiz ? subjects.find((s) => s.id === quiz.subject_id) : undefined;
  const topic = quiz?.topic_id ? topics.find((t) => t.id === quiz.topic_id) : undefined;
  const question = quiz?.questions[index];
  const total = quiz?.questions.length ?? 0;
  const isLast = index === total - 1;

  const submitQuiz = useCallback(
    async (finalAnswers: Record<string, string>) => {
      if (!quiz || submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setError(null);
      try {
        const res = await authedFetch("/api/study/grade-quiz", {
          method: "POST",
          body: JSON.stringify({
            quizId: quiz.id,
            answers: quiz.questions.map((q) => ({ question_id: q.id, your_answer: finalAnswers[q.id] ?? "" })),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Couldn't grade that quiz.");

        if (quiz.is_mock_exam && json.next_focus_note) {
          try {
            sessionStorage.setItem(`quiz-note-${json.attempt.id}`, json.next_focus_note);
          } catch {
            // sessionStorage can throw in some contexts — the note is a nice-to-have, not critical.
          }
        }

        router.push(`/app/school/quizzes/${quiz.id}/results/${json.attempt.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong submitting your answers.");
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [quiz, router]
  );

  // Mock-exam countdown — auto-submits whatever's been answered when it hits zero.
  useEffect(() => {
    if (secondsLeft === null || submitting) return;
    if (secondsLeft <= 0) {
      submitQuiz(answers);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, submitting]);

  // Advances to the next question (or submits, on the last one) using an
  // explicit answers map rather than the `answers` state variable — when an
  // answer is recorded and advanced past in the same click (mock-exam
  // auto-advance, free-text submit), the state setter hasn't flushed yet,
  // so relying on the stale closure would silently drop that last answer.
  function advance(nextAnswers: Record<string, string>) {
    if (!quiz) return;
    setAnswers(nextAnswers);
    setChecked(false);
    setDraft("");
    if (isLast) {
      submitQuiz(nextAnswers);
    } else {
      setIndex((i) => i + 1);
    }
  }

  function selectOption(option: string) {
    if (!question) return;
    const nextAnswers = { ...answers, [question.id]: option };
    if (!quiz?.is_mock_exam) {
      setAnswers(nextAnswers);
      setChecked(true);
    } else {
      advance(nextAnswers);
    }
  }

  function goNext() {
    advance(answers);
  }

  function submitFreeText() {
    if (!question) return;
    advance({ ...answers, [question.id]: draft });
  }

  if (loading) return <LoadingScreen message="Loading your quiz…" fullScreen={false} />;
  if (notFound || !quiz || !question) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <TriangleAlert className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Couldn&apos;t find that quiz.</p>
        </CardContent>
      </Card>
    );
  }

  const yourAnswer = answers[question.id];
  const isCorrectSelection = checked && yourAnswer !== undefined && normalizeEq(yourAnswer, question.answer);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {subject?.name ?? "Quiz"}
            {quiz.is_mock_exam ? " · Mock Exam" : topic ? ` · ${topic.name}` : ""}
          </p>
          <p className="mt-0.5 text-sm font-bold text-foreground">
            Question {index + 1} of {total}
          </p>
        </div>
        {secondsLeft !== null && (
          <span className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold tabular-nums", secondsLeft <= 60 ? "bg-danger-soft text-danger" : "bg-muted text-foreground")}>
            <Clock className="h-3.5 w-3.5" />
            {formatClock(secondsLeft)}
          </span>
        )}
      </div>

      <ProgressBar value={(index / total) * 100} />

      {error && (
        <Card className="border border-danger/40">
          <CardContent className="flex items-start gap-2.5 p-4 text-sm text-danger">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-5 p-5">
          {question.type === "scenario" && (
            <span className="inline-block rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent">Scenario</span>
          )}
          <p className="text-base font-semibold leading-relaxed text-foreground">{question.prompt}</p>

          {question.type === "multiple_choice" && (
            <div className="space-y-2">
              {(question.options ?? []).map((opt) => {
                const isPicked = yourAnswer === opt;
                const showState = checked;
                const isRight = showState && normalizeEq(opt, question.answer);
                const isWrongPick = showState && isPicked && !isRight;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={checked}
                    onClick={() => selectOption(opt)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors",
                      !showState && "border-border bg-surface text-foreground hover:border-accent/50",
                      isRight && "border-success bg-success-soft text-success",
                      isWrongPick && "border-danger bg-danger-soft text-danger",
                      showState && !isRight && !isWrongPick && "border-border bg-surface text-muted-foreground"
                    )}
                  >
                    <span>{opt}</span>
                    {isRight && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                    {isWrongPick && <XCircle className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {question.type === "true_false" && (
            <div className="grid grid-cols-2 gap-3">
              {["True", "False"].map((opt) => {
                const isPicked = yourAnswer === opt;
                const showState = checked;
                const isRight = showState && normalizeEq(opt, question.answer);
                const isWrongPick = showState && isPicked && !isRight;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={checked}
                    onClick={() => selectOption(opt)}
                    className={cn(
                      "rounded-xl border py-4 text-sm font-bold transition-colors",
                      !showState && "border-border bg-surface text-foreground hover:border-accent/50",
                      isRight && "border-success bg-success-soft text-success",
                      isWrongPick && "border-danger bg-danger-soft text-danger",
                      showState && !isRight && !isWrongPick && "border-border bg-surface text-muted-foreground"
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {(question.type === "short_answer" || question.type === "fill_blank" || question.type === "scenario") && (
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={question.type === "fill_blank" ? "Fill in the blank…" : "Type your answer…"}
              rows={question.type === "scenario" ? 5 : 3}
              className="w-full resize-y rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
            />
          )}

          {checked && !quiz.is_mock_exam && (
            <div className={cn("rounded-xl p-3.5 text-sm leading-relaxed", isCorrectSelection ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
              <p className="font-bold">{isCorrectSelection ? "Correct" : `Not quite — correct answer: ${question.answer}`}</p>
              {question.explanation && <p className="mt-1 text-foreground/80">{question.explanation}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {(question.type === "short_answer" || question.type === "fill_blank" || question.type === "scenario") && (
        <Button size="lg" className="w-full" disabled={submitting} onClick={submitFreeText}>
          {isLast ? (submitting ? "Submitting…" : "Submit Quiz") : "Next"}
        </Button>
      )}

      {(question.type === "multiple_choice" || question.type === "true_false") && checked && !quiz.is_mock_exam && (
        <Button size="lg" className="w-full" disabled={submitting} onClick={goNext}>
          {isLast ? (submitting ? "Submitting…" : "Submit Quiz") : "Next"}
        </Button>
      )}

      {submitting && (question.type === "multiple_choice" || question.type === "true_false") && quiz.is_mock_exam && (
        <p className="text-center text-xs text-muted-foreground">Grading your answers…</p>
      )}
    </div>
  );
}

function normalizeEq(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
