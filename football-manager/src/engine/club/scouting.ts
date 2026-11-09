import type { ID, Player, ScoutingAssignment, World } from "../core/types";
import { newId } from "../core/ids";
import { addDays } from "../core/dates";
import { overall } from "../core/ratings";
import { clamp } from "../core/util";
import { postTransaction } from "../finance/ledger";
import { addNews } from "../world/news";
import { fullName } from "../world/players";

export function isScouted(world: World, playerId: ID): boolean {
  const p = world.players[playerId];
  if (!p) return false;
  if (p.clubId === world.meta.userClubId) return true;
  return !!world.scoutedPlayerIds[playerId];
}

function scoutQuality(world: World, clubId: ID): number {
  const scouts = Object.values(world.staff).filter((s) => s.clubId === clubId && (s.role === "scout" || s.role === "head_of_recruitment"));
  if (!scouts.length) return 5;
  return Math.max(...scouts.map((s) => (s.attributes.judgingAbility + s.attributes.judgingPotential) / 2)) + (scouts.some((s) => s.role === "head_of_recruitment") ? 2 : 0);
}

/** Displayed estimates for a player: exact if scouted, otherwise a range that narrows with scouting quality. */
export function knowledgeOf(world: World, p: Player): { exact: boolean; overall: [number, number]; potential: [number, number] } {
  const ovr = overall(p);
  if (isScouted(world, p.id)) {
    const q = scoutQuality(world, world.meta.userClubId);
    const err = clamp(Math.round(8 - q / 3), 1, 7);
    // potential remains an estimate even when scouted
    const seed = (p.id.length * 7 + p.potential) % 3 - 1;
    return { exact: true, overall: [ovr, ovr], potential: [clamp(p.potential - err + seed, ovr, 100), clamp(p.potential + err + seed, ovr, 100)] };
  }
  const spread = 6;
  const lo = clamp(Math.floor((ovr - spread) / 3) * 3, 1, 100);
  return { exact: false, overall: [lo, clamp(lo + spread * 2, 1, 100)], potential: [clamp(lo, 1, 100), clamp(p.potential + 10, 1, 100)] };
}

export function startScouting(world: World, clubId: ID, target: ScoutingAssignment["target"]): { ok: boolean; message: string } {
  const active = Object.values(world.scouting).filter((s) => s.clubId === clubId && s.status === "active");
  const scouts = Object.values(world.staff).filter((s) => s.clubId === clubId && s.role === "scout");
  const capacity = Math.max(1, scouts.length) + 1;
  if (active.length >= capacity) return { ok: false, message: `All scouts are busy (${active.length}/${capacity} assignments). Hire more scouts to run more assignments.` };
  const q = scoutQuality(world, clubId);
  const days = target.kind === "player" ? Math.max(3, Math.round(16 - q / 2)) : Math.max(10, Math.round(40 - q));
  const a: ScoutingAssignment = { id: newId(world, "sc"), clubId, scoutId: scouts[0]?.id ?? null, target, startDate: world.meta.currentDate, endDate: addDays(world.meta.currentDate, days), status: "active", reportPlayerIds: [] };
  world.scouting[a.id] = a;
  postTransaction(world, clubId, -(target.kind === "player" ? 15_000 : 60_000), "scouting", "Scouting assignment", `scout:${a.id}`);
  return { ok: true, message: `Scouting report due in ${days} days.` };
}

export function processScouting(world: World): void {
  for (const a of Object.values(world.scouting)) {
    if (a.status !== "active" || a.endDate > world.meta.currentDate) continue;
    a.status = "completed";
    let found: Player[] = [];
    if (a.target.kind === "player") {
      const p = world.players[a.target.playerId];
      if (p) found = [p];
    } else {
      const t = a.target;
      found = Object.values(world.players).filter((p) => {
        if (p.retired) return false;
        if (t.kind === "nation") return p.nationId === t.nationId;
        const c = p.clubId ? world.clubs[p.clubId] : null;
        return !!c && c.leagueId === t.competitionId;
      }).sort((x, y) => y.potential + overall(y) - (x.potential + overall(x))).slice(0, 40);
    }
    for (const p of found) world.scoutedPlayerIds[p.id] = world.meta.currentDate;
    a.reportPlayerIds = found.map((p) => p.id);
    if (a.clubId === world.meta.userClubId) {
      const title = a.target.kind === "player" && found[0] ? `Scouting report: ${fullName(found[0])}` : `Scouting report ready (${found.length} players)`;
      addNews(world, { category: "general", title, body: "The full report is available in Transfers → Scouting.", clubIds: [a.clubId], playerIds: a.reportPlayerIds.slice(0, 10) });
    }
  }
}
