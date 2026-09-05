"use client";

import { use, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Loader2, RefreshCw, Pencil, Check, Sparkles } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { authedFetch } from "@/lib/api";
import { useStudySubjects } from "@/lib/hooks/study";
import { useExams } from "@/lib/hooks/domain";
import { todayISO, daysBetween, formatCountdown } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { StudyPlan, StudyPlanItem } from "@/lib/study/types";

export default function NewPlanPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const materialId = searchParams.get("material") ?? undefined;

  const { user } = useAuth();
  const { data: subjects } = useStudySubjects(user?.id);
  const { data: exams } = useExams(user?.id);

  const subject = subjects.find((s) => s.id === subjectId);
  const today = todayISO();
  const upcomingExams = useMemo(
    () => exams.filter((e) => e.study_subject_id === subjectId && daysBetween(today, e.exam_date) >= 0),
    [exams, subjectId, today]
  );

  const [examId, setExamId] = useState<string | "none">(upcomingExams[0]?.id ?? "none");
  const [daysAvailable, setDaysAvailable] = useState(5);
  const [minutesPerDay, setMinutesPerDay] = useState(30);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [items, setItems] = useState<StudyPlanItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const grouped = useMemo(() => {
    const byDay = new Map<number, StudyPlanItem[]>();
    for (const item of items) {
      const list = byDay.get(item.day_index) ?? [];
      list.push(item);
      byDay.set(item.day_index, list);
    }
    return [...byDay.entries()].sort((a, b) => a[0] - b[0]);
  }, [items]);

  async function generate() {
    if (!user || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await authedFetch("/api/study/generate-plan", {
        method: "POST",
        body: JSON.stringify({
          subjectId,
          examId: examId !== "none" ? examId : undefined,
          materialId,
          daysAvailable,
          minutesPerDay,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't generate a plan.");
      setPlan(json.plan as StudyPlan);
      setItems(json.items as StudyPlanItem[]);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate a plan.");
    } finally {
      setGenerating(false);
    }
  }

  async function regenerate() {
    if (!supabase || !plan) return;
    setGenerating(true);
    setError(null);
    // Discard the previous unaccepted plan — its items cascade-delete with it.
    await supabase.from("study_plans").delete().eq("id", plan.id).eq("accepted", false);
    setPlan(null);
    setItems([]);
    await generate();
  }

  function updateItem(id: string, patch: Partial<Pick<StudyPlanItem, "label" | "duration_min">>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function acceptPlan() {
    if (!supabase || !plan || accepting) return;
    const db = supabase;
    setAccepting(true);
    try {
      // Persist any inline edits made before acceptance.
      await Promise.all(
        items.map((it) => db.from("study_plan_items").update({ label: it.label, duration_min: it.duration_min }).eq("id", it.id))
      );
      await db.from("study_plans").update({ accepted: true }).eq("id", plan.id);
      router.push(`/app/school/subjects/${subjectId}/plan/${plan.id}`);
    } finally {
      setAccepting(false);
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
        <h1 className="text-xl font-extrabold text-foreground">New Study Plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">A personalized day-by-day plan, weighted toward your weakest topics.</p>
      </div>

      {!plan && (
        <Card>
          <CardContent className="space-y-4 p-4">
            {upcomingExams.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Target an exam</p>
                <div className="space-y-2">
                  {upcomingExams.map((exam) => (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => setExamId(exam.id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors ${
                        examId === exam.id ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-foreground"
                      }`}
                    >
                      <span className="font-medium">{exam.title}</span>
                      <span className="text-xs font-semibold">{formatCountdown(exam.exam_date)}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setExamId("none")}
                    className={`flex w-full items-center rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors ${
                      examId === "none" ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-foreground"
                    }`}
                  >
                    No specific exam, set my own timeframe
                  </button>
                </div>
              </div>
            )}

            {examId === "none" && (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Days available</label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={daysAvailable}
                  onChange={(e) => setDaysAvailable(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Minutes per day</label>
              <Input
                type="number"
                min={10}
                max={240}
                step={5}
                value={minutesPerDay}
                onChange={(e) => setMinutesPerDay(Math.max(10, Math.min(240, Number(e.target.value) || 10)))}
              />
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <Button size="lg" className="w-full" onClick={generate} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate Plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {plan && (
        <div className="space-y-4">
          <div className="space-y-2.5">
            {grouped.map(([day, dayItems]) => (
              <Card key={day}>
                <CardContent className="p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent">
                    <CalendarClock className="h-3.5 w-3.5" /> Day {day}
                  </p>
                  <div className="space-y-2.5">
                    {dayItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        {editing ? (
                          <>
                            <Input
                              value={item.label}
                              onChange={(e) => updateItem(item.id, { label: e.target.value })}
                              className="h-10 min-w-0 flex-1"
                            />
                            <Input
                              type="number"
                              min={5}
                              max={240}
                              value={item.duration_min}
                              onChange={(e) => updateItem(item.id, { duration_min: Math.max(5, Math.min(240, Number(e.target.value) || 5)) })}
                              className="h-10 w-20 shrink-0 text-center"
                            />
                          </>
                        ) : (
                          <>
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{item.label}</span>
                            <span className="shrink-0 text-sm font-bold text-muted-foreground">{item.duration_min} min</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="grid grid-cols-3 gap-2">
            <Button size="lg" onClick={acceptPlan} disabled={accepting || generating}>
              {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Accept
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setEditing((e) => !e)} disabled={generating}>
              <Pencil className="h-4 w-4" />
              {editing ? "Done" : "Edit"}
            </Button>
            <Button size="lg" variant="secondary" onClick={regenerate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Redo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
