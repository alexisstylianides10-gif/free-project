import type { SupabaseClient } from "@supabase/supabase-js";
import { ACHIEVEMENTS } from "@/lib/catalog/achievements";

/** Idempotently grants an achievement — safe to call every time its
 * condition is true, since the unique (user_id, achievement_key) key makes
 * repeat calls a no-op rather than an error or a duplicate row. */
export async function awardAchievementOnce(supabase: SupabaseClient, userId: string, key: string) {
  if (!ACHIEVEMENTS.some((a) => a.key === key)) return;
  await supabase.from("user_achievements").upsert({ user_id: userId, achievement_key: key }, { onConflict: "user_id,achievement_key", ignoreDuplicates: true });
}
