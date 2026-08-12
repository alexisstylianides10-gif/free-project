"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Sparkles, Clock, CalendarClock, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAlxioum } from "@/lib/store";
import { useGreeting } from "@/lib/useGreeting";
import { findFreeSlots, nowMinutes } from "@/lib/schedule";
import { daysBetween, formatDayLabel, formatTime12, todayISO } from "@/lib/utils";

export default function TodayPage() {
  const profile = useAlxioum((s) => s.profile);
  const tasks = useAlxioum((s) => s.tasks);
  const events = useAlxioum((s) => s.events);
  const greeting = useGreeting();

  const today = todayISO();
  const todaysEvents = useMemo(() => events.filter((e) => e.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime)), [events, today]);
  const now = nowMinutes();
  const nowHHMM = `${String(Math.floor(now / 60)).padStart(2, "0")}:${String(now % 60).padStart(2, "0")}`;
  const remaining = todaysEvents.filter((e) => e.endTime > nowHHMM);
  const freeSlots = useMemo(() => findFreeSlots(todaysEvents, 30, now).filter((s) => s.minutes >= 30), [todaysEvents, now]);

  const openTasks = tasks.filter((t) => !t.done);
  const dueToday = openTasks.filter((t) => t.dueDate === today);
  const overdue = openTasks.filter((t) => t.dueDate && daysBetween(today, t.dueDate) < 0);
  const upcomingDeadlines = openTasks
    .filter((t) => t.dueDate && daysBetween(today, t.dueDate) > 0 && daysBetween(today, t.dueDate) <= 3)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));

  const tomorrow = events.filter((e) => e.date === (() => {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })());

  const isClear = todaysEvents.length === 0 && dueToday.length === 0 && overdue.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          {greeting}, {profile?.name?.split(" ")[0] ?? "there"}.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {isClear ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Sparkles className="mb-3 h-6 w-6 text-accent" />
            <p className="text-[15px] font-semibold text-foreground">Your day is clear.</p>
            <p className="mt-1 text-sm text-muted-foreground">Nothing scheduled and no open tasks due today.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                <CalendarClock className="h-4 w-4 text-accent" /> Today
              </div>
              {overdue.length > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger">
                  <span>{overdue.length} overdue task{overdue.length > 1 ? "s" : ""}</span>
                  <Link href="/app/tasks" className="font-medium underline underline-offset-2">
                    Review
                  </Link>
                </div>
              )}
              {remaining.length === 0 ? (
                <p className="text-sm text-muted-foreground">No more events today.</p>
              ) : (
                <ul className="space-y-2">
                  {remaining.map((e) => (
                    <li key={e.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium text-foreground">{e.title}</p>
                        {e.location && <p className="truncate text-[12px] text-muted-foreground">{e.location}</p>}
                      </div>
                      <span className="shrink-0 text-[12.5px] text-muted-foreground">
                        {formatTime12(e.startTime)}–{formatTime12(e.endTime)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                <ListChecks className="h-4 w-4 text-accent" /> Tasks
              </div>
              {dueToday.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing due today.</p>
              ) : (
                <ul className="space-y-2">
                  {dueToday.map((t) => (
                    <li key={t.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <span className="truncate text-[13.5px] font-medium text-foreground">{t.title}</span>
                      <Badge tone={t.priority === "critical" || t.priority === "high" ? "danger" : "neutral"}>{t.priority}</Badge>
                    </li>
                  ))}
                </ul>
              )}
              {upcomingDeadlines.length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">Coming up</p>
                  <ul className="space-y-1">
                    {upcomingDeadlines.map((t) => (
                      <li key={t.id} className="flex items-center justify-between text-[13px]">
                        <span className="truncate text-foreground">{t.title}</span>
                        <span className="shrink-0 text-muted-foreground">{formatDayLabel(t.dueDate!)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {freeSlots.length > 0 && (
            <Card className="md:col-span-2">
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                  <Clock className="h-4 w-4 text-accent" /> Free time today
                </div>
                <div className="flex flex-wrap gap-2">
                  {freeSlots.map((s, i) => (
                    <Badge key={i} tone="accent">
                      {formatTime12(s.start)}–{formatTime12(s.end)} ({s.minutes >= 60 ? `${Math.floor(s.minutes / 60)}h ${s.minutes % 60 ? `${s.minutes % 60}m` : ""}`.trim() : `${s.minutes}m`})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {tomorrow.length > 0 && (
            <Card className="md:col-span-2">
              <CardContent className="space-y-2">
                <p className="text-[13px] font-semibold text-foreground">Tomorrow</p>
                <ul className="space-y-1.5">
                  {tomorrow
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .slice(0, 4)
                    .map((e) => (
                      <li key={e.id} className="flex items-center justify-between text-[13px]">
                        <span className="truncate text-foreground">{e.title}</span>
                        <span className="shrink-0 text-muted-foreground">{formatTime12(e.startTime)}</span>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Link
        href="/app/chat"
        className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent-soft/40 px-4 py-3 text-[13.5px] font-medium text-accent transition-colors hover:bg-accent-soft/60"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Tell Alxioum what you need
        </span>
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
