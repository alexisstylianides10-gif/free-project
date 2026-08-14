"use client";

import { useMemo } from "react";
import Link from "next/link";
import { startOfWeek } from "date-fns";
import { Flame, Timer, TrendingDown, TrendingUp } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/Card";
import { FadeIn } from "@/components/ui/FadeIn";
import { subjectColorway } from "@/lib/study/colors";
import { dayStreak, subjectDistribution, weeklyDailyMinutes, weekOverWeekChangePct } from "@/lib/study/stats";
import { todayISO } from "@/lib/utils";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StudyOverviewPage() {
  const focusSessions = useAlxioum((s) => s.focusSessions);
  const subjects = useAlxioum((s) => s.subjects);
  const tasks = useAlxioum((s) => s.tasks);

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

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FadeIn index={0}>
        <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/5 border-violet-500/20">
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

        <FadeIn index={1}>
        <Card className="bg-gradient-to-br from-fuchsia-500/10 to-pink-500/5 border-fuchsia-500/20">
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

      <FadeIn index={2}>
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-[13px] font-semibold text-foreground">Focus hours this week</p>
          <div className="flex items-stretch justify-between gap-2" style={{ height: 90 }}>
            {daily.map((m, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-md bg-gradient-to-t from-violet-500 to-fuchsia-500"
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

      <FadeIn index={3}>
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
        <FadeIn index={4}>
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
                <li key={t.id} className="flex items-center justify-between text-[13px]">
                  <span className="truncate text-foreground">{t.title}</span>
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
