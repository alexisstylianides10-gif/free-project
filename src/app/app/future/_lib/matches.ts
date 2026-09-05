"use client";

// Small helper shared by the Future tab's two pages (list + detail) for
// combining a student's raw onboarding answers with any career_paths rows
// they've already saved. Kept local to src/app/app/future/** rather than in
// a shared lib file since other agents are concurrently building sibling
// tabs against the shared files.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { computeCareerMatches } from "@/lib/matching";
import { CAREERS } from "@/lib/catalog/careers";
import type { CareerPath, OnboardingResponse } from "@/lib/types";

/** Fetches the student's single onboarding_responses row, if any. */
export function useOnboardingResponse(userId?: string) {
  const [data, setData] = useState<OnboardingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !userId) {
        if (active) {
          setData(null);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      const { data: row } = await supabase.from("onboarding_responses").select("*").eq("user_id", userId).maybeSingle();
      if (active) {
        setData((row as OnboardingResponse | null) ?? null);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [userId]);

  return { data, loading };
}

/** Every career in the catalog scored against the student's onboarding
 * answers, sorted descending. Empty if there's no onboarding row yet. */
function computeAllMatches(onboarding: OnboardingResponse | null) {
  if (!onboarding) return [];
  return computeCareerMatches(
    {
      subjects: onboarding.subjects,
      interests: onboarding.interests,
      strengths: onboarding.strengths,
      exploreGoals: onboarding.explore_goals,
    },
    CAREERS.length
  );
}

/** Merges freshly-computed matches with any already-saved career_paths rows
 * — a saved row's stored match_percent always wins over a recomputed one —
 * and returns the top N by percent, descending. */
export function mergeTopMatches(
  onboarding: OnboardingResponse | null,
  careerPaths: CareerPath[],
  topN = 4
): { slug: string; percent: number }[] {
  const map = new Map<string, number>();
  for (const m of computeAllMatches(onboarding)) map.set(m.slug, m.percent);
  for (const cp of careerPaths) map.set(cp.career_slug, cp.match_percent);

  return Array.from(map.entries())
    .map(([slug, percent]) => ({ slug, percent }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, topN);
}

/** The match percent to show for one specific career: a saved career_paths
 * row wins, otherwise it's freshly computed from onboarding answers, else 0
 * if the student has no onboarding row at all. */
export function getPercentForSlug(slug: string, onboarding: OnboardingResponse | null, careerPaths: CareerPath[]): number {
  const existing = careerPaths.find((c) => c.career_slug === slug);
  if (existing) return existing.match_percent;
  const found = computeAllMatches(onboarding).find((m) => m.slug === slug);
  return found?.percent ?? 0;
}
