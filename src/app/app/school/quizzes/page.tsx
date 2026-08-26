"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Brain, ChevronRight, GraduationCap, TriangleAlert, BookOpen, ClipboardList } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { authedFetch } from "@/lib/api";
import { useStudySubjects, useStudyTopics, useStudyQuizzes, useStudyQuizAttempts } from "@/lib/hooks/study";
import type { QuizDifficulty } from "@/lib/study/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

const QUESTION_COUNTS = [5, 10, 20] as const;
const DIFFICULTIES: { value: QuizDifficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "exam", label: "Exam Level" },
];

export default function QuizzesPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading quizzes…" fullScreen={false} />}>
      <QuizzesPageInner />
    </Suspense>
  );
}

function QuizzesPageInner() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSubject = searchParams.get("subject") ?? "";
  const preselectedMaterial = searchParams.get("material") ?? "";

  const { data: subjects } = useStudySubjects(user?.id);
  const { data: quizzes, loading: quizzesLoading } = useStudyQuizzes(user?.id);
  const { data: attempts } = useStudyQuizAttempts(user?.id);

  const [subjectId, setSubjectId] = useState(preselectedSubject);
  const [topicId, setTopicId] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<(typeof QUESTION_COUNTS)[number]>(10);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("medium");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: topics } = useStudyTopics(user?.id, subjectId || undefined);

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const topicMap = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);

  // Most recent attempt per quiz, for the history list.
  const latestAttemptByQuiz = useMemo(() => {
    const map = new Map<string, (typeof attempts)[number]>();
    for (const a of attempts) {
      const existing = map.get(a.quiz_id);
      if (!existing || a.created_at > existing.created_at) map.set(a.quiz_id, a);
    }
    return map;
  }, [attempts]);

  async function generateQuiz() {
    if (!user || !subjectId || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await authedFetch("/api/study/generate-quiz", {
        method: "POST",
        body: JSON.stringify({
          subjectId,
          topicId: topicId || undefined,
          materialId: preselectedMaterial || undefined,
          questionCount,
          difficulty,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't generate that quiz.");
      router.push(`/app/school/quizzes/${json.quiz.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong generating that quiz.");
      setGenerating(false);
    }
  }

  if (generating) {
    return <LoadingScreen message="Writing your quiz…" fullScreen={false} />;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">New Quiz</h2>
          <Link href="/app/school/quizzes/exam-mode" className="flex shrink-0 items-center gap-1 text-xs font-semibold text-accent">
            <GraduationCap className="h-3.5 w-3.5" /> Exam Mode
          </Link>
        </div>

        {error && (
          <Card className="border border-danger/40">
            <CardContent className="flex items-start gap-2.5 p-4 text-sm text-danger">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </CardContent>
          </Card>
        )}

        {subjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Add a subject first"
            subtitle="Come back here once you've added a subject to generate a quiz."
            cta={{ label: "Add subject", href: "/app/school/subjects" }}
          />
        ) : (
          <Card>
            <CardContent className="space-y-5 p-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</p>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSubjectId(s.id);
                        setTopicId("");
                      }}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                        subjectId === s.id ? "bg-gradient-brand text-white shadow-glow-accent" : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span>{s.icon}</span>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {subjectId && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Topic</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTopicId("")}
                      className={cn(
                        "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                        topicId === "" ? "bg-gradient-brand text-white shadow-glow-accent" : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      All topics
                    </button>
                    {topics.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTopicId(t.id)}
                        className={cn(
                          "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                          topicId === t.id ? "bg-gradient-brand text-white shadow-glow-accent" : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Questions</p>
                <div className="grid grid-cols-3 gap-2">
                  {QUESTION_COUNTS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQuestionCount(n)}
                      className={cn(
                        "rounded-xl py-2.5 text-sm font-bold transition-colors",
                        questionCount === n ? "bg-gradient-brand text-white shadow-glow-accent" : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Difficulty</p>
                <div className="grid grid-cols-2 gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDifficulty(d.value)}
                      className={cn(
                        "rounded-xl py-2.5 text-sm font-bold transition-colors",
                        difficulty === d.value ? "bg-gradient-brand text-white shadow-glow-accent" : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button size="lg" className="w-full" disabled={!subjectId} onClick={generateQuiz}>
                <Brain className="h-4 w-4" />
                Generate Quiz
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">History</h2>
        {!quizzesLoading && quizzes.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No quizzes yet" subtitle="Generate one above to start practicing." />
        ) : (
          <div className="space-y-2">
            {quizzes.map((q) => {
              const subject = subjectMap.get(q.subject_id);
              const topic = q.topic_id ? topicMap.get(q.topic_id) : undefined;
              const attempt = latestAttemptByQuiz.get(q.id);
              const href = attempt ? `/app/school/quizzes/${q.id}/results/${attempt.id}` : `/app/school/quizzes/${q.id}`;
              return (
                <Link key={q.id} href={href}>
                  <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-lg">
                        {subject?.icon ?? "🧠"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">
                          {subject?.name ?? "Subject"}
                          {q.is_mock_exam ? " · Mock Exam" : topic ? ` · ${topic.name}` : ""}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs capitalize text-muted-foreground">
                          {q.difficulty} · {q.question_count} questions
                        </p>
                      </div>
                      {attempt ? (
                        <Badge tone={attempt.score_percent >= 80 ? "success" : attempt.score_percent >= 50 ? "warning" : "danger"} className="shrink-0">
                          {attempt.score_percent}%
                        </Badge>
                      ) : (
                        <Badge tone="accent" className="shrink-0">
                          Not started
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
