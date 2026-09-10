import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import { addDaysISO, todayISO } from "@/lib/utils";
import { awardAchievementOnce } from "@/lib/actions/achievements";

export type XPBucket = "xp_school" | "xp_career" | "xp_skill" | "xp_project";

/**
 * The single place every "did something real" action (completing homework,
 * finishing a study session, completing a mission) goes through to award
 * XP and update the daily streak. Keeping this in one function means the
 * streak math and the "first activity of the day" check only exist once,
 * instead of drifting between School/Missions/Coach implementations.
 *
 * Returns the updated profile fields so the caller can update local state
 * without a second round-trip.
 */
export async function awardXP(
  supabase: SupabaseClient,
  userId: string,
  profile: Pick<Profile, "xp_school" | "xp_career" | "xp_skill" | "xp_project" | "streak_count" | "longest_streak" | "last_active_date">,
  deltas: Partial<Record<XPBucket, number>>
): Promise<Pick<Profile, "xp_school" | "xp_career" | "xp_skill" | "xp_project" | "streak_count" | "longest_streak" | "last_active_date">> {
  const today = todayISO();

  let streak = profile.streak_count;
  if (profile.last_active_date === today) {
    // Already active today — streak doesn't change.
  } else if (profile.last_active_date === addDaysISO(today, -1)) {
    streak += 1;
  } else {
    streak = 1;
  }
  const longest = Math.max(profile.longest_streak, streak);

  const next = {
    xp_school: profile.xp_school + (deltas.xp_school ?? 0),
    xp_career: profile.xp_career + (deltas.xp_career ?? 0),
    xp_skill: profile.xp_skill + (deltas.xp_skill ?? 0),
    xp_project: profile.xp_project + (deltas.xp_project ?? 0),
    streak_count: streak,
    longest_streak: longest,
    last_active_date: today,
  };

  await supabase.from("profiles").update(next).eq("id", userId);

  if (streak >= 7) await awardAchievementOnce(supabase, userId, "streak_7");

  return next;
}

/** Raises a skill's proficiency (capped 0-100) for the given skill keys —
 * used when a mission or study session builds a specific skill. */
export async function bumpSkills(supabase: SupabaseClient, userId: string, skillKeys: string[], amount = 6) {
  if (skillKeys.length === 0) return;
  const { data: existing } = await supabase.from("user_skills").select("skill_key, proficiency").eq("user_id", userId).in("skill_key", skillKeys);
  const existingMap = new Map((existing ?? []).map((r: { skill_key: string; proficiency: number }) => [r.skill_key, r.proficiency]));

  const rows = skillKeys.map((key) => ({
    user_id: userId,
    skill_key: key,
    proficiency: Math.min(100, (existingMap.get(key) ?? 15) + amount),
    updated_at: new Date().toISOString(),
  }));

  await supabase.from("user_skills").upsert(rows, { onConflict: "user_id,skill_key" });
}
