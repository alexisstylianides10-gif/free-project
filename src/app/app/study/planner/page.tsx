"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ListChecks, Sparkles } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/ui/FadeIn";
import { EmptyState } from "@/components/ui/EmptyState";
import { addDaysISO, formatDayLabel, formatTime12, todayISO } from "@/lib/utils";

export default function StudyPlannerPage() {
  const tasks = useAlxioum((s) => s.tasks);
  const events = useAlxioum((s) => s.events);
  const router = useRouter();

  const today = todayISO();
  const weekEnd = addDaysISO(today, 7);

  const schoolTasks = useMemo(
    () =>
      tasks
        .filter((t) => !t.done && t.category === "school")
        .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")),
    [tasks]
  );

  const upcomingSchoolEvents = useMemo(
    () =>
      events
        .filter((e) => e.type === "study" && e.date >= today && e.date <= weekEnd)
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)),
    [events, today, weekEnd]
  );

  function autoSchedule() {
    const prompt =
      "Help me build a study schedule for this week. Look at my open school tasks and upcoming study events, then propose calendar blocks for the free time I have this week.";
    router.push(`/app/chat?prefill=${encodeURIComponent(prompt)}`);
  }

  return (
    <div className="space-y-4">
      <button
        onClick={autoSchedule}
        className="flex w-full items-center justify-between rounded-xl border border-transparent bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 py-3.5 text-left text-[13.5px] font-medium text-white shadow-card transition-opacity hover:opacity-90"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Auto-schedule with AI
        </span>
        <span aria-hidden>→</span>
      </button>

      <FadeIn index={0}>
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <ListChecks className="h-4 w-4 text-accent" /> School tasks
          </div>
          {schoolTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open school tasks. Add one from Chat or the Tasks page.</p>
          ) : (
            <ul className="space-y-2">
              {schoolTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="min-w-0 truncate text-[13.5px] font-medium text-foreground">{t.title}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    {t.dueDate && <span className="text-[12px] text-muted-foreground">{formatDayLabel(t.dueDate)}</span>}
                    <Badge tone={t.priority === "critical" || t.priority === "high" ? "danger" : "neutral"}>{t.priority}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      </FadeIn>

      <FadeIn index={1}>
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <CalendarClock className="h-4 w-4 text-accent" /> This week&apos;s study blocks
          </div>
          {upcomingSchoolEvents.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Nothing scheduled"
              body="Ask Alxioum to block out study time, or use Auto-schedule with AI above."
            />
          ) : (
            <ul className="space-y-2">
              {upcomingSchoolEvents.map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-foreground">{e.title}</p>
                    <p className="text-[12px] text-muted-foreground">{formatDayLabel(e.date)}</p>
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
      </FadeIn>
    </div>
  );
}
