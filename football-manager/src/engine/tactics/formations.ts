import type { Duty, PlayerInstructions, Position, SetPieceInstructions, TacticSlot, TacticalSystem, TeamInstructions } from "../core/types";
import { clamp } from "../core/util";
import { defaultRoleFor, roleMods } from "./roles";

export const DEFAULT_PLAYER_INSTRUCTIONS: PlayerInstructions = {
  passRisk: 0, dribble: 0, shoot: 0, cross: 0, press: 0, forwardRuns: 0, width: 0, tackleHarder: false, markTighter: false, holdPosition: false,
};

export const DEFAULT_TEAM_INSTRUCTIONS: TeamInstructions = {
  mentality: 3, pressing: 3, defensiveLine: 3, width: 3, tempo: 3, passingRisk: 3, buildUp: "balanced", focus: "balanced",
  attackingTransition: "balanced", defensiveTransition: "balanced", offsideTrap: false, timeWasting: false, gkDistribution: "balanced", crossStyle: "mixed",
};

export const DEFAULT_SET_PIECES: SetPieceInstructions = {
  cornerDelivery: "mixed", playersForwardOnCorners: "normal", freeKickApproach: "mixed", defendCorners: "mixed", playersBackForCounter: 2,
};

type SlotSeed = [id: string, pos: Position, x: number, y: number, role?: string, duty?: Duty];

/** Out-of-possession base shapes. x: own goal 0 → opponent goal 100, y: left 0 → right 100. */
export const FORMATION_PRESETS: Record<string, SlotSeed[]> = {
  "4-3-3": [["GK", "GK", 5, 50], ["LB", "LB", 26, 14], ["LCB", "CB", 22, 38], ["RCB", "CB", 22, 62], ["RB", "RB", 26, 86], ["DM", "DM", 37, 50], ["LCM", "CM", 47, 32, "box_to_box", "support"], ["RCM", "CM", 47, 68, "central_midfielder", "attack"], ["LW", "LW", 63, 14, "inside_forward", "attack"], ["ST", "ST", 68, 50], ["RW", "RW", 63, 86, "inverted_winger", "support"]],
  "4-2-3-1": [["GK", "GK", 5, 50], ["LB", "LB", 26, 14], ["LCB", "CB", 22, 38], ["RCB", "CB", 22, 62], ["RB", "RB", 26, 86], ["LDM", "DM", 38, 38, "deep_lying_playmaker", "defend"], ["RDM", "DM", 38, 62, "ball_winning_midfielder", "support"], ["LAM", "LM", 56, 15, "inverted_winger", "support"], ["AM", "AM", 57, 50, "advanced_playmaker", "attack"], ["RAM", "RM", 56, 85, "traditional_winger", "attack"], ["ST", "ST", 68, 50]],
  "4-4-2": [["GK", "GK", 5, 50], ["LB", "LB", 26, 14], ["LCB", "CB", 22, 38], ["RCB", "CB", 22, 62], ["RB", "RB", 26, 86], ["LM", "LM", 44, 18], ["LCM", "CM", 40, 42, "ball_winning_midfielder", "defend"], ["RCM", "CM", 42, 58, "box_to_box", "support"], ["RM", "RM", 44, 82], ["LST", "ST", 62, 42, "pressing_forward", "support"], ["RST", "ST", 64, 58, "advanced_forward", "attack"]],
  "3-5-2": [["GK", "GK", 5, 50], ["LCB", "CB", 22, 28], ["CB", "CB", 20, 50, "ball_playing_defender", "defend"], ["RCB", "CB", 22, 72], ["LWB", "LWB", 40, 10], ["DM", "DM", 36, 50], ["LCM", "CM", 47, 35, "box_to_box", "support"], ["RCM", "CM", 47, 65, "advanced_playmaker", "support"], ["RWB", "RWB", 40, 90], ["LST", "ST", 65, 40, "pressing_forward", "support"], ["RST", "ST", 66, 60, "advanced_forward", "attack"]],
  "3-4-3": [["GK", "GK", 5, 50], ["LCB", "CB", 22, 28], ["CB", "CB", 20, 50], ["RCB", "CB", 22, 72], ["LWB", "LWB", 42, 10], ["LCM", "CM", 44, 38, "deep_lying_playmaker", "support"], ["RCM", "CM", 44, 62, "box_to_box", "support"], ["RWB", "RWB", 42, 90], ["LW", "LW", 63, 20, "inside_forward", "attack"], ["ST", "ST", 68, 50], ["RW", "RW", 63, 80, "inside_forward", "attack"]],
  "3-2-4-1": [["GK", "GK", 5, 50, "sweeper_keeper", "support"], ["LCB", "CB", 22, 28], ["CB", "CB", 20, 50, "ball_playing_defender", "defend"], ["RCB", "CB", 22, 72], ["LDM", "DM", 37, 40, "deep_lying_playmaker", "support"], ["RDM", "DM", 37, 60, "holding_midfielder", "defend"], ["LW", "LM", 55, 12, "traditional_winger", "attack"], ["LAM", "AM", 58, 38, "advanced_playmaker", "support"], ["RAM", "AM", 58, 62, "shadow_striker", "attack"], ["RW", "RM", 55, 88, "traditional_winger", "attack"], ["ST", "ST", 68, 50, "false_nine", "support"]],
  "4-1-4-1": [["GK", "GK", 5, 50], ["LB", "LB", 26, 14], ["LCB", "CB", 22, 38], ["RCB", "CB", 22, 62], ["RB", "RB", 26, 86], ["DM", "DM", 35, 50], ["LM", "LM", 48, 14], ["LCM", "CM", 47, 38, "box_to_box", "support"], ["RCM", "CM", 47, 62, "advanced_playmaker", "attack"], ["RM", "RM", 48, 86], ["ST", "ST", 67, 50]],
  "5-3-2": [["GK", "GK", 5, 50], ["LWB", "LWB", 30, 8], ["LCB", "CB", 20, 30], ["CB", "CB", 18, 50], ["RCB", "CB", 20, 70], ["RWB", "RWB", 30, 92], ["LCM", "CM", 42, 32], ["CM", "CM", 40, 50, "deep_lying_playmaker", "defend"], ["RCM", "CM", 42, 68, "box_to_box", "support"], ["LST", "ST", 62, 40, "target_forward", "support"], ["RST", "ST", 64, 60, "poacher", "attack"]],
  "4-3-1-2": [["GK", "GK", 5, 50], ["LB", "LB", 26, 14, "wing_back", "attack"], ["LCB", "CB", 22, 38], ["RCB", "CB", 22, 62], ["RB", "RB", 26, 86, "wing_back", "attack"], ["DM", "DM", 36, 50, "holding_midfielder", "defend"], ["LCM", "CM", 45, 34], ["RCM", "CM", 45, 66, "box_to_box", "support"], ["AM", "AM", 57, 50, "advanced_playmaker", "attack"], ["LST", "ST", 66, 40], ["RST", "ST", 66, 60, "pressing_forward", "support"]],
};

/** Derive a sensible in-possession position from an out-of-possession slot. */
export function deriveInPossession(pos: Position, role: string, duty: Duty, x: number, y: number): { x: number; y: number } {
  const m = roleMods(role, duty);
  let nx = x + 10 + m.forwardRuns * 10 - m.dropDeep * 12;
  let ny = y;
  if (pos === "GK") return { x: Math.min(x + 3 + m.sweeper * 6, 20), y };
  if (m.cutInside > 0) ny = y + (50 - y) * 0.35 * m.cutInside;
  if (m.cutInside < 0) ny = y + (y < 50 ? -6 : 6);
  if (["LB", "RB", "LWB", "RWB"].includes(pos) && m.cutInside <= 0) nx += 8;
  nx = clamp(nx, 4, 92);
  ny = clamp(ny, 3, 97);
  return { x: Math.round(nx), y: Math.round(ny) };
}

export function buildSlots(preset: string): TacticSlot[] {
  const seeds = FORMATION_PRESETS[preset];
  if (!seeds) throw new Error(`Unknown formation preset ${preset}`);
  return seeds.map(([id, pos, x, y, role, duty]) => {
    const r = role ?? defaultRoleFor(pos);
    const d: Duty = duty ?? (pos === "GK" || pos === "CB" ? "defend" : pos === "ST" ? "attack" : "support");
    return {
      id,
      position: pos,
      role: r,
      duty: d,
      outOfPossession: { x, y },
      inPossession: deriveInPossession(pos, r, d, x, y),
      instructions: { ...DEFAULT_PLAYER_INSTRUCTIONS },
    };
  });
}

/** Infer a formation label (e.g. "4-2-3-1") from the out-of-possession shape. */
export function formationLabel(slots: TacticSlot[]): string {
  const outfield = slots.filter((s) => s.position !== "GK").map((s) => s.outOfPossession.x).sort((a, b) => a - b);
  if (outfield.length === 0) return "-";
  const lines: number[] = [];
  let last = -100;
  for (const x of outfield) {
    if (x - last > 6) lines.push(1);
    else lines[lines.length - 1]++;
    last = x;
  }
  return lines.join("-");
}

/** Map pitch coordinates to the closest natural position (used by the custom formation editor). */
export function positionFromCoords(x: number, y: number): Position {
  if (x < 10) return "GK";
  const wide = y < 25 ? "L" : y > 75 ? "R" : "C";
  if (x < 30) return wide === "L" ? "LB" : wide === "R" ? "RB" : "CB";
  if (x < 38) return wide === "L" ? "LWB" : wide === "R" ? "RWB" : "DM";
  if (x < 52) return wide === "L" ? "LM" : wide === "R" ? "RM" : "CM";
  if (x < 62) return wide === "L" ? "LM" : wide === "R" ? "RM" : "AM";
  return wide === "L" ? "LW" : wide === "R" ? "RW" : "ST";
}

export function createTactic(id: string, clubId: string, name: string, preset: string, date: string, team?: Partial<TeamInstructions>): TacticalSystem {
  const slots = buildSlots(preset);
  return {
    id,
    clubId,
    name,
    formationLabel: formationLabel(slots),
    slots,
    team: { ...DEFAULT_TEAM_INSTRUCTIONS, ...team },
    setPieces: { ...DEFAULT_SET_PIECES },
    familiarity: 70,
    createdDate: date,
  };
}

export function cloneTactic(t: TacticalSystem, id: string, name: string): TacticalSystem {
  return JSON.parse(JSON.stringify({ ...t, id, name })) as TacticalSystem;
}
