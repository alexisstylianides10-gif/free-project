"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, ListTodo, Target, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAlxioum } from "@/lib/store";
import { formatDayLabel, todayISO } from "@/lib/utils";

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function WeeklyReviewPage() {
  const events = useAlxioum((s) => s.events);
  const tasks = useAlxioum((s) => s.tasks);
  const goals = useAlxioum((s) => s.goals);

  const stats = useMemo(() => {
    const today = todayISO();
    const weekStart = addDaysISO(today, -6);
    const nextWeekEnd = addDaysISO(today, 7);

    const eventsThisWeek = events.filter((e) => e.date >= weekStart && e.date <= today).length;
    const tasksCompleted = tasks.filter((t) => t.done && t.completedAt && t.completedAt.slice(0, 10) >= weekStart).length;
    const tasksRemaining = tasks.filter((t) => !t.done && t.dueDate && t.dueDate >= weekStart && t.dueDate <= today).length;
    const upcomingDeadlines = tasks
      .filter((t) => !t.done && t.dueDate && t.dueDate >= today && t.dueDate <= nextWeekEnd)
      .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
    const activeGoals = goals.filter((g) => !g.completed);

    return { eventsThisWeek, tasksCompleted, tasksRemaining, upcomingDeadlines, activeGoals };
  }, [events, tasks, goals]);

  const tiles = [
    { label: "Events", value: stats.eventsThisWeek, icon: CalendarDays },
    { label: "Tasks completed", value: stats.tasksCompleted, icon: CheckCircle2 },
    { label: "Tasks remaining", value: stats.tasksRemaining, icon: ListTodo },
    { label: "Deadlines upcoming", value: stats.upcomingDeadlines.length, icon: Target },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[24px] font-medium tracking-tight text-foreground">Your week</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">The last 7 days, and what&apos;s coming up.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
              <tile.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-[26px] font-semibold tabular-nums tracking-tight text-foreground">{tile.value}</span>
              <span className="text-[11.5px] text-muted-foreground">{tile.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Your biggest priorities</h2>
        {stats.upcomingDeadlines.length === 0 && stats.activeGoals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing pressing — enjoy the breathing room.</p>
        ) : (
          <div className="space-y-2">
            {stats.upcomingDeadlines.slice(0, 5).map((t) => (
              <Card key={t.id}>
                <CardContent className="flex items-center justify-between gap-3 p-3.5">
                  <span className="text-[13.5px] text-foreground">{t.title}</span>
                  <span className="shrink-0 text-[12px] text-muted-foreground">Due {formatDayLabel(t.dueDate!)}</span>
                </CardContent>
              </Card>
            ))}
            {stats.activeGoals.slice(0, 3).map((g) => (
              <Card key={g.id}>
                <CardContent className="flex items-center justify-between gap-3 p-3.5">
                  <span className="text-[13.5px] text-foreground">{g.name}</span>
                  <span className="shrink-0 text-[12px] text-muted-foreground">{g.progress}% toward goal</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <p className="mt-2 text-[12px] text-muted-foreground">These are what&apos;s on your calendar and tracked as goals — Alxioum doesn&apos;t guess at what matters most to you beyond that.</p>
      </div>

      <Link href="/app/chat?prefill=Help%20me%20plan%20next%20week">
        <Button variant="secondary">
          Plan next week with Alxioum <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
