"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { useStudySubjects, useStudyTopics, useStudyFocusSessions, useStudyQuizzes, useStudyQuizAttempts } from "@/lib/hooks/study";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";

const EMOJI_CHOICES = ["📘", "🔢", "🔬", "🧪", "📖", "🌍", "💻", "🎨", "🗣️", "📜", "⚗️", "🧬"];

export default function SubjectsPage() {
  const { user } = useAuth();
  const { data: subjects, refetch } = useStudySubjects(user?.id);
  const { data: topics } = useStudyTopics(user?.id);
  const { data: focusSessions } = useStudyFocusSessions(user?.id);
  const { data: quizzes } = useStudyQuizzes(user?.id);
  const { data: attempts } = useStudyQuizAttempts(user?.id);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(EMOJI_CHOICES[0]);
  const [saving, setSaving] = useState(false);

  const quizIdToSubject = useMemo(() => new Map(quizzes.map((q) => [q.id, q.subject_id])), [quizzes]);

  const stats = useMemo(() => {
    const map = new Map<string, { progress: number; studyMinutes: number; accuracy: number | null; weak: string[] }>();
    for (const subject of subjects) {
      const subjectTopics = topics.filter((t) => t.subject_id === subject.id);
      const progress = subjectTopics.length ? Math.round(subjectTopics.reduce((s, t) => s + t.mastery, 0) / subjectTopics.length) : 0;
      const studyMinutes = focusSessions.filter((s) => s.subject_id === subject.id).reduce((s, f) => s + f.duration_min, 0);
      const subjectAttempts = attempts.filter((a) => quizIdToSubject.get(a.quiz_id) === subject.id);
      const accuracy = subjectAttempts.length
        ? Math.round(subjectAttempts.reduce((s, a) => s + a.score_percent, 0) / subjectAttempts.length)
        : null;
      const weak = [...subjectTopics]
        .filter((t) => t.mastery < 60)
        .sort((a, b) => a.mastery - b.mastery)
        .slice(0, 2)
        .map((t) => t.name);
      map.set(subject.id, { progress, studyMinutes, accuracy, weak });
    }
    return map;
  }, [subjects, topics, focusSessions, attempts, quizIdToSubject]);

  async function createSubject() {
    if (!user || !supabase || !name.trim() || saving) return;
    setSaving(true);
    const { error } = await supabase.from("study_subjects").insert({ user_id: user.id, name: name.trim(), icon });
    setSaving(false);
    if (!error) {
      setName("");
      setIcon(EMOJI_CHOICES[0]);
      setCreating(false);
      await refetch();
    }
  }

  return (
    <div className="space-y-4">
      {subjects.map((subject) => {
        const s = stats.get(subject.id);
        return (
          <Link key={subject.id} href={`/app/school/subjects/${subject.id}`}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-xl">
                    {subject.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-foreground">{subject.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s?.progress ?? 0}% progress
                      {s?.accuracy !== null && s?.accuracy !== undefined ? ` · ${s.accuracy}% quiz accuracy` : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <ProgressBar value={s?.progress ?? 0} className="mt-3" />
                {s && s.weak.length > 0 && (
                  <p className="mt-2.5 text-xs text-muted-foreground">
                    Weak: <span className="font-medium text-warning">{s.weak.join(", ")}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        );
      })}

      {creating ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Subject name (e.g. Mathematics)"
              className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
            />
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(e)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-base transition-colors ${
                    icon === e ? "bg-gradient-brand" : "bg-muted"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="md" className="flex-1" onClick={createSubject} disabled={!name.trim() || saving}>
                {saving ? "Creating…" : "Create Subject"}
              </Button>
              <Button size="md" variant="secondary" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-5 text-sm font-semibold text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          New Subject
        </button>
      )}
    </div>
  );
}
