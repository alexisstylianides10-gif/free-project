"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Sparkles } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useExams } from "@/lib/hooks/domain";
import { useStudySubjects, useStudyTopics } from "@/lib/hooks/study";
import { subjectReadiness } from "@/lib/study/recommendation";
import { supabase } from "@/lib/supabase/client";
import { formatCountdown } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";

export default function ExamsPage() {
  const { user } = useAuth();
  const { data: exams, refetch } = useExams(user?.id);
  const { data: subjects } = useStudySubjects(user?.id);
  const { data: topics } = useStudyTopics(user?.id);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const sortedExams = useMemo(() => [...exams].sort((a, b) => a.exam_date.localeCompare(b.exam_date)), [exams]);

  async function linkSubject(examId: string, subjectId: string) {
    if (!supabase) return;
    await supabase
      .from("exams")
      .update({ study_subject_id: subjectId || null })
      .eq("id", examId);
    await refetch();
    setLinkingId(null);
  }

  return (
    <div className="space-y-5">
      {sortedExams.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No exams on the horizon yet" subtitle="Add an exam to start tracking your countdown." />
      ) : (
        sortedExams.map((exam) => {
          const readiness = exam.study_subject_id ? subjectReadiness(topics.filter((t) => t.subject_id === exam.study_subject_id)) : null;
          const linkedSubject = subjects.find((s) => s.id === exam.study_subject_id);
          return (
            <Card key={exam.id}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-foreground">{exam.subject} Exam</p>
                    {exam.title !== exam.subject && <p className="truncate text-xs text-muted-foreground">{exam.title}</p>}
                  </div>
                  <span className="shrink-0 text-lg font-extrabold text-accent">{formatCountdown(exam.exam_date)}</span>
                </div>

                {readiness !== null ? (
                  <>
                    <ProgressBar value={readiness} className="mt-3" />
                    <p className="mt-1.5 text-xs text-muted-foreground">{readiness}% ready</p>
                  </>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">Link a subject to track your readiness.</p>
                )}

                <div className="mt-4 flex items-center gap-2">
                  {linkedSubject ? (
                    <Link href={`/app/school/subjects/${linkedSubject.id}`} className="flex-1">
                      <Button size="sm" className="w-full">
                        <Sparkles className="h-3.5 w-3.5" />
                        Study for this
                      </Button>
                    </Link>
                  ) : linkingId === exam.id ? (
                    <select
                      autoFocus
                      onBlur={() => setLinkingId(null)}
                      onChange={(e) => linkSubject(exam.id, e.target.value)}
                      className="h-9 flex-1 rounded-full border border-border bg-surface px-3 text-xs text-foreground outline-none"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Choose a subject…
                      </option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.icon} {s.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => setLinkingId(exam.id)}>
                      Link a subject
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
