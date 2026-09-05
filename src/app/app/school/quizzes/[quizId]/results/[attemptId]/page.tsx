"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, TriangleAlert } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { useStudySubjects, useStudyTopics } from "@/lib/hooks/study";
import type { AnswerVerdict, StudyQuiz, StudyQuizAttempt } from "@/lib/study/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { cn } from "@/lib/utils";

const VERDICT_LABEL: Record<AnswerVerdict, string> = { correct: "Correct", almost: "Almost", review: "Review" };
const VERDICT_TONE: Record<AnswerVerdict, "success" | "warning" | "danger"> = { correct: "success", almost: "warning", review: "danger" };

export default function QuizResultsPage({ params }: { params: Promise<{ quizId: string; attemptId: string }> }) {
  const { quizId, attemptId } = use(params);
  const { user } = useAuth();

  const [attempt, setAttempt] = useState<StudyQuizAttempt | null>(null);
  const [quiz, setQuiz] = useState<StudyQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [nextFocusNote, setNextFocusNote] = useState<string | null>(null);

  const { data: subjects } = useStudySubjects(user?.id);
  const { data: topics } = useStudyTopics(user?.id, quiz?.subject_id);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) return;
      const [{ data: attemptRow }, { data: quizRow }] = await Promise.all([
        supabase.from("study_quiz_attempts").select("*").eq("id", attemptId).maybeSingle(),
        supabase.from("study_quizzes").select("*").eq("id", quizId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (!attemptRow || !quizRow) {
        setNotFound(true);
      } else {
        setAttempt(attemptRow as StudyQuizAttempt);
        setQuiz(quizRow as StudyQuiz);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [quizId, attemptId]);

  useEffect(() => {
    try {
      const note = sessionStorage.getItem(`quiz-note-${attemptId}`);
      if (note) setNextFocusNote(note);
    } catch {
      // sessionStorage unavailable — the extra line just won't show.
    }
  }, [attemptId]);

  if (loading) return <LoadingScreen message="Loading your results…" fullScreen={false} />;
  if (notFound || !attempt || !quiz) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <TriangleAlert className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Couldn&apos;t find that result.</p>
        </CardContent>
      </Card>
    );
  }

  const subject = subjects.find((s) => s.id === quiz.subject_id);
  const total = attempt.results.length;

  // "Practice Weak Topics" target: a single resolvable weak topic sends the
  // student straight into a focused study session; several sends them back
  // to the subject page's own Weak Topics list.
  const singleWeakTopic = attempt.weak_topics.length === 1 ? topics.find((t) => t.name.trim().toLowerCase() === attempt.weak_topics[0].trim().toLowerCase()) : undefined;
  const practiceHref =
    attempt.weak_topics.length === 0
      ? null
      : singleWeakTopic
      ? `/app/school/subjects/${quiz.subject_id}/session?topic=${singleWeakTopic.id}`
      : `/app/school/subjects/${quiz.subject_id}`;

  return (
    <div className="space-y-6">
      <Card className="border-accent/30">
        <CardContent className="flex flex-col items-center gap-1 p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Score</p>
          <p className="mt-2 text-4xl font-extrabold text-foreground">
            {attempt.correct_count} / {total}
          </p>
          <p
            className={cn(
              "mt-1 text-lg font-bold",
              attempt.score_percent >= 80 ? "text-success" : attempt.score_percent >= 50 ? "text-warning" : "text-danger"
            )}
          >
            {attempt.score_percent}%
          </p>

          {subject && (
            <p className="mt-3 text-xs text-muted-foreground">
              {subject.icon} {subject.name}
              {quiz.is_mock_exam ? " · Mock Exam" : ""}
            </p>
          )}
        </CardContent>
      </Card>

      {nextFocusNote && (
        <Card className="border border-accent/30">
          <CardContent className="flex items-start gap-2.5 p-4 text-sm text-foreground">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>{nextFocusNote}</span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-success">Strong</p>
            <p className="mt-1.5 text-sm text-foreground">{attempt.strong_topics.length ? attempt.strong_topics.join(", ") : "None yet, keep practicing."}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-warning">Needs work</p>
            <p className="mt-1.5 text-sm text-foreground">{attempt.weak_topics.length ? attempt.weak_topics.join(", ") : "Nothing. Great job across the board."}</p>
          </CardContent>
        </Card>
      </div>

      {practiceHref && (
        <Link href={practiceHref}>
          <Button size="lg" className="w-full">
            Practice Weak Topics
          </Button>
        </Link>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Review Answers</h2>
        <div className="space-y-2">
          {attempt.results.map((r, i) => (
            <Card key={r.question_id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    {i + 1}. {quiz.questions.find((q) => q.id === r.question_id)?.prompt ?? r.topic}
                  </p>
                  <Badge tone={VERDICT_TONE[r.verdict]} className="shrink-0">
                    {VERDICT_LABEL[r.verdict]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your answer: <span className="text-foreground">{r.your_answer || "(no answer)"}</span>
                </p>
                {r.verdict !== "correct" && (
                  <p className="text-xs text-muted-foreground">
                    Correct answer: <span className="text-foreground">{r.correct_answer}</span>
                  </p>
                )}
                {r.explanation && <p className="text-xs leading-relaxed text-muted-foreground">{r.explanation}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
