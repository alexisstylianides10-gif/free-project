"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, CalendarClock, Play, Brain, Layers, Trash2, FileText, HelpCircle } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { useExams } from "@/lib/hooks/domain";
import { useStudySubjects, useStudyTopics, useStudyMaterials, useStudyFocusSessions, useStudyQuizzes, useStudyQuizAttempts } from "@/lib/hooks/study";
import { subjectReadiness } from "@/lib/study/recommendation";
import { formatCountdown } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/shared/EmptyState";

export default function SubjectDetailPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const { data: subjects } = useStudySubjects(user?.id);
  const { data: topics } = useStudyTopics(user?.id, subjectId);
  const { data: materials } = useStudyMaterials(user?.id, subjectId);
  const { data: focusSessions } = useStudyFocusSessions(user?.id);
  const { data: quizzes } = useStudyQuizzes(user?.id, subjectId);
  const { data: attempts } = useStudyQuizAttempts(user?.id);
  const { data: exams } = useExams(user?.id);

  const subject = subjects.find((s) => s.id === subjectId);
  const linkedExam = exams.find((e) => e.study_subject_id === subjectId);
  const readiness = subjectReadiness(topics);
  const studyMinutes = focusSessions.filter((s) => s.subject_id === subjectId).reduce((sum, s) => sum + s.duration_min, 0);

  const quizIds = useMemo(() => new Set(quizzes.map((q) => q.id)), [quizzes]);
  const subjectAttempts = attempts.filter((a) => quizIds.has(a.quiz_id));
  const accuracy = subjectAttempts.length ? Math.round(subjectAttempts.reduce((s, a) => s + a.score_percent, 0) / subjectAttempts.length) : null;

  const weakTopics = [...topics].filter((t) => t.mastery < 60).sort((a, b) => a.mastery - b.mastery);

  async function deleteSubject() {
    if (!supabase) return;
    if (!confirm(`Delete ${subject?.name}? This removes its materials, plans, quizzes, and flashcards too.`)) return;
    await supabase.from("study_subjects").delete().eq("id", subjectId);
    router.push("/app/school/subjects");
  }

  if (!subject) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-2xl">{subject.icon}</span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold text-foreground">{subject.name}</h1>
          <p className="text-xs text-muted-foreground">
            {readiness ?? 0}% progress
            {accuracy !== null ? ` · ${accuracy}% quiz accuracy` : ""} · {studyMinutes}m studied
          </p>
        </div>
        <button onClick={deleteSubject} aria-label="Delete subject" className="shrink-0 rounded-full p-2 text-muted-foreground hover:text-danger">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {linkedExam && (
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarClock className="h-4 w-4 text-school" /> {linkedExam.subject} Exam
            </span>
            <span className="text-sm font-bold text-accent">{formatCountdown(linkedExam.exam_date)}</span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href={`/app/school/subjects/${subjectId}/session`}>
          <Button variant="mission" size="lg" className="w-full">
            <Play className="h-4 w-4" />
            Start Studying
          </Button>
        </Link>
        <Link href={`/app/school/subjects/${subjectId}/plan/new`}>
          <Button variant="secondary" size="lg" className="w-full">
            <CalendarClock className="h-4 w-4" />
            Study Plan
          </Button>
        </Link>
        <Link href={`/app/school/quizzes?subject=${subjectId}`}>
          <Button variant="secondary" size="lg" className="w-full">
            <Brain className="h-4 w-4" />
            Generate Quiz
          </Button>
        </Link>
        <Link href={`/app/school/flashcards?subject=${subjectId}`}>
          <Button variant="secondary" size="lg" className="w-full">
            <Layers className="h-4 w-4" />
            Flashcards
          </Button>
        </Link>
        <Link href={`/app/school/subjects/${subjectId}/homework-help`} className="col-span-2">
          <Button variant="secondary" size="lg" className="w-full">
            <HelpCircle className="h-4 w-4" />
            Homework Help
          </Button>
        </Link>
      </div>

      {weakTopics.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Weak Topics</h2>
          <div className="space-y-2">
            {weakTopics.map((t) => (
              <Link key={t.id} href={`/app/school/subjects/${subjectId}/session?topic=${t.id}`}>
                <Card>
                  <CardContent className="p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{t.name}</span>
                      <span className="text-sm font-bold text-warning">{t.mastery}%</span>
                    </div>
                    <ProgressBar value={t.mastery} tone="warning" className="mt-2" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Materials</h2>
          <Link href={`/app/school/subjects/${subjectId}/materials/new`} className="flex items-center gap-1 text-xs font-semibold text-accent">
            <Upload className="h-3.5 w-3.5" /> Add
          </Link>
        </div>
        {materials.length === 0 ? (
          <EmptyState icon={Upload} title="No material yet" subtitle="Upload a PDF, photo, or your notes to get started." />
        ) : (
          <div className="space-y-2">
            {materials.map((m) => (
              <Link key={m.id} href={`/app/school/subjects/${subjectId}/materials/${m.id}`}>
                <Card>
                  <CardContent className="flex items-center gap-3 p-3.5">
                    <FileText className="h-4 w-4 shrink-0 text-accent" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{m.title}</span>
                    <span className="shrink-0 text-xs capitalize text-muted-foreground">{m.status}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {topics.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">All Topics</h2>
          <div className="space-y-2">
            {topics.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{t.name}</span>
                    <span className="text-sm font-bold text-foreground">{t.mastery}%</span>
                  </div>
                  <ProgressBar value={t.mastery} className="mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
