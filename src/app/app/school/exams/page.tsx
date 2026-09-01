"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Sparkles, Plus, Trash2, Pencil, TriangleAlert } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useExams } from "@/lib/hooks/domain";
import { useStudySubjects, useStudyTopics } from "@/lib/hooks/study";
import { subjectReadiness } from "@/lib/study/recommendation";
import { supabase } from "@/lib/supabase/client";
import { formatCountdown, todayISO } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";

export default function ExamsPage() {
  const { user } = useAuth();
  const { data: exams, error, refetch } = useExams(user?.id);
  const { data: subjects } = useStudySubjects(user?.id);
  const { data: topics } = useStudyTopics(user?.id);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState("");
  const [newDate, setNewDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState("");
  const [savingDate, setSavingDate] = useState(false);

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

  async function addExam(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user || !newSubject.trim() || !newDate || adding) return;
    setAdding(true);
    try {
      await supabase.from("exams").insert({
        user_id: user.id,
        subject: newSubject.trim(),
        title: newSubject.trim(),
        exam_date: newDate,
      });
      setNewSubject("");
      setNewDate("");
      await refetch();
    } finally {
      setAdding(false);
    }
  }

  async function deleteExam(examId: string) {
    // Matches the confirm-then-delete pattern already used for study
    // subjects/materials (see subjects/[subjectId]/page.tsx deleteSubject) —
    // this is a seeded item deleted permanently, so a browser confirm is
    // the right amount of friction, not a full modal.
    if (!supabase || deletingId) return;
    if (!confirm("Delete this exam? This can't be undone.")) return;
    setDeletingId(examId);
    try {
      await supabase.from("exams").delete().eq("id", examId);
      await refetch();
    } finally {
      setDeletingId(null);
    }
  }

  function startEditDate(examId: string, currentDate: string) {
    setEditingDateId(examId);
    setEditDateValue(currentDate);
  }

  async function saveExamDate(examId: string) {
    if (!supabase || !editDateValue || savingDate) return;
    setSavingDate(true);
    try {
      await supabase.from("exams").update({ exam_date: editDateValue }).eq("id", examId);
      setEditingDateId(null);
      await refetch();
    } finally {
      setSavingDate(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={addExam} className="space-y-2">
        <input
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
          placeholder="Add an exam (e.g. Biology)…"
          className="h-11 w-full rounded-full border border-border bg-surface px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            aria-label="Exam date"
            required
            min={todayISO()}
            className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground outline-none focus:border-accent/60"
          />
          <button
            type="submit"
            disabled={adding || !newSubject.trim() || !newDate}
            aria-label="Add exam"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-white shadow-glow-accent transition-opacity disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </form>

      {error && (
        <Card className="border border-danger/40">
          <CardContent className="flex items-start gap-2.5 p-4 text-sm text-danger">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Couldn&rsquo;t load your exams. {error}</span>
          </CardContent>
        </Card>
      )}

      {sortedExams.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No exams on the horizon yet" subtitle="Add an exam above to start tracking your countdown." />
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
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-lg font-extrabold text-accent">{formatCountdown(exam.exam_date)}</span>
                    <button
                      type="button"
                      aria-label="Edit exam date"
                      onClick={() => startEditDate(exam.id, exam.exam_date)}
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-accent"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete exam"
                      onClick={() => deleteExam(exam.id)}
                      disabled={deletingId === exam.id}
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-danger disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {editingDateId === exam.id && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="date"
                      value={editDateValue}
                      onChange={(e) => setEditDateValue(e.target.value)}
                      aria-label="New exam date"
                      className="h-9 flex-1 rounded-full border border-border bg-surface px-3 text-xs text-foreground outline-none focus:border-accent/60"
                    />
                    <Button size="sm" onClick={() => saveExamDate(exam.id)} disabled={!editDateValue || savingDate}>
                      Save
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingDateId(null)}>
                      Cancel
                    </Button>
                  </div>
                )}

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
