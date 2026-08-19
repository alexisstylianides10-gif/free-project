"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, MapPin, CheckCircle2, Circle, ClipboardCheck, GraduationCap, BookOpen, Sparkles } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useHomework, useExams, useTimetable, useStudySessions } from "@/lib/hooks/domain";
import { supabase } from "@/lib/supabase/client";
import { awardXP } from "@/lib/actions/xp";
import { awardAchievementOnce } from "@/lib/actions/achievements";
import { formatCountdown, formatTime12, mondayOfThisWeek, todayISO, cn } from "@/lib/utils";
import type { Homework, StudySession } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { ScreenHeader } from "@/components/shared/ScreenHeader";

const HOMEWORK_XP: Record<Homework["priority"], number> = { high: 15, medium: 10, low: 8 };

const STUDY_PLAN_DAYS = [
  { day: 1, label: "Monday" },
  { day: 2, label: "Tuesday" },
  { day: 3, label: "Wednesday" },
  { day: 4, label: "Thursday" },
  { day: 5, label: "Friday" },
];

export default function SchoolPage() {
  const { user, profile, refreshProfile } = useAuth();
  const today = todayISO();
  const todayDow = new Date(today + "T00:00:00").getDay();

  const { data: timetable, loading: timetableLoading } = useTimetable(user?.id);
  const { data: homework, loading: homeworkLoading, refetch: refetchHomework } = useHomework(user?.id);
  const { data: exams, loading: examsLoading } = useExams(user?.id);
  const { data: studySessions, loading: studyLoading, refetch: refetchStudy } = useStudySessions(user?.id, mondayOfThisWeek());

  const [busyHomeworkId, setBusyHomeworkId] = useState<string | null>(null);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);

  const todayTimetable = useMemo(
    () => timetable.filter((t) => t.day_of_week === todayDow).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [timetable, todayDow]
  );

  const sortedHomework = useMemo(
    () =>
      [...homework].sort((a, b) => {
        if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
        return a.due_date.localeCompare(b.due_date);
      }),
    [homework]
  );

  const sortedExams = useMemo(() => [...exams].sort((a, b) => a.exam_date.localeCompare(b.exam_date)), [exams]);

  const studyByDay = useMemo(() => {
    const map = new Map<number, StudySession[]>();
    for (const s of studySessions) {
      const list = map.get(s.day_of_week) ?? [];
      list.push(s);
      map.set(s.day_of_week, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.subject.localeCompare(b.subject));
    return map;
  }, [studySessions]);

  async function toggleHomework(hw: Homework) {
    if (!user || !profile || !supabase || busyHomeworkId) return;
    setBusyHomeworkId(hw.id);
    try {
      const nextStatus = hw.status === "pending" ? "completed" : "pending";
      await supabase.from("homework").update({ status: nextStatus }).eq("id", hw.id);
      if (nextStatus === "completed") {
        await awardXP(supabase, user.id, profile, { xp_school: HOMEWORK_XP[hw.priority] });
      }
      await Promise.all([refreshProfile(), refetchHomework()]);
    } finally {
      setBusyHomeworkId(null);
    }
  }

  async function completeStudySession(session: StudySession) {
    if (!user || !profile || !supabase || session.completed || busySessionId) return;
    setBusySessionId(session.id);
    try {
      await supabase.from("study_sessions").update({ completed: true }).eq("id", session.id);
      await awardXP(supabase, user.id, profile, { xp_school: 15 });

      const { count } = await supabase
        .from("study_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("completed", true);

      if (count === 1) await awardAchievementOnce(supabase, user.id, "first_study_session");
      if (count === 10) await awardAchievementOnce(supabase, user.id, "study_sessions_10");

      await Promise.all([refreshProfile(), refetchStudy()]);
    } finally {
      setBusySessionId(null);
    }
  }

  return (
    <div className="space-y-7 pb-4 animate-fade-in">
      <ScreenHeader title="My School" subtitle="Class, homework and exams — all in one place." />

      {/* Today's classes */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-school" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Today&rsquo;s Classes</h2>
        </div>
        {!timetableLoading && todayTimetable.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No classes today — enjoy the break, or get ahead on your study plan below.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {todayTimetable.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="w-24 shrink-0 text-xs font-semibold text-muted-foreground">
                    {formatTime12(entry.start_time)} – {formatTime12(entry.end_time)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{entry.subject}</span>
                  {entry.room && (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {entry.room}
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Homework */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Homework</h2>
        </div>
        {!homeworkLoading && sortedHomework.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Nothing set right now. Nice and clear.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sortedHomework.map((hw) => {
              const isCompleted = hw.status === "completed";
              return (
                <Card key={hw.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <button
                      type="button"
                      aria-label={isCompleted ? "Mark as pending" : "Mark as complete"}
                      onClick={() => toggleHomework(hw)}
                      disabled={busyHomeworkId === hw.id}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-success disabled:opacity-40"
                    >
                      {isCompleted ? <CheckCircle2 className="h-6 w-6 text-success" /> : <Circle className="h-6 w-6" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-semibold text-foreground", isCompleted && "text-muted-foreground line-through")}>
                        {hw.subject}: {hw.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{isCompleted ? "Completed" : formatCountdown(hw.due_date)}</p>
                    </div>
                    {!isCompleted && <PriorityBadge priority={hw.priority} />}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Exams */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-school" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Exams</h2>
        </div>
        {!examsLoading && sortedExams.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">No exams on the horizon yet.</CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sortedExams.map((exam) => (
              <Card key={exam.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{exam.subject} Exam</p>
                    {exam.title !== exam.subject && <p className="truncate text-xs text-muted-foreground">{exam.title}</p>}
                  </div>
                  <span className="shrink-0 text-sm font-bold text-accent">{formatCountdown(exam.exam_date)}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* AI Study Plan */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">AI Study Plan</h2>
        </div>
        {!studyLoading && studySessions.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No study plan for this week yet. Ask Future Coach to help you build one.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {STUDY_PLAN_DAYS.filter((d) => studyByDay.has(d.day)).map(({ day, label }) => (
              <Card key={day}>
                <CardContent className="p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
                  <div className="mt-2.5 space-y-2">
                    {studyByDay.get(day)!.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => completeStudySession(session)}
                        disabled={session.completed || busySessionId === session.id}
                        className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-left transition-colors disabled:cursor-default hover:enabled:border-border-strong"
                      >
                        {session.completed ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                        ) : (
                          <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                        )}
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-sm font-medium text-foreground",
                            session.completed && "text-muted-foreground line-through"
                          )}
                        >
                          {session.subject}
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-muted-foreground">{session.duration_min} min</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Link href="/app/coach">
        <Button variant="secondary" size="lg" className="w-full">
          <Sparkles className="h-4 w-4" />
          Ask AI about this subject
        </Button>
      </Link>
    </div>
  );
}
