"use client";

import { useMemo } from "react";
import { Compass } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCareerPaths, useRoadmapProgress } from "@/lib/hooks/domain";
import { getCareer } from "@/lib/catalog/careers";
import { ROADMAP_LEVELS } from "@/lib/catalog/roadmap";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { CareerMatchRow } from "@/components/shared/CareerMatchRow";
import { RoadmapTimeline, type RoadmapStep } from "@/components/shared/RoadmapTimeline";
import { Card, CardContent } from "@/components/ui/Card";
import { useOnboardingResponse, mergeTopMatches } from "./_lib/matches";

export default function FuturePage() {
  const { user } = useAuth();
  const { data: careerPaths } = useCareerPaths(user?.id);
  const { data: roadmapProgress } = useRoadmapProgress(user?.id);
  const { data: onboarding, loading: onboardingLoading } = useOnboardingResponse(user?.id);

  const topMatches = useMemo(() => mergeTopMatches(onboarding, careerPaths, 4), [onboarding, careerPaths]);

  const roadmapSteps: RoadmapStep[] = useMemo(
    () =>
      ROADMAP_LEVELS.map((level) => {
        const progress = roadmapProgress.find((p) => p.level_number === level.level);
        const status: RoadmapStep["status"] = progress?.completed_at ? "completed" : progress?.unlocked ? "unlocked" : "locked";
        return { level: level.level, title: level.title, description: level.description, status };
      }),
    [roadmapProgress]
  );

  return (
    <div className="space-y-7 pb-4 animate-fade-in">
      <ScreenHeader title="Your Future" subtitle="Top career matches, based on you." />

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Your Top Career Matches</h2>
        {topMatches.length === 0 ? (
          onboardingLoading ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">Loading your matches…</CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-xl">
                  <Compass className="h-5 w-5 text-white" />
                </span>
                <p className="text-sm font-semibold text-foreground">No career matches yet</p>
                <p className="text-xs text-muted-foreground">
                  Complete onboarding to see careers matched to your subjects, interests, and strengths.
                </p>
              </CardContent>
            </Card>
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
