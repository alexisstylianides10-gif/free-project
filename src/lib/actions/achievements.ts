import type { SupabaseClient } from "@supabase/supabase-js";
import { getAchievement } from "@/lib/catalog/achievements";

/** The browser CustomEvent name `AchievementToastProvider` listens for.
 * Kept as a small shared constant rather than a magic string on both ends. */
export const ACHIEVEMENT_UNLOCKED_EVENT = "alxioum:achievement-unlocked";

/**
 * Idempotently grants an achievement — safe to call every time its
 * condition is true, since the unique (user_id, achievement_key) key makes
 * repeat calls a no-op rather than an error or a duplicate row.
 *
 * Returns whether this specific call is what actually granted it (true), as
 * opposed to it already being owned (false) — `ignoreDuplicates: true`
 * means Postgres does `ON CONFLICT DO NOTHING`, so `.select()` only ever
 * returns a row when a new one was genuinely inserted. When called in a
 * browser context and newly awarded, also dispatches a CustomEvent so
 * AchievementToastProvider can show a toast without every call site needing
 * to know about the toast system directly. This only reaches code paths
 * that run in the browser (most award call sites); server-only routes
 * (e.g. grade-quiz) still need to surface newly-unlocked keys through their
 * own JSON response, since there's no `window` to dispatch to there. A real
 * `notifications` row is still inserted for server-side award calls (that
 * insert doesn't depend on `window`), so those users still get a
 * notification-bell entry even without a same-request toast.
 */
export async function awardAchievementOnce(supabase: SupabaseClient, userId: string, key: string): Promise<boolean> {
  const def = getAchievement(key);
  if (!def) return false;
  const { data } = await supabase
    .from("user_achievements")
    .upsert({ user_id: userId, achievement_key: key }, { onConflict: "user_id,achievement_key", ignoreDuplicates: true })
    .select("achievement_key");
  const newlyAwarded = !!data && data.length > 0;
  if (newlyAwarded) {
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "achievement_unlocked",
      title: "Achievement unlocked",
      body: def.title,
      related_id: key,
      href: "/app/profile",
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(ACHIEVEMENT_UNLOCKED_EVENT, { detail: { key } }));
    }
  }
  return newlyAwarded;
}
