"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CalendarClock, ClipboardList, ChevronRight, Sparkles } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useHomework, useExams, useTimetable, useStudySessions, useCareerPaths, useUserMissions } from "@/lib/hooks/domain";
import { getCareer } from "@/lib/catalog/careers";
import { buildTodaysPlan, formatPlanTime } from "@/lib/planner";
import { pickTodaysMission } from "@/lib/missionPicker";
import { buildAIRecommendation } from "@/lib/recommendation";
import { xpToPercent, totalXP, levelFromXP } from "@/lib/xp";
import { formatCountdown, mondayOfThisWeek, todayISO } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";
import { StatTile, StreakStat } from "@/components/shared/StatTile";
import { MissionHeroCard } from "@/components/shared/MissionCard";
import { Badge } from "@/components/ui/Badge";
import { PriorityDot } from "@/components/ui/PriorityDot";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { user, profile } = useAuth();
  const today = todayISO();
  const todayDow = new Date(today + "T00:00:00").getDay();

  const { data: homework } = useHomework(user?.id);
  const { data: exams } = useExams(user?.id);
  const { data: timetable } = useTimetable(user?.id);
  const { data: studySessions } = useStudySessions(user?.id, mondayOfThisWeek());
  const { data: careerPaths } = useCareerPaths(user?.id);
  const { data: userMissions } = useUserMissions(user?.id);

  const primaryCareer = useMemo(() => {
    const primary = careerPaths.find((c) => c.is_primary) ?? careerPaths[0];
    return primary ? getCareer(primary.career_slug) : undefined;
  }, [careerPaths]);

  const completedMissionIds = useMemo(
    () => new Set(userMissions.filter((m) => m.status === "completed").map((m) => m.mission_id)),
    [userMissions]
  );
  const mission = useMemo(() => (user ? pickTodaysMission(user.id, completedMissionIds) : undefined), [user, completedMissionIds]);

  const todayTimetable = timetable.filter((t) => t.day_of_week === todayDow);
  const todayHomework = homework.filter((h) => h.status === "pending");
  const todayStudySessions = studySessions.filter((s) => s.day_of_week === todayDow && !s.completed);

  const plan = buildTodaysPlan({ todayTimetable, todayHomework, todayStudySessions, mission });

  const nextExam = [...exams].sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0];
  const nextHomework = homework.filter((h) => h.status === "pending").sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const recommendation = buildAIRecommendation({ exams, homework, primaryCareer });

  const schoolPercent = xpToPercent(profile?.xp_school ?? 0, 220);
  const futurePercent = xpToPercent(profile?.xp_career ?? 0, 260);
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <div className="space-y-7 pb-4 animate-fade-in">
      <div>
        <h1 className="text-[22px] font-bold text-foreground">
          {greeting()}, {firstName} 👋
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Here&rsquo;s your plan for today.</p>
      </div>

      <Card>
        <CardContent className="flex items-stretch gap-4 p-4">
          <StatTile label="School" value={schoolPercent} tone="school" />
          <div className="w-px bg-border" />
          <StatTile label="Future" value={futurePercent} tone="future" />
          <div className="w-px bg-border" />
          <StreakStat days={profile?.streak_count ?? 0} />
        </CardContent>
      </Card>

      {mission && <MissionHeroCard mission={mission} />}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Today&rsquo;s Plan</h2>
          <Link href="/app/school" className="flex items-center gap-0.5 text-xs font-semibold text-accent">
            School <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {plan.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Nothing scheduled yet — check School to add homework and exams.
            </CardContent>
          </Card>
        ) : (
          <ol className="space-y-2">
            {plan.map((item, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                <span className="w-12 shrink-0 text-xs font-semibold text-muted-foreground">{formatPlanTime(item.time)}</span>
                <span className="text-base leading-none">{item.icon}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{item.label}</span>
                {item.meta && <span className="shrink-0 text-xs text-muted-foreground">{item.meta}</span>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link href="/app/school">
          <Card className="h-full">
            <CardContent className="p-4">
              <CalendarClock className="h-5 w-5 text-school" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upcoming exam</p>
              {nextExam ? (
                <>
                  <p className="mt-1 truncate text-sm font-bold text-foreground">{nextExam.subject}</p>
                  <p className="text-xs text-muted-foreground">{formatCountdown(nextExam.exam_date)}</p>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No exams yet</p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/app/school">
          <Card className="h-full">
            <CardContent className="p-4">
              <ClipboardList className="h-5 w-5 text-accent" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Homework due</p>
              {nextHomework ? (
                <>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-sm font-bold text-foreground">
                    <PriorityDot priority={nextHomework.priority} />
                    {nextHomework.subject}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatCountdown(nextHomework.due_date)}</p>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">All caught up</p>
              )}
            </CardContent>
          </Card>
        </Link>
      </section>

      {primaryCareer && (
        <Link href={`/app/future/${primaryCareer.slug}`}>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-xl">
                {primaryCareer.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Career progress</p>
                <p className="truncate text-sm font-bold text-foreground">{primaryCareer.name}</p>
              </div>
              <Badge tone="accent">Level {levelFromXP(totalXP(profile ?? { xp_school: 0, xp_career: 0, xp_skill: 0, xp_project: 0 }))}</Badge>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      )}

      <Card className="border-accent/30">
        <CardContent className="flex gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft">
            <Sparkles className="h-4 w-4 text-accent" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">AI recommendation</p>
            <p className="mt-1 text-sm leading-relaxed text-foreground">{recommendation}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
