"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Lock, LogOut } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useUserSkills, useUserAchievements, useRoadmapProgress } from "@/lib/hooks/domain";
import { ACHIEVEMENTS } from "@/lib/catalog/achievements";
import { skillLabel } from "@/lib/catalog/skills";
import { ROADMAP_LEVELS } from "@/lib/catalog/roadmap";
import { xpToPercent, totalXP, levelFromXP } from "@/lib/xp";
import { initials, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { RoadmapTimeline, RoadmapStep } from "@/components/shared/RoadmapTimeline";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { data: skills } = useUserSkills(user?.id);
  const { data: achievements } = useUserAchievements(user?.id);
  const { data: roadmapProgress } = useRoadmapProgress(user?.id);

  const earnedKeys = useMemo(() => new Set(achievements.map((a) => a.achievement_key)), [achievements]);

  const sortedSkills = useMemo(() => [...skills].sort((a, b) => b.proficiency - a.proficiency), [skills]);

  const roadmapSteps: RoadmapStep[] = useMemo(
    () =>
      ROADMAP_LEVELS.map((lvl) => {
        const progress = roadmapProgress.find((r) => r.level_number === lvl.level);
        const status: RoadmapStep["status"] = progress?.completed_at ? "completed" : progress?.unlocked ? "unlocked" : "locked";
        return { level: lvl.level, title: lvl.title, description: lvl.description, status };
      }),
    [roadmapProgress]
  );

  if (!profile) return null;

  const level = levelFromXP(totalXP(profile));

  const progressStats: { label: string; value: number; cap: number; tone: "school" | "future" | "brand" | "mission" }[] = [
    { label: "School XP", value: profile.xp_school, cap: 220, tone: "school" },
    { label: "Career XP", value: profile.xp_career, cap: 260, tone: "future" },
    { label: "Skill XP", value: profile.xp_skill, cap: 250, tone: "brand" },
    { label: "Project XP", value: profile.xp_project, cap: 200, tone: "mission" },
  ];

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <div className="space-y-7 pb-4 animate-fade-in">
      <ScreenHeader eyebrow="Profile" title="Your progress" subtitle="Everything you've built, in one place." />

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-brand p-[2.5px] shadow-glow-accent">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-surface text-2xl">
              {profile.avatar_emoji || initials(profile.full_name)}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-foreground">{profile.full_name}</h2>
            <p className="text-sm text-muted-foreground">{profile.year_group}</p>
          </div>
          <Badge tone="accent">Level {level}</Badge>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Progress</h2>
        <Card>
          <CardContent className="grid grid-cols-2 gap-5 p-5">
            {progressStats.map((stat) => (
              <div key={stat.label}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                  <p className="shrink-0 text-sm font-bold text-foreground">{stat.value} XP</p>
                </div>
                <ProgressBar value={xpToPercent(stat.value, stat.cap)} tone={stat.tone} className="mt-2 h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Achievements</h2>
        <div className="grid grid-cols-2 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const earned = earnedKeys.has(a.key);
            return (
              <Card key={a.key} className={cn(!earned && "opacity-55")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-2xl", !earned && "grayscale")}>{a.icon}</span>
                    {!earned && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">{a.title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{a.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Skills</h2>
        {sortedSkills.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Complete missions to start building skills.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-4 p-5">
              {sortedSkills.map((s) => (
                <div key={s.skill_key}>
                  <p className="text-sm font-medium text-foreground">
                    {skillLabel(s.skill_key)} — {s.proficiency}%
                  </p>
                  <ProgressBar value={s.proficiency} tone="brand" className="mt-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Career Journey</h2>
          <Link href="/app/weekly-review" className="flex items-center gap-0.5 text-xs font-semibold text-accent">
            Weekly Review <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <Card>
          <CardContent className="p-5">
            <RoadmapTimeline steps={roadmapSteps} />
          </CardContent>
        </Card>
      </section>

      <Button variant="outline" size="lg" className="w-full" onClick={handleSignOut}>
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}
