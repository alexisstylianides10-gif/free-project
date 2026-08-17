"use client";

import { useMemo } from "react";
import Link from "next/link";
import { startOfWeek } from "date-fns";
import { AlertTriangle, CalendarClock, Flame, ListChecks, Star, Timer, TrendingDown, TrendingUp } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/Card";
import { FadeIn } from "@/components/ui/FadeIn";
import { subjectColorway } from "@/lib/study/colors";
import { dayStreak, subjectDistribution, weeklyDailyMinutes, weekOverWeekChangePct } from "@/lib/study/stats";
import { daysBetween, eventOccursOn, formatTime12, priorityWeight, todayISO } from "@/lib/utils";
import { SchoolCard } from "@/components/study/SchoolCard";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StudyOverviewPage() {
  const focusSessions = useAlxioum((s) => s.focusSessions);
  const subjects = useAlxioum((s) => s.subjects);
  const tasks = useAlxioum((s) => s.tasks);
  const events = useAlxioum((s) => s.events);
  const goals = useAlxioum((s) => s.goals);

  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const { thisWeek, changePct } = useMemo(() => weekOverWeekChangePct(focusSessions), [focusSessions]);
  const streak = useMemo(() => dayStreak(focusSessions), [focusSessions]);
  const distribution = useMemo(() => subjectDistribution(focusSessions, subjects, weekStart), [focusSessions, subjects, weekStart]);
  const daily = useMemo(() => weeklyDailyMinutes(focusSessions, weekStart), [focusSessions, weekStart]);
  const maxDaily = Math.max(1, ...daily);

  const today = todayISO();
  const openSchoolTasks = tasks.filter((t) => !t.done && t.category === "school").slice(0, 5);

  const hours = Math.floor(thisWeek / 60);
  const mins = thisWeek % 60;

  const todaysEvents = useMemo(() => events.filter((e) => eventOccursOn(e, today)).sort((a, b) => a.startTime.localeCompare(b.startTime)), [events, today]);
  const todaysOpenTasks = useMemo(() => tasks.filter((t) => !t.done && t.dueDate === today), [tasks, today]);
  const todaysStudyMinutes = useMemo(
    () => focusSessions.filter((s) => s.completedAt && s.startedAt.slice(0, 10) === today).reduce((sum, s) => sum + s.actualMinutes, 0),
    [focusSessions, today]
  );
  const priorityTask = useMemo(() => {
    const dueOrOverdue = tasks.filter((t) => !t.done && t.dueDate && t.dueDate <= today);
    return [...dueOrOverdue].sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority) || a.dueDate!.localeCompare(b.dueDate!))[0];
  }, [tasks, today]);
  const upcomingDeadline = useMemo(() => {
    const candidates: { label: string; date: string }[] = [];
    for (const t of tasks) {
      if (t.done || !t.dueDate) continue;
      const days = daysBetween(today, t.dueDate);
      if (days > 0 && days <= 3) candidates.push({ label: t.title, date: t.dueDate });
    }
    for (const g of goals) {
      if (g.completed || !g.targetDate) continue;
      const days = daysBetween(today, g.targetDate);
      if (days >= 0 && days <= 3) candidates.push({ label: g.name, date: g.targetDate });
    }
    candidates.sort((a, b) => a.date.localeCompare(b.date));
    return candidates[0] ?? null;
  }, [tasks, goals, today]);

  return (
    <div className="space-y-5">
      <SchoolCard />

      <FadeIn index={0}>
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="text-[13px] font-semibold text-foreground">Today</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[20px] font-semibold text-foreground">{todaysEvents.length}</p>
                <p className="text-[11px] text-muted-foreground">events</p>
              </div>
              <div>
                <p className="text-[20px] font-semibold text-foreground">{todaysOpenTasks.length}</p>
                <p className="text-[11px] text-muted-foreground">tasks</p>
              </div>
              <div>
                <p className="text-[20px] font-semibold text-foreground">
                  {Math.floor(todaysStudyMinutes / 60)}h {todaysStudyMinutes % 60}m
                </p>
                <p className="text-[11px] text-muted-foreground">study</p>
              </div>
            </div>

            {todaysEvents.length > 0 && (
              <ul className="space-y-1">
                {todaysEvents.slice(0, 3).map((e) => (
                  <li key={e.id} className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate text-foreground">{e.title}</span>
                    <span className="ml-auto shrink-0">{formatTime12(e.startTime)}</span>
                  </li>
                ))}
              </ul>
            )}

            {priorityTask && (
              <div className="flex items-start gap-1.5 rounded-lg border border-accent/30 bg-accent-soft/30 px-3 py-2">
                <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Today&apos;s priority</p>
                  <p className="truncate text-[13px] text-foreground">{priorityTask.title}</p>
                </div>
              </div>
            )}

            {upcomingDeadline && (
              <div className="flex items-center gap-1.5 text-[12px] text-warning">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {upcomingDeadline.label} — {daysBetween(today, upcomingDeadline.date) === 0 ? "due today" : `due in ${daysBetween(today, upcomingDeadline.date)}d`}
                </span>
              </div>
            )}

            {todaysEvents.length === 0 && todaysOpenTasks.length === 0 && !priorityTask && (
              <p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5" /> Nothing scheduled for today.
              </p>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FadeIn index={1}>
        <Card className="border-accent/20 bg-accent-soft/40">
          <CardContent className="space-y-1 p-5">
            <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground">
              <Timer className="h-3.5 w-3.5" /> This week
            </div>
            <p className="text-[26px] font-semibold tracking-tight text-foreground">
              {hours}h {mins}m
            </p>
            {changePct !== null && (
              <p className={`flex items-center gap-1 text-[12.5px] ${changePct >= 0 ? "text-success" : "text-danger"}`}>
                {changePct >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {Math.abs(changePct)}% vs last week
              </p>
            )}
          </CardContent>
        </Card>
        </FadeIn>

        <FadeIn index={2}>
        <Card className="border-accent/20 bg-accent-soft/40">
          <CardContent className="space-y-1 p-5">
            <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground">
              <Flame className="h-3.5 w-3.5" /> Day streak
            </div>
            <p className="text-[26px] font-semibold tracking-tight text-foreground">{streak}</p>
            <p className="text-[12.5px] text-muted-foreground">{streak === 0 ? "Start a session today" : "consecutive days"}</p>
          </CardContent>
        </Card>
        </FadeIn>
      </div>

      <FadeIn index={3}>
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-[13px] font-semibold text-foreground">Focus hours this week</p>
          <div className="flex items-stretch justify-between gap-2" style={{ height: 90 }}>
            {daily.map((m, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-md bg-accent"
                    style={{ height: `${Math.max(4, (m / maxDaily) * 100)}%` }}
                  />
                </div>
                <span className="text-[10.5px] text-muted-foreground">{DAY_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </FadeIn>

      <FadeIn index={4}>
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-[13px] font-semibold text-foreground">Subject distribution — this week</p>
          {distribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">No focus sessions logged yet this week.</p>
          ) : (
            <ul className="space-y-2">
              {distribution.map((slice) => (
                <li key={slice.subjectId} className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${subjectColorway(slice.color).dot}`} />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{slice.name}</span>
                  <span className="shrink-0 text-[12.5px] text-muted-foreground">{slice.minutes}m · {slice.pct}%</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      </FadeIn>

      {openSchoolTasks.length > 0 && (
        <FadeIn index={5}>
        <Card>
          <CardContent className="space-y-2.5 p-5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-foreground">Open school tasks</p>
              <Link href="/app/tasks" className="text-[12.5px] font-medium text-accent">
                View all
              </Link>
            </div>
            <ul className="space-y-1.5">
              {openSchoolTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="min-w-0 flex-1 truncate text-foreground">{t.title}</span>
                  <span className="shrink-0 text-muted-foreground">{t.dueDate === today ? "Today" : t.dueDate ?? ""}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        </FadeIn>
      )}
    </div>
  );
}
