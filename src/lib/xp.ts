import { clamp } from "@/lib/utils";

/** Converts a raw XP total into a 0-100 progress percentage against a
 * soft cap, with a small floor so a brand-new student never sees a flat
 * 0% (there's always *something* to build on — the point of the app). */
export function xpToPercent(xp: number, cap = 300): number {
  return clamp(Math.round((xp / cap) * 100), xp > 0 ? 5 : 0, 100);
}

export function totalXP(p: { xp_school: number; xp_career: number; xp_skill: number; xp_project: number }): number {
  return p.xp_school + p.xp_career + p.xp_skill + p.xp_project;
}

/** Simple level curve: level = floor(sqrt(totalXP / 40)) + 1, so early
 * levels come quickly and later ones take real accumulated progress. */
export function levelFromXP(xp: number): number {
  return Math.floor(Math.sqrt(xp / 40)) + 1;
}
