"use client";

import { useMemo, useState } from "react";
import { Compass } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCareerPaths, useRoadmapProgress } from "@/lib/hooks/domain";
import { getCareer } from "@/lib/catalog/careers";
import { ROADMAP_LEVELS } from "@/lib/catalog/roadmap";
import { advanceRoadmapLevel } from "@/lib/actions/roadmap";
import { supabase } from "@/lib/supabase/client";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { CareerMatchRow } from "@/components/shared/CareerMatchRow";
import { RoadmapTimeline, type RoadmapStep } from "@/components/shared/RoadmapTimeline";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import { useOnboardingResponse, mergeTopMatches } from "./_lib/matches";

export default function StudentFutureHome() {
  const { user } = useAuth();
  const { data: careerPaths } = useCareerPaths(user?.id);
  const { data: roadmapProgress, refetch: refetchRoadmap } = useRoadmapProgress(user?.id);
  const { data: onboarding, loading: onboardingLoading } = useOnboardingResponse(user?.id);
  const [markingLevel, setMarkingLevel] = useState<number | null>(null);

  const topMatches = useMemo(() => mergeTopMatches(onboarding, careerPaths, 4), [onboarding, careerPaths]);

  async function handleMarkComplete(level: number) {
    if (!user || !supabase) return;
    setMarkingLevel(level);
    await advanceRoadmapLevel(supabase, user.id, level);
    await refetchRoadmap();
    setMarkingLevel(null);
  }

  const manualUnlockedLevels = ROADMAP_LEVELS.filter((l) => {
    const progress = roadmapProgress.find((p) => p.level_number === l.level);
    return l.advancement === "manual" && progress?.unlocked && !progress.completed_at;
  }).map((l) => l.level);
  const frontierManualLevel = manualUnlockedLevels.length ? Math.min(...manualUnlockedLevels) : null;

  const roadmapSteps: RoadmapStep[] = useMemo(
    () =>
      ROADMAP_LEVELS.map((level) => {
        const progress = roadmapProgress.find((p) => p.level_number === level.level);
        const status: RoadmapStep["status"] = progress?.completed_at ? "completed" : progress?.unlocked ? "unlocked" : "locked";
        const action =
          level.level === frontierManualLevel
            ? { label: "Mark as done", pending: markingLevel === level.level, onClick: () => handleMarkComplete(level.level) }
            : undefined;
        return { level: level.level, title: level.title, description: level.description, status, action };
      }),
    // handleMarkComplete is intentionally excluded: it's a plain function
    // (not memoized) redefined every render, so including it here would
    // defeat the memoization; its only reactive inputs (user, supabase,
    // refetchRoadmap) are all stable/effectively-static for this component's
    // lifetime, and the level it's called with is passed as an argument, not
    // captured from render-time state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roadmapProgress, frontierManualLevel, markingLevel]
  );

  return (
    <div className="space-y-7 pb-4">
      <ScreenHeader title="Your Future" subtitle="Top career matches, based on you." action={<NotificationBell className="md:hidden" />} />

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Your Top Career Matches</h2>
        {topMatches.length === 0 ? (
          onboardingLoading ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">Loading your matches…</CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={Compass}
              title="No career matches yet"
              subtitle="Complete onboarding to see careers matched to your subjects, interests, and strengths."
            />
          )
        ) : (
          <div className="space-y-2">
            {topMatches.map(({ slug, percent }) => {
              const career = getCareer(slug);
              if (!career) return null;
              return <CareerMatchRow key={slug} career={career} percent={percent} />;
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">Roadmap</h2>
        <Card>
          <CardContent className="p-5">
            <RoadmapTimeline steps={roadmapSteps} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
