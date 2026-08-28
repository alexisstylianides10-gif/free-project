"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Target } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  useHomework,
  useExams,
  useStudySessions,
  useUserMissions,
  useCareerPaths,
  useUserSkills,
  useBusinessMilestones,
  useBusinessExpenses,
} from "@/lib/hooks/domain";
import { getCareer } from "@/lib/catalog/careers";
import { skillLabel } from "@/lib/catalog/skills";
import { supabase } from "@/lib/supabase/client";
import { mondayOfThisWeek, addDaysISO, daysBetween, todayISO } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { EmptyState } from "@/components/shared/EmptyState";

function formatStudyTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(addDaysISO(weekStart, 6) + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

export default function WeeklyReviewPage() {
  const { user, profile } = useAuth();
  const weekStart = mondayOfThisWeek();

  const isBusiness = profile?.track === "business";

  const { data: homework, loading: homeworkLoading } = useHomework(user?.id);
  const { data: exams, loading: examsLoading } = useExams(user?.id);
  const { data: studySessions, loading: studySessionsLoading } = useStudySessions(user?.id, weekStart);
  const { data: userMissions, loading: userMissionsLoading } = useUserMissions(user?.id);
  const { data: careerPaths, loading: careerPathsLoading } = useCareerPaths(user?.id);
  const { data: userSkills, loading: userSkillsLoading } = useUserSkills(user?.id);
  const { data: milestones, loading: milestonesLoading } = useBusinessMilestones(user?.id);
  const { data: expenses, loading: expensesLoading } = useBusinessExpenses(user?.id);

  const allLoaded =
    !homeworkLoading &&
    !examsLoading &&
    !studySessionsLoading &&
    !userMissionsLoading &&
    !careerPathsLoading &&
    !userSkillsLoading &&
    !milestonesLoading &&
    !expensesLoading;

  const [primaryCompletedCount, setPrimaryCompletedCount] = useState<number | null>(null);
  const savedForUser = useRef<string | null>(null);

  const primaryCareer = useMemo(() => {
    const primary = careerPaths.find((c) => c.is_primary) ?? careerPaths[0];
    return primary ? getCareer(primary.career_slug) : undefined;
  }, [careerPaths]);

  const studyMinutes = useMemo(
    () => studySessions.filter((s) => s.completed).reduce((sum, s) => sum + s.duration_min, 0),
    [studySessions]
  );

  const expensesThisWeek = useMemo(() => {
    const weekEnd = addDaysISO(weekStart, 6);
    return expenses
      .filter((e) => e.logged_date >= weekStart && e.logged_date <= weekEnd)
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses, weekStart]);

  const missionsCompleted = useMemo(() => {
    const weekEnd = addDaysISO(weekStart, 6);
    return userMissions.filter((m) => {
      if (m.status !== "completed" || !m.completed_at) return false;
      const completedDate = m.completed_at.slice(0, 10);
      return completedDate >= weekStart && completedDate <= weekEnd;
    }).length;
  }, [userMissions, weekStart]);

  const consistencyDays = Math.min(profile?.streak_count ?? 0, 7);

  const skillDeltas = useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of userSkills) {
      if (s.proficiency > 15) out[s.skill_key] = s.proficiency;
    }
    return out;
  }, [userSkills]);

  const nextFocus = useMemo(() => {
    const items: string[] = [];
    const today = todayISO();

    if (isBusiness) {
      const upcomingMilestone = [...milestones]
        .filter((m) => m.status !== "done" && m.due_date && daysBetween(today, m.due_date) >= 0 && daysBetween(today, m.due_date) <= 10)
        .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))[0];
      if (upcomingMilestone) items.push(`Work toward: ${upcomingMilestone.title}`);

      const nextOpenMilestone = [...milestones].filter((m) => m.status !== "done").sort((a, b) => a.order_index - b.order_index)[0];
      if (nextOpenMilestone && nextOpenMilestone.id !== upcomingMilestone?.id) items.push(`Next up: ${nextOpenMilestone.title}`);

      items.push("Keep logging your metrics and expenses");
    } else {
      const upcomingExam = [...exams]
        .filter((e) => {
          const diff = daysBetween(today, e.exam_date);
          return diff >= 0 && diff <= 10;
        })
        .sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0];
      if (upcomingExam) items.push(`Prepare for ${upcomingExam.subject} exam`);

      const priorityHomework = homework
        .filter((h) => h.status === "pending" && h.priority === "high")
        .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
      if (priorityHomework) items.push(`Finish ${priorityHomework.subject}: ${priorityHomework.title}`);

      if (primaryCareer) items.push(`Keep building toward ${primaryCareer.name}`);

      items.push("Maintain your daily study routine");
    }

    return items.slice(0, 4);
  }, [isBusiness, exams, homework, milestones, primaryCareer]);

  useEffect(() => {
    if (!user || !profile || !supabase) return;
    if (!allLoaded) return;
    if (savedForUser.current === user.id) return;
    savedForUser.current = user.id;

    const client = supabase;
    const userId = user.id;

    (async () => {
      // weekly_reviews has no business-specific columns, so the generic
      // int columns are reused per-track: assignments_completed holds
      // homework-completed (student) or milestones-done (business) counts;
      // study_minutes holds study time (student) or 0 (business — no
      // time-tracking analog exists on that track).
      const { count } = await client
        .from(isBusiness ? "business_milestones" : "homework")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", isBusiness ? "done" : "completed");

      const completedCount = count ?? 0;
      setPrimaryCompletedCount(completedCount);

      await client.from("weekly_reviews").upsert(
        {
          user_id: userId,
          week_start: weekStart,
          assignments_completed: completedCount,
          study_minutes: isBusiness ? 0 : studyMinutes,
          missions_completed: missionsCompleted,
          consistency_days: consistencyDays,
          skill_deltas: skillDeltas,
          next_focus: nextFocus,
        },
        { onConflict: "user_id,week_start" }
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, allLoaded, isBusiness]);

  const skillsTouched = Object.keys(skillDeltas);
  const ready = allLoaded && primaryCompletedCount !== null;

  return (
    <div className="space-y-7 pb-4 animate-fade-in">
      <ScreenHeader eyebrow="This Week" title="Weekly Review" subtitle={formatWeekLabel(weekStart)} />

      {!ready ? (
        <LoadingScreen message="Putting your week together…" fullScreen={false} />
      ) : (
        <>
          <Card>
            <CardContent className="space-y-1.5 p-5">
              {isBusiness ? (
                <>
                  <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Target className="h-4 w-4 text-accent" aria-hidden /> Plan
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Milestones completed: <span className="font-semibold text-foreground">{primaryCompletedCount}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Expenses logged this week: <span className="font-semibold text-foreground">${expensesThisWeek.toFixed(2)}</span>
                  </p>
                </>
              ) : (
                <>
                  <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <span aria-hidden>📚</span> School
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Completed assignments: <span className="font-semibold text-foreground">{primaryCompletedCount}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Study time: <span className="font-semibold text-foreground">{formatStudyTime(studyMinutes)}</span>
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1.5 p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                <span aria-hidden>🧠</span> Skills
              </p>
              {skillsTouched.length === 0 ? (
                <EmptyState icon={Sparkles} title="No skill activity yet" subtitle="Complete missions to start building skills." bare />
              ) : (
                <p className="text-sm text-muted-foreground">{skillsTouched.map((k) => skillLabel(k)).join(", ")}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1.5 p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                <span aria-hidden>🚀</span> Future
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{missionsCompleted}</span> mission
                {missionsCompleted === 1 ? "" : "s"} completed this week.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2.5 p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                <span aria-hidden>🔥</span> Consistency
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{consistencyDays}/7</span> days active this week.
              </p>
              <ProgressBar value={(consistencyDays / 7) * 100} tone="warning" className="h-1.5" />
            </CardContent>
          </Card>

          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Next Week&rsquo;s Focus</h2>
            <Card>
              <CardContent className="p-5">
                <ol className="space-y-3">
                  {nextFocus.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-caption font-bold text-accent">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
