import type { SupabaseClient } from "@supabase/supabase-js";

export interface WeeklyReview {
  businessName: string;
  newCustomers: number;
  revenueChange: number | null;
  experimentsStarted: number;
  experimentsCompleted: number;
  missionsCompleted: number;
  insightsRaised: number;
}

export type WeeklyReviewOutcome = { ok: true; review: WeeklyReview } | { ok: false; error: string };

/**
 * Deterministic 7-day aggregation of real recorded activity — never authored
 * by the model. Shared by the business_weekly_review_get tool and the
 * dashboard's "Weekly Review" UI action, same extraction pattern as
 * strategy.ts / competitors.ts.
 */
export async function getWeeklyReview(supabase: SupabaseClient, userId: string, businessId: string): Promise<WeeklyReviewOutcome> {
  const { data: business } = await supabase.from("businesses").select("id,name").eq("id", businessId).eq("user_id", userId).maybeSingle();
  if (!business) return { ok: false, error: "I couldn't find that business." };

  const since = new Date(Date.now() - 7 * 86400000).toISOString();

  const [{ data: newCustomers }, { data: metrics }, { data: experimentsStarted }, { data: experimentsCompleted }, { data: missionsCompleted }, { data: insightsRaised }] = await Promise.all([
    supabase.from("business_customers").select("id").eq("business_id", businessId).gte("created_at", since),
    supabase.from("business_metrics").select("revenue,recorded_at").eq("business_id", businessId).order("recorded_at", { ascending: true }),
    supabase.from("business_experiments").select("id").eq("business_id", businessId).gte("created_at", since),
    supabase.from("business_experiments").select("id").eq("business_id", businessId).eq("status", "completed").gte("completed_at", since),
    supabase.from("business_missions").select("id").eq("business_id", businessId).eq("status", "completed").gte("completed_at", since),
    supabase.from("business_insights").select("id").eq("business_id", businessId).gte("created_at", since),
  ]);

  const metricsRows = (metrics ?? []) as { revenue: number | null; recorded_at: string }[];
  const beforeWindow = metricsRows.filter((m) => m.recorded_at < since);
  const inWindow = metricsRows.filter((m) => m.recorded_at >= since);
  const revenueBefore = beforeWindow.length ? Number(beforeWindow[beforeWindow.length - 1].revenue) || 0 : null;
  const revenueAfter = inWindow.length ? Number(inWindow[inWindow.length - 1].revenue) || 0 : revenueBefore;
  const revenueChange = revenueBefore !== null && revenueAfter !== null ? revenueAfter - revenueBefore : null;

  return {
    ok: true,
    review: {
      businessName: business.name as string,
      newCustomers: (newCustomers ?? []).length,
      revenueChange,
      experimentsStarted: (experimentsStarted ?? []).length,
      experimentsCompleted: (experimentsCompleted ?? []).length,
      missionsCompleted: (missionsCompleted ?? []).length,
      insightsRaised: (insightsRaised ?? []).length,
    },
  };
}
