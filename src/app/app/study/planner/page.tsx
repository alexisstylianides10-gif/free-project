"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, GraduationCap, ListChecks, Plus, Sparkles } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/ui/FadeIn";
import { EmptyState } from "@/components/ui/EmptyState";
import { addDaysISO, formatDayLabel, formatTime12, todayISO } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

export default function StudyPlannerPage() {
  const tasks = useAlxioum((s) => s.tasks);
  const events = useAlxioum((s) => s.events);
  const addEvent = useAlxioum((s) => s.addEvent);
  const router = useRouter();

  const [examSubject, setExamSubject] = useState("");
  const [examDate, setExamDate] = useState("");
  const [addingExam, setAddingExam] = useState(false);

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

  const upcomingExams = useMemo(
    () =>
      events
        .filter((e) => e.type === "school" && e.title.startsWith("Exam:") && e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6),
    [events, today]
  );

  async function addExam(e: React.FormEvent) {
    e.preventDefault();
    if (!examSubject.trim() || !examDate || addingExam) return;
    setAddingExam(true);
    await addEvent({ title: `Exam: ${examSubject.trim()}`, date: examDate, startTime: "09:00", endTime: "11:00", type: "school" });
    setExamSubject("");
    setExamDate("");
    setAddingExam(false);
  }

  function autoSchedule() {
    const prompt =
      "Help me build a study schedule for this week. Look at my open school tasks and upcoming study events, then propose calendar blocks for the free time I have this week.";
    router.push(`/app/chat?prefill=${encodeURIComponent(prompt)}`);
  }

  return (
    <div className="space-y-4">
      <button
        onClick={autoSchedule}
        className="flex w-full items-center justify-between rounded-xl border border-transparent bg-accent px-4 py-3.5 text-left text-[13.5px] font-medium text-accent-foreground transition-opacity hover:opacity-90"
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
            <GraduationCap className="h-4 w-4 text-accent" /> Upcoming exams
          </div>
          <form onSubmit={addExam} className="flex flex-wrap gap-2">
            <input
              className={`${inputClass} min-w-[160px] flex-1`}
              placeholder="Subject, e.g. Chemistry"
              value={examSubject}
              onChange={(e) => setExamSubject(e.target.value)}
            />
            <input type="date" className={`${inputClass} w-40`} value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            <Button type="submit" size="sm" disabled={!examSubject.trim() || !examDate || addingExam}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </form>
          {upcomingExams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No exams added yet.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingExams.map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="min-w-0 truncate text-[13.5px] font-medium text-foreground">{e.title.replace(/^Exam:\s*/, "")}</span>
                  <span className="shrink-0 text-[12.5px] text-muted-foreground">{formatDayLabel(e.date)}</span>
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

      <FadeIn index={2}>
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
