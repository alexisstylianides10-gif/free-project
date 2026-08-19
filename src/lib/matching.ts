import { CAREERS, type Career } from "@/lib/catalog/careers";
import type { CareerMatchResult } from "@/lib/types";

export interface OnboardingAnswers {
  subjects: string[];
  interests: string[];
  strengths: string[];
  exploreGoals: string[];
}

const WEIGHTS = {
  interest: 3,
  explore: 3,
  strength: 2,
  subject: 2,
};

/** Small deterministic jitter (±3) derived from the slug, so otherwise-tied
 * careers don't all land on the exact same percentage — without using
 * Math.random(), which would make results change on every render. */
function slugJitter(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return (hash % 7) - 3;
}

function overlapScore(userTags: string[], careerTags: string[], weight: number): number {
  if (careerTags.length === 0) return 0;
  const hits = careerTags.filter((t) => userTags.includes(t)).length;
  return (hits / careerTags.length) * weight;
}

function scoreCareer(career: Career, answers: OnboardingAnswers): number {
  const maxScore = WEIGHTS.interest + WEIGHTS.explore + WEIGHTS.strength + WEIGHTS.subject;
  const raw =
    overlapScore(answers.interests, career.interestTags, WEIGHTS.interest) +
    overlapScore(answers.exploreGoals, career.exploreTags, WEIGHTS.explore) +
    overlapScore(answers.strengths, career.strengthTags, WEIGHTS.strength) +
    overlapScore(answers.subjects, career.subjectTags, WEIGHTS.subject);

  const normalized = raw / maxScore; // 0..1
  // Map onto a believable 48-97% band rather than 0-100, then add jitter.
  const percent = 48 + normalized * 49 + slugJitter(career.slug);
  return Math.max(38, Math.min(97, Math.round(percent)));
}

/** Ranks every career in the catalog against a student's onboarding
 * answers and returns the top N as {slug, percent} results, sorted
 * descending. Used both to build the onboarding "Future Map" and to
 * recompute matches if answers ever change. */
export function computeCareerMatches(answers: OnboardingAnswers, topN = 5): CareerMatchResult[] {
  const scored = CAREERS.map((career) => ({ slug: career.slug, percent: scoreCareer(career, answers) }));
  scored.sort((a, b) => b.percent - a.percent);
  return scored.slice(0, topN);
}
