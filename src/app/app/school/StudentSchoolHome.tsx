"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, MapPin, CheckCircle2, Circle, ClipboardCheck, BookOpen, Sparkles, Flame, Clock, Layers, Plus, Trash2, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/components/providers/AuthProvider";
import { useHomework, useExams, useTimetable, useStudySessions } from "@/lib/hooks/domain";
import { useStudySubjects, useStudyTopics, useStudyFocusSessions, useStudyFlashcards } from "@/lib/hooks/study";
import { supabase } from "@/lib/supabase/client";
import { awardXP } from "@/lib/actions/xp";
import { awardAchievementOnce } from "@/lib/actions/achievements";
import { weakestTopic, todaysStudyMinutes, subjectReadiness, buildStudyRecommendation } from "@/lib/study/recommendation";
import { formatCountdown, formatTime12, mondayOfThisWeek, todayISO, cn } from "@/lib/utils";
import type { StudySession } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";

const STUDY_PLAN_DAYS = [
  { day: 1, label: "Monday" },
  { day: 2, label: "Tuesday" },
  { day: 3, label: "Wednesday" },
  { day: 4, label: "Thursday" },
  { day: 5, label: "Friday" },
];

// 0 = Sunday .. 6 = Saturday, matching timetable_entries.day_of_week — listed
// Monday-first to match STUDY_PLAN_DAYS/most school-week conventions.
const DAY_OF_WEEK_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

export default function StudentSchoolHome() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const today = todayISO();
  const todayDow = new Date(today + "T00:00:00").getDay();

  const { data: timetable, loading: timetableLoading, error: timetableError, refetch: refetchTimetable } = useTimetable(user?.id);
  const { data: homework, error: homeworkError } = useHomework(user?.id);
  const { data: exams, error: examsError } = useExams(user?.id);
  const { data: studySessions, loading: studyLoading, error: studyError, refetch: refetchStudy } = useStudySessions(user?.id, mondayOfThisWeek());
  const { data: subjects, error: subjectsError } = useStudySubjects(user?.id);
  const { data: topics, error: topicsError } = useStudyTopics(user?.id);
  const { data: focusSessions, error: focusError } = useStudyFocusSessions(user?.id);
  const { data: flashcards, error: flashcardsError } = useStudyFlashcards(user?.id);

  // First non-null error wins — this page reads through 8 tables via
  // useTableRows; surfacing all of them at once would be noisy, and a
  // failure on any one of them is equally worth flagging to the user.
  const pageError = timetableError ?? homeworkError ?? examsError ?? studyError ?? subjectsError ?? topicsError ?? focusError ?? flashcardsError;

  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [deletingTtId, setDeletingTtId] = useState<string | null>(null);
  const [newTtDay, setNewTtDay] = useState(todayDow);
  const [newTtSubject, setNewTtSubject] = useState("");
  const [newTtStart, setNewTtStart] = useState("");
  const [newTtEnd, setNewTtEnd] = useState("");
  const [newTtRoom, setNewTtRoom] = useState("");
  const [addingTt, setAddingTt] = useState(false);

  const todayTimetable = useMemo(
    () => timetable.filter((t) => t.day_of_week === todayDow).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [timetable, todayDow]
  );

  // Home only ever shows a short preview (pending count + the soonest item)
  // that links out to the full Homework tab — same relationship Exams has
  // to Home (nextExam below). Full add/edit/delete/complete lives there now,
  // not duplicated here.
  const pendingHomework = useMemo(
    () => homework.filter((h) => h.status === "pending").sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [homework]
  );
  const nextHomework = pendingHomework[0];

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

  const nextExam = useMemo(() => [...exams].sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0], [exams]);

  const nextExamReadiness = useMemo(() => {
    if (!nextExam?.study_subject_id) return null;
    return subjectReadiness(topics.filter((t) => t.subject_id === nextExam.study_subject_id));
  }, [nextExam, topics]);

  const globalWeakestTopic = useMemo(() => {
    const weakest = weakestTopic(topics);
    if (!weakest) return null;
    const subject = subjects.find((s) => s.id === weakest.subject_id);
    return { ...weakest, subjectName: subject?.name ?? "" };
  }, [topics, subjects]);

  const flashcardsDueCount = useMemo(() => flashcards.filter((c) => c.due_date <= today).length, [flashcards, today]);

  const recommendation = useMemo(
    () =>
      buildStudyRecommendation({
        upcomingExams: exams.map((e) => ({ ...e, readiness: e.study_subject_id ? subjectReadiness(topics.filter((t) => t.subject_id === e.study_subject_id)) : null })),
        allWeakestTopic: globalWeakestTopic,
        hasAnySubjects: subjects.length > 0,
        flashcardsDueCount,
      }),
    [exams, topics, globalWeakestTopic, subjects.length, flashcardsDueCount]
  );

  const todayMinutes = todaysStudyMinutes(focusSessions);

  async function deleteTimetableEntry(entryId: string) {
    if (!supabase || deletingTtId) return;
    if (!confirm("Delete this class? This can't be undone.")) return;
    setDeletingTtId(entryId);
    try {
      await supabase.from("timetable_entries").delete().eq("id", entryId);
      await refetchTimetable();
    } finally {
      setDeletingTtId(null);
    }
  }

  async function addTimetableEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user || !newTtSubject.trim() || !newTtStart || !newTtEnd || addingTt) return;
    setAddingTt(true);
    try {
      await supabase.from("timetable_entries").insert({
        user_id: user.id,
        day_of_week: newTtDay,
        subject: newTtSubject.trim(),
        start_time: newTtStart,
        end_time: newTtEnd,
        room: newTtRoom.trim() || null,
      });
      setNewTtSubject("");
      setNewTtStart("");
      setNewTtEnd("");
      setNewTtRoom("");
      await refetchTimetable();
    } finally {
      setAddingTt(false);
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

  function startRecommendation() {
    if (recommendation.action === "flashcards") {
      router.push("/app/school/flashcards/review?bucket=due");
    } else if (recommendation.subjectId) {
      const query = recommendation.topicId ? `?topic=${recommendation.topicId}` : "";
      router.push(`/app/school/subjects/${recommendation.subjectId}/session${query}`);
    } else {
      router.push("/app/school/subjects");
    }
  }

  return (
    <div className="space-y-7">
      {pageError && (
        <Card className="border border-danger/40">
          <CardContent className="flex items-start gap-2.5 p-4 text-sm text-danger">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Couldn&rsquo;t load some of your data. {pageError}</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex items-stretch gap-4 p-4">
          <div className="flex-1">
            <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
              <Clock className="h-3 w-3" /> Today
            </p>
            <p className="mt-1 text-lg font-bold text-foreground">{todayMinutes}m studied</p>
          </div>
          <div className="w-px bg-border" />
          <div className="flex-1">
            <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
              <Flame className="h-3 w-3" /> Streak
            </p>
            <p className="mt-1 text-lg font-bold text-foreground">{profile?.streak_count ?? 0} days</p>
          </div>
          {flashcardsDueCount > 0 && (
            <>
              <div className="w-px bg-border" />
              <Link href="/app/school/flashcards/review?bucket=due" className="flex-1">
                <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                  <Layers className="h-3 w-3" /> Due
                </p>
                <p className="mt-1 text-lg font-bold text-foreground">{flashcardsDueCount} cards</p>
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      {nextExam && (
        <Link href="/app/school/exams">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{nextExam.subject} Exam</p>
              <p className="mt-1 text-2xl font-extrabold text-foreground">{formatCountdown(nextExam.exam_date)}</p>
              {nextExamReadiness !== null && (
                <>
                  <ProgressBar value={nextExamReadiness} className="mt-3" />
                  <p className="mt-1.5 text-xs text-muted-foreground">{nextExamReadiness}% ready</p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>
      )}

      <Card className="border-accent/30">
        <CardContent className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Today&rsquo;s recommendation</p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{recommendation.text}</p>
          <Button size="md" className="mt-4" onClick={startRecommendation}>
            Start Study
          </Button>
        </CardContent>
      </Card>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-school" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Today&rsquo;s Classes</h2>
        </div>
        {!timetableLoading && todayTimetable.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No classes today" subtitle="Nothing on your timetable for today." />
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
                  <button
                    type="button"
                    aria-label="Delete class"
                    onClick={() => deleteTimetableEntry(entry.id)}
                    disabled={deletingTtId === entry.id}
                    className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-danger disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <form onSubmit={addTimetableEntry} className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <select
              value={newTtDay}
              onChange={(e) => setNewTtDay(Number(e.target.value))}
              aria-label="Day"
              className="h-11 shrink-0 rounded-full border border-border bg-surface px-3 text-xs font-medium text-foreground outline-none"
            >
              {DAY_OF_WEEK_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <input
              value={newTtSubject}
              onChange={(e) => setNewTtSubject(e.target.value)}
              placeholder="Add a class (e.g. Biology)…"
              className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={newTtStart}
              onChange={(e) => setNewTtStart(e.target.value)}
              aria-label="Start time"
              required
              className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground outline-none focus:border-accent/60"
            />
            <input
              type="time"
              value={newTtEnd}
              onChange={(e) => setNewTtEnd(e.target.value)}
              aria-label="End time"
              required
              className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground outline-none focus:border-accent/60"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              value={newTtRoom}
              onChange={(e) => setNewTtRoom(e.target.value)}
              placeholder="Room (optional)…"
              className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
            />
            <button
              type="submit"
              disabled={addingTt || !newTtSubject.trim() || !newTtStart || !newTtEnd}
              aria-label="Add class"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-white shadow-glow-accent transition-opacity disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </form>
      </section>

      <Link href="/app/school/homework">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-accent" />
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Homework</p>
            </div>
            {nextHomework ? (
              <>
                <p className="mt-2 text-2xl font-extrabold text-foreground">
                  {pendingHomework.length} pending
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  Next: {nextHomework.subject}: {nextHomework.title} &middot; {formatCountdown(nextHomework.due_date)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">You&rsquo;re all caught up. Tap to add homework.</p>
            )}
          </CardContent>
        </Card>
      </Link>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">This Week&rsquo;s Study Plan</h2>
        </div>
        {!studyLoading && studySessions.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No weekly plan yet"
            subtitle="Build a study plan in Subjects to see it here."
            cta={{ label: "Go to Subjects", href: "/app/school/subjects" }}
          />
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
