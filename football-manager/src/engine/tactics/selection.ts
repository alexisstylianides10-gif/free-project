import type { Club, Competition, ID, Player, Selection, TacticalSystem, World } from "../core/types";
import { overall, positionFamiliarity, ratingInPosition } from "../core/ratings";
import { clubPlayers } from "../world/index";

export interface ValidationIssue {
  level: "error" | "warning";
  code: string;
  message: string;
  playerId?: ID;
  slotId?: string;
}

export function squadOf(world: World, clubId: ID): Player[] {
  return clubPlayers(world, clubId).slice();
}

export function isSuspendedFor(p: Player, competitionId: ID | null): boolean {
  return p.suspensions.some((s) => s.matches > 0 && (s.competitionId === null || s.competitionId === competitionId));
}

export function isAvailable(p: Player, competitionId: ID | null, today: string): boolean {
  if (p.retired) return false;
  if (p.injury && p.injury.until > today) return false;
  if (isSuspendedFor(p, competitionId)) return false;
  return true;
}

export function activeTactic(club: Club): TacticalSystem {
  const id = club.selection?.tacticId;
  return club.tactics.find((t) => t.id === id) ?? club.tactics[0];
}

/** Validate a selection for a match in the given competition. */
export function validateSelection(world: World, club: Club, sel: Selection, competition: Competition | null, today: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const tactic = club.tactics.find((t) => t.id === sel.tacticId);
  if (!tactic) {
    issues.push({ level: "error", code: "no_tactic", message: "Selected tactical system does not exist." });
    return issues;
  }
  const seen = new Set<ID>();
  const compId = competition?.id ?? null;
  let gkCount = 0;
  for (const slot of tactic.slots) {
    const pid = sel.starters[slot.id];
    if (!pid) {
      issues.push({ level: "error", code: "empty_slot", message: `No player selected for ${slot.id}.`, slotId: slot.id });
      continue;
    }
    const p = world.players[pid];
    if (!p || p.clubId !== club.id) {
      issues.push({ level: "error", code: "not_in_squad", message: `Player in ${slot.id} is not registered to the club.`, slotId: slot.id, playerId: pid });
      continue;
    }
    if (seen.has(pid)) issues.push({ level: "error", code: "duplicate", message: `${p.firstName} ${p.lastName} is selected more than once.`, playerId: pid });
    seen.add(pid);
    if (p.injury && p.injury.until > today) issues.push({ level: "error", code: "injured", message: `${p.lastName} is injured.`, playerId: pid, slotId: slot.id });
    if (isSuspendedFor(p, compId)) issues.push({ level: "error", code: "suspended", message: `${p.lastName} is suspended.`, playerId: pid, slotId: slot.id });
    if (slot.position === "GK") {
      if (p.position === "GK" || p.altPositions.includes("GK")) gkCount++;
      else issues.push({ level: "warning", code: "outfield_in_goal", message: `${p.lastName} is not a goalkeeper.`, playerId: pid, slotId: slot.id });
    } else {
      const fam = positionFamiliarity(p, slot.position);
      if (fam < 0.8) issues.push({ level: "warning", code: "out_of_position", message: `${p.lastName} is unfamiliar playing ${slot.position}.`, playerId: pid, slotId: slot.id });
    }
    if (p.fitness < 70) issues.push({ level: "warning", code: "low_fitness", message: `${p.lastName} is only at ${Math.round(p.fitness)}% condition.`, playerId: pid });
  }
  if (gkCount === 0 && tactic.slots.some((s) => s.position === "GK")) issues.push({ level: "error", code: "no_goalkeeper", message: "No available goalkeeper in the starting XI." });
  const benchMax = competition?.matchday.benchSize ?? 9;
  if (sel.bench.length > benchMax) issues.push({ level: "error", code: "bench_size", message: `Bench exceeds the competition limit of ${benchMax}.` });
  for (const pid of sel.bench) {
    const p = world.players[pid];
    if (!p || p.clubId !== club.id) {
      issues.push({ level: "error", code: "not_in_squad", message: `A substitute is not registered to the club.`, playerId: pid });
      continue;
    }
    if (seen.has(pid)) issues.push({ level: "error", code: "duplicate", message: `${p.lastName} is in both the XI and the bench (or twice on the bench).`, playerId: pid });
    seen.add(pid);
    if (!isAvailable(p, compId, today)) issues.push({ level: "error", code: "unavailable_sub", message: `${p.lastName} is unavailable.`, playerId: pid });
  }
  if (!sel.bench.some((id) => world.players[id]?.position === "GK")) issues.push({ level: "warning", code: "no_backup_gk", message: "No goalkeeper on the bench." });
  for (const key of ["captainId", "penaltyTakerId", "freeKickTakerId", "cornerTakerId"] as const) {
    const pid = sel[key];
    if (pid && !seen.has(pid)) issues.push({ level: "warning", code: "taker_not_playing", message: `${labelFor(key)} is not in the matchday squad.` });
  }
  return issues;
}

function labelFor(k: string): string {
  return k === "captainId" ? "Captain" : k === "penaltyTakerId" ? "Penalty taker" : k === "freeKickTakerId" ? "Free-kick taker" : "Corner taker";
}

/** Condition-adjusted suitability used by the selection AI. */
function selectionScore(p: Player, pos: Player["position"], rotate: boolean): number {
  const r = ratingInPosition(p, pos);
  const cond = p.fitness / 100;
  const formBoost = (p.form - 6.5) * 1.5;
  const fatiguePenalty = rotate ? p.fatigue * 0.12 : p.fatigue * 0.04;
  return r * (0.55 + 0.45 * cond) + formBoost - fatiguePenalty;
}

/**
 * Build the strongest available matchday selection for a tactic.
 * Slots are filled in order of scarcity (GK first, then the slots with
 * the fewest suitable candidates).
 */
export function autoSelect(world: World, club: Club, tactic: TacticalSystem, competition: Competition | null, today: string, opts: { rotate?: boolean; keepExisting?: Selection | null } = {}): Selection {
  const compId = competition?.id ?? null;
  const pool = squadOf(world, club.id).filter((p) => isAvailable(p, compId, today) && !(p.loanParentClubId && p.loanParentClubId === club.id));
  const used = new Set<ID>();
  const starters: Record<string, ID> = {};
  // keep valid existing picks
  if (opts.keepExisting) {
    for (const slot of tactic.slots) {
      const pid = opts.keepExisting.starters[slot.id];
      const p = pid ? world.players[pid] : undefined;
      if (p && pool.includes(p) && !used.has(p.id)) {
        starters[slot.id] = p.id;
        used.add(p.id);
      }
    }
  }
  const openSlots = tactic.slots.filter((s) => !starters[s.id]);
  const scarcity = (pos: Player["position"]) => pool.filter((p) => positionFamiliarity(p, pos) >= 0.8).length;
  openSlots.sort((a, b) => (a.position === "GK" ? -1 : b.position === "GK" ? 1 : scarcity(a.position) - scarcity(b.position)));
  for (const slot of openSlots) {
    let best: Player | null = null;
    let bestScore = -Infinity;
    for (const p of pool) {
      if (used.has(p.id)) continue;
      if (slot.position === "GK" && p.position !== "GK") continue;
      if (slot.position !== "GK" && p.position === "GK") continue;
      const s = selectionScore(p, slot.position, !!opts.rotate);
      if (s > bestScore) {
        bestScore = s;
        best = p;
      }
    }
    if (!best && slot.position === "GK") {
      // emergency: any outfield player
      best = pool.find((p) => !used.has(p.id)) ?? null;
    }
    if (best) {
      starters[slot.id] = best.id;
      used.add(best.id);
    }
  }
  const benchSize = competition?.matchday.benchSize ?? 9;
  const rest = pool.filter((p) => !used.has(p.id)).sort((a, b) => overall(b) - overall(a));
  const bench: ID[] = [];
  const backupGk = rest.find((p) => p.position === "GK");
  if (backupGk) bench.push(backupGk.id);
  for (const p of rest) {
    if (bench.length >= benchSize) break;
    if (!bench.includes(p.id) && p.position !== "GK") bench.push(p.id);
  }
  const xi = Object.values(starters).map((id) => world.players[id]);
  const best = (score: (p: Player) => number) => xi.slice().sort((a, b) => score(b) - score(a))[0]?.id ?? null;
  const prev = opts.keepExisting;
  const keepIf = (pid: ID | null | undefined) => (pid && xi.some((p) => p.id === pid) ? pid : null);
  return {
    tacticId: tactic.id,
    starters,
    bench,
    captainId: keepIf(prev?.captainId) ?? best((p) => p.attributes.leadership * 2 + overall(p) / 10),
    penaltyTakerId: keepIf(prev?.penaltyTakerId) ?? best((p) => p.attributes.penalties * 2 + p.attributes.composure),
    freeKickTakerId: keepIf(prev?.freeKickTakerId) ?? best((p) => p.attributes.freeKicks * 2 + p.attributes.technique),
    cornerTakerId: keepIf(prev?.cornerTakerId) ?? best((p) => p.attributes.crossing * 2 + p.attributes.technique),
    autoFill: prev?.autoFill ?? true,
  };
}
