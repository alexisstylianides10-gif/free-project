import { authedFetch } from "@/lib/api";

interface ResearchApiResponse {
  snapshot?: string;
  milestones?: { title: string; description: string }[];
  error?: string;
}

export interface BusinessResearchResult {
  snapshot: string;
  milestones: { title: string; description: string }[];
}

/**
 * Calls /api/onboarding/research-business (Claude + web search) to turn a
 * founder's onboarding answers into a short snapshot and starter milestone
 * list. Throws on any failure or malformed response —
 * completeBusinessOnboarding falls back to a hardcoded milestone list so
 * onboarding never gets stuck on this.
 */
export async function researchBusinessData(params: {
  businessIdea: string;
  stage: string;
  targetCustomer: string;
  focusAreas: string[];
}): Promise<BusinessResearchResult> {
  // Bounded to 55s: this AI call runs web search on Opus and routinely
  // takes 25-40s+, so the timeout needs real headroom above that — a
  // tighter bound was causing this to abort (and silently fall back to
  // the generic hardcoded milestone list) on most runs. Onboarding still
  // can't hang forever — completeBusinessOnboarding's catch below falls
  // back to the hardcoded milestone list on a timeout just like any other
  // failure here.
  const res = await authedFetch(
    "/api/onboarding/research-business",
    {
      method: "POST",
      body: JSON.stringify(params),
    },
    55000
  );
  if (!res.ok) throw new Error("Research request failed.");

  const body = (await res.json()) as ResearchApiResponse;
  if (!body.snapshot || !Array.isArray(body.milestones) || body.milestones.length === 0) {
    throw new Error("Malformed research response.");
  }

  return { snapshot: body.snapshot, milestones: body.milestones };
}
