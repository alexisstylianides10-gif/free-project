import { Rng } from "@/engine/core/rng";
import type { Player, Position, TacticalSystem, TeamInstructions } from "@/engine/core/types";
import { generatePlayer } from "@/engine/world/generate";
import { createTactic } from "@/engine/tactics/formations";
import type { EngineTeamInput } from "@/engine/match/engine";

export function makeSquad(seed: number, clubId: string, overall: number, preset = "4-3-3"): { tactic: TacticalSystem; players: Player[]; starters: { slotId: string; player: Player }[]; bench: Player[] } {
  const rng = new Rng(seed);
  const tactic = createTactic(`t_${clubId}`, clubId, "Main", preset, "2026-07-01");
  const players: Player[] = [];
  const starters: { slotId: string; player: Player }[] = [];
  let n = 0;
  for (const slot of tactic.slots) {
    const p = generatePlayer(rng, { id: `${clubId}_p${n++}`, nationId: "n1", namePool: "anglic", position: slot.position, overall, potential: overall, dob: "1998-01-01", clubId, generated: true });
    players.push(p);
    starters.push({ slotId: slot.id, player: p });
  }
  const benchPos: Position[] = ["GK", "CB", "LB", "CM", "CM", "LW", "ST", "RB", "AM"];
  const bench = benchPos.map((pos) => generatePlayer(rng, { id: `${clubId}_p${n++}`, nationId: "n1", namePool: "anglic", position: pos, overall: overall - 4, potential: overall, dob: "1999-01-01", clubId, generated: true }));
  players.push(...bench);
  return { tactic, players, starters, bench };
}

export function teamInput(seed: number, clubId: string, overall: number, team?: Partial<TeamInstructions>, preset = "4-3-3"): EngineTeamInput {
  const s = makeSquad(seed, clubId, overall, preset);
  Object.assign(s.tactic.team, team ?? {});
  return { clubId, name: clubId, tactic: s.tactic, starters: s.starters, bench: s.bench, captainId: null, penaltyTakerId: null, freeKickTakerId: null, cornerTakerId: null, cohesion: 70, maxSubs: 5, manualControl: false };
}

export const baseOptions = { homeAdvantage: true, requiresWinner: false, extraTime: false, penalties: false, priorGoals: null, priorAwayGoals: null, awayGoalsRule: false, detailed: false } as const;
