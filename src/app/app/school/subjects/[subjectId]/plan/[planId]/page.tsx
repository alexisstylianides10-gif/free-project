"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { useStudySubjects, useStudyPlanItems } from "@/lib/hooks/study";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { StudyPlanItem } from "@/lib/study/types";

export default function PlanDetailPage({ params }: { params: Promise<{ subjectId: string; planId: string }> }) {
  const { subjectId, planId } = use(params);
  const { user } = useAuth();
  const { data: subjects } = useStudySubjects(user?.id);
  const { data: items, refetch } = useStudyPlanItems(user?.id, planId);

  const subject = subjects.find((s) => s.id === subjectId);
  const [busyId, setBusyId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const byDay = new Map<number, StudyPlanItem[]>();
    for (const item of items) {
      const list = byDay.get(item.day_index) ?? [];
      list.push(item);
      byDay.set(item.day_index, list);
    }
    return [...byDay.entries()].sort((a, b) => a[0] - b[0]);
  }, [items]);

  const completedCount = items.filter((i) => i.completed).length;
  const progress = items.length ? Math.round((completedCount / items.length) * 100) : 0;

  async function toggleComplete(item: StudyPlanItem) {
    if (!supabase || busyId) return;
    setBusyId(item.id);
    try {
      await supabase.from("study_plan_items").update({ completed: !item.completed }).eq("id", item.id);
      await refetch();
    } finally {
      setBusyId(null);
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
        <h1 className="text-xl font-extrabold text-foreground">Study Plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {completedCount}/{items.length} days done
        </p>
        <ProgressBar value={progress} className="mt-2.5" />
      </div>

      <div className="space-y-2.5">
        {grouped.map(([day, dayItems]) => (
          <Card key={day}>
            <CardContent className="p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent">
                <CalendarClock className="h-3.5 w-3.5" /> Day {day}
              </p>
              <div className="space-y-1.5">
                {dayItems.map((item) => {
                  const canStudy = !!item.topic_id && !item.completed;
                  const row = (
                    <div className="flex items-center gap-3 rounded-xl px-1 py-2">
                      <button
                        type="button"
                        aria-label={item.completed ? "Mark as not done" : "Mark as done"}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleComplete(item);
                        }}
                        disabled={busyId === item.id}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-success disabled:opacity-40"
                      >
                        {item.completed ? <CheckCircle2 className="h-6 w-6 text-success" /> : <Circle className="h-6 w-6" />}
                      </button>
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-sm font-semibold text-foreground",
                          item.completed && "text-muted-foreground line-through"
                        )}
                      >
                        {item.label}
                      </span>
                      <span className="shrink-0 text-xs font-bold text-muted-foreground">{item.duration_min} min</span>
                      {canStudy && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    </div>
                  );
                  return canStudy ? (
                    <Link key={item.id} href={`/app/school/subjects/${subjectId}/session?topic=${item.topic_id}&plan_item=${item.id}`}>
                      {row}
                    </Link>
                  ) : (
                    <div key={item.id}>{row}</div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
