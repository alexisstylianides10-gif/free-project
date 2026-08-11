import type { SupabaseClient } from "@supabase/supabase-js";

export type Plan = "Free" | "Pro";

export const PLAN_LIMITS: Record<Plan, { monthlyActions: number | null; label: string }> = {
  Free: { monthlyActions: 30, label: "Free" },
  Pro: { monthlyActions: null, label: "Pro" },
};

export async function checkPlanUsage(supabase: SupabaseClient, userId: string, plan: Plan) {
  const limit = PLAN_LIMITS[plan].monthlyActions;
  if (limit === null) return { allowed: true as const, used: 0, limit: null };

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "user")
    .gte("created_at", monthStart.toISOString());

  if (error) {
    // Fail open on a metering error rather than blocking the user entirely —
    // this only gates usage, it's not a security boundary.
    return { allowed: true as const, used: 0, limit };
  }

  const used = count ?? 0;
  return { allowed: used < limit, used, limit };
}
