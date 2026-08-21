import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

export type EntitlementInput = Pick<Profile, "plan_status" | "trial_ends_at">;

/**
 * Single source of truth for "does this student currently have Alxioum
 * Plus" — used both client-side (PaywallGate) and server-side (every AI
 * route). A canceled/past_due subscription loses entitlement immediately;
 * an expired trial does too, even though `plan_status` itself only flips to
 * something else once the Stripe webhook or a later check catches up.
 */
export function isEntitled(profile: EntitlementInput): boolean {
  if (profile.plan_status === "active") return true;
  if (profile.plan_status === "trialing") {
    return new Date(profile.trial_ends_at).getTime() > Date.now();
  }
  return false;
}

/** Server-side gate for the AI routes — fetches just enough of the profile
 * to decide, so each route stays a one-line check after requireUser(). */
export async function checkEntitlement(client: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await client.from("profiles").select("plan_status, trial_ends_at").eq("id", userId).maybeSingle();
  if (!data) return false;
  return isEntitled(data as EntitlementInput);
}
