import { MISSIONS, type Mission } from "@/lib/catalog/missions";
import { todayISO } from "@/lib/utils";

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Picks a stable "mission of the day" for a student — same pick all day
 * (seeded by userId + date, not random), skipping missions they've already
 * completed. Falls back to the first mission if everything is done. */
export function pickTodaysMission(userId: string, completedMissionIds: Set<string>): Mission {
  const available = MISSIONS.filter((m) => !completedMissionIds.has(m.id));
  const pool = available.length > 0 ? available : MISSIONS;
  const seed = hashString(`${userId}:${todayISO()}`);
  return pool[seed % pool.length];
}
