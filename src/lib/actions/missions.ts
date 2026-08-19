import type { SupabaseClient } from "@supabase/supabase-js";
import type { Mission, MissionCategory } from "@/lib/catalog/missions";
import type { Profile } from "@/lib/types";
import { awardXP } from "@/lib/actions/xp";
import { bumpSkills } from "@/lib/actions/xp";
import { awardAchievementOnce } from "@/lib/actions/achievements";

const CATEGORY_XP_BUCKET: Record<MissionCategory, "xp_school" | "xp_career" | "xp_skill" | "xp_project"> = {
  school: "xp_school",
  skill: "xp_skill",
  career: "xp_career",
  business: "xp_career",
  creative: "xp_project",
};

type ProfileXPFields = Pick<Profile, "xp_school" | "xp_career" | "xp_skill" | "xp_project" | "streak_count" | "longest_streak" | "last_active_date">;

/**
 * Marks a mission completed for a user: writes the user_missions row,
 * awards XP into the right bucket for its category, bumps any skills it
 * builds, and grants the achievements tied to "first time" milestones.
 * Returns the updated XP/streak fields so the caller can refresh local
 * profile state without another fetch.
 */
export async function completeMission(
  supabase: SupabaseClient,
  userId: string,
  mission: Mission,
  profile: ProfileXPFields,
  isFirstOfCategory: (category: MissionCategory) => boolean
): Promise<ProfileXPFields> {
  await supabase.from("user_missions").upsert(
    {
      user_id: userId,
      mission_id: mission.id,
      status: "completed",
      xp_awarded: mission.xp,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,mission_id" }
  );

  const updated = await awardXP(supabase, userId, profile, { [CATEGORY_XP_BUCKET[mission.category]]: mission.xp });

  if (mission.skillKeys?.length) await bumpSkills(supabase, userId, mission.skillKeys);

  if (mission.category === "career" && isFirstOfCategory("career")) {
    await awardAchievementOnce(supabase, userId, "first_career_mission");
  }
  if ((mission.category === "business" || mission.category === "creative") && isFirstOfCategory(mission.category)) {
    await awardAchievementOnce(supabase, userId, "first_project");
  }

  return updated;
}
