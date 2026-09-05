import type { SupabaseClient } from "@supabase/supabase-js";
import { researchBusinessData } from "@/lib/onboarding/researchBusiness";
import { todayISO } from "@/lib/utils";
import type { BusinessStage } from "@/lib/types";

export interface FullBusinessOnboardingAnswers {
  businessIdea: string;
  stage: BusinessStage;
  targetCustomer: string;
  focusAreas: string[];
  strengths: string[];
  freeTime: string;
  biggestGoal: string;
  biggestProblem: string;
}

const FALLBACK_MILESTONES: { title: string; description: string }[] = [
  { title: "Write down your one-line pitch", description: "A single sentence explaining who it's for and what problem it solves." },
  { title: "Talk to 5 potential customers", description: "Find out if the problem you're solving is one they actually have." },
  { title: "Sketch your simplest first version", description: "The smallest thing you could build or offer to test the idea." },
  { title: "Set a realistic weekly time budget", description: "Decide how many hours a week you can actually commit, and protect them." },
  { title: "Pick one channel to find your first customers", description: "One place to reach the people who need this, instead of trying everywhere at once." },
];

/**
 * Business-track equivalent of completeOnboarding(): writes the founder's
 * profile basics + an AI-generated snapshot and starter milestone checklist
 * in one pass. Falls back to a small hardcoded milestone list if the AI
 * research call fails, so onboarding never breaks on it — same safety-net
 * pattern as buildDemoData for the student track.
 */
export async function completeBusinessOnboarding(
  supabase: SupabaseClient,
  userId: string,
  answers: FullBusinessOnboardingAnswers
): Promise<void> {
  let snapshot: string | null = null;
  let milestones = FALLBACK_MILESTONES;
  let businessIdea = answers.businessIdea;
  try {
    const researched = await researchBusinessData({
      businessIdea: answers.businessIdea,
      stage: answers.stage,
      targetCustomer: answers.targetCustomer,
      focusAreas: answers.focusAreas,
      strengths: answers.strengths,
    });
    snapshot = researched.snapshot;
    milestones = researched.milestones;
    if (!businessIdea.trim() && researched.suggestedIdea) {
      businessIdea = researched.suggestedIdea;
    }
  } catch {
    // Fallback milestones above — onboarding still completes.
  }

  await Promise.all([
    // Plain update, not upsert: PostgREST rejects upsert (ON CONFLICT DO
    // UPDATE) on profiles because its UPDATE grant is column-restricted
    // rather than table-wide. The row always exists by this point (signup/
    // login creates it), so a plain update is correct here.
    supabase
      .from("profiles")
      .update({
        onboarding_completed: true,
        streak_count: 1,
        longest_streak: 1,
        last_active_date: todayISO(),
        xp_career: 15,
      })
      .eq("id", userId),
    supabase.from("business_profiles").upsert(
      {
        user_id: userId,
        business_idea: businessIdea,
        stage: answers.stage,
        target_customer: answers.targetCustomer,
        ai_snapshot: snapshot,
      },
      { onConflict: "user_id" }
    ),
  ]);

  await supabase.from("business_milestones").insert(
    milestones.map((m, i) => ({
      user_id: userId,
      title: m.title,
      description: m.description,
      status: "todo" as const,
      order_index: i,
    }))
  );
}
