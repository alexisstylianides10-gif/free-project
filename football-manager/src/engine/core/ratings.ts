import type { AttributeKey, Attributes, Player, Position } from "./types";
import { ageOn, yearsBetween } from "./dates";
import { clamp } from "./util";

/**
 * Overall rating model.
 *
 * Overall (1–100) = position-weighted mean of 1–20 attributes × 5.
 * A player's overall is always calculated from attributes (never stored
 * independently), so it is consistent everywhere in the game.
 */
type Weights = Partial<Record<AttributeKey, number>>;

export const POSITION_WEIGHTS: Record<Position, Weights> = {
  GK: { reflexes: 5, handling: 4, oneOnOnes: 3, aerialReach: 3, commandOfArea: 3, kicking: 2, positioning: 3, composure: 2, decisions: 2, agility: 2, anticipation: 1 },
  CB: { tackling: 4, marking: 4, heading: 4, positioning: 4, strength: 3, jumping: 3, anticipation: 2, composure: 2, decisions: 2, pace: 2, passing: 1 },
  LB: { tackling: 3, marking: 3, positioning: 3, pace: 3, acceleration: 2, stamina: 3, crossing: 2, passing: 2, workRate: 2, anticipation: 2, dribbling: 1, teamwork: 1 },
  RB: { tackling: 3, marking: 3, positioning: 3, pace: 3, acceleration: 2, stamina: 3, crossing: 2, passing: 2, workRate: 2, anticipation: 2, dribbling: 1, teamwork: 1 },
  LWB: { crossing: 3, stamina: 4, pace: 3, acceleration: 2, workRate: 3, tackling: 2, marking: 2, dribbling: 2, passing: 2, positioning: 2, offTheBall: 1 },
  RWB: { crossing: 3, stamina: 4, pace: 3, acceleration: 2, workRate: 3, tackling: 2, marking: 2, dribbling: 2, passing: 2, positioning: 2, offTheBall: 1 },
  DM: { tackling: 4, positioning: 4, anticipation: 3, passing: 3, marking: 2, decisions: 3, teamwork: 2, workRate: 2, stamina: 2, strength: 2, composure: 2 },
  CM: { passing: 4, vision: 3, decisions: 3, firstTouch: 3, technique: 2, stamina: 3, workRate: 2, teamwork: 2, tackling: 2, anticipation: 2, composure: 2, offTheBall: 1 },
  LM: { crossing: 3, pace: 3, stamina: 3, dribbling: 3, passing: 2, workRate: 2, technique: 2, offTheBall: 2, acceleration: 2, firstTouch: 1, teamwork: 1 },
  RM: { crossing: 3, pace: 3, stamina: 3, dribbling: 3, passing: 2, workRate: 2, technique: 2, offTheBall: 2, acceleration: 2, firstTouch: 1, teamwork: 1 },
  AM: { passing: 3, vision: 4, technique: 3, firstTouch: 3, dribbling: 3, decisions: 3, offTheBall: 2, composure: 2, longShots: 2, finishing: 1, agility: 1 },
  LW: { dribbling: 4, pace: 4, acceleration: 3, crossing: 2, technique: 3, finishing: 2, offTheBall: 2, agility: 2, firstTouch: 2, passing: 1, composure: 1 },
  RW: { dribbling: 4, pace: 4, acceleration: 3, crossing: 2, technique: 3, finishing: 2, offTheBall: 2, agility: 2, firstTouch: 2, passing: 1, composure: 1 },
  ST: { finishing: 5, offTheBall: 4, composure: 3, firstTouch: 3, heading: 2, pace: 3, acceleration: 2, strength: 2, technique: 2, dribbling: 1, anticipation: 2 },
};

export function ratingAt(attrs: Attributes, pos: Position): number {
  const w = POSITION_WEIGHTS[pos];
  let total = 0;
  let wsum = 0;
  for (const k in w) {
    const key = k as AttributeKey;
    const weight = w[key] ?? 0;
    if (!weight || attrs[key] === undefined) continue;
    total += attrs[key] * weight;
    wsum += weight;
  }
  if (wsum === 0) return 1;
  return clamp(Math.round((total / wsum) * 5), 1, 100);
}

export function overall(p: Pick<Player, "attributes" | "position">): number {
  return ratingAt(p.attributes, p.position);
}

/** How comfortable a player is at a position: 1 = natural, 0.9 = alternative, lower = unfamiliar. */
export function positionFamiliarity(p: Pick<Player, "position" | "altPositions">, pos: Position): number {
  if (p.position === pos) return 1;
  if (p.altPositions.includes(pos)) return 0.93;
  const groupOf = (x: Position) => POSITION_GROUP[x];
  if (groupOf(p.position) === groupOf(pos)) return 0.8;
  if (pos === "GK" || p.position === "GK") return 0.25;
  if (ADJACENT[p.position]?.includes(pos)) return 0.72;
  return 0.55;
}

export const POSITION_GROUP: Record<Position, "GK" | "DEF" | "MID" | "ATT"> = {
  GK: "GK", LB: "DEF", CB: "DEF", RB: "DEF", LWB: "DEF", RWB: "DEF",
  DM: "MID", CM: "MID", LM: "MID", RM: "MID", AM: "MID",
  LW: "ATT", RW: "ATT", ST: "ATT",
};

const ADJACENT: Partial<Record<Position, Position[]>> = {
  LB: ["LWB", "LM", "CB"], RB: ["RWB", "RM", "CB"], LWB: ["LB", "LM", "LW"], RWB: ["RB", "RM", "RW"],
  CB: ["DM", "LB", "RB"], DM: ["CB", "CM"], CM: ["DM", "AM", "LM", "RM"], AM: ["CM", "ST", "LW", "RW"],
  LM: ["LW", "LB", "CM", "LWB"], RM: ["RW", "RB", "CM", "RWB"], LW: ["LM", "ST", "AM"], RW: ["RM", "ST", "AM"], ST: ["AM", "LW", "RW"],
};

/** Effective rating at a position (overall at that position × familiarity). */
export function ratingInPosition(p: Player, pos: Position): number {
  return Math.round(ratingAt(p.attributes, pos) * positionFamiliarity(p, pos));
}

/**
 * Market value model (explicit and deterministic).
 * value = base(overall) × age factor × potential bonus × contract factor × reputation factor
 */
export function marketValue(p: Player, today: string, leagueReputation = 60): number {
  const ovr = overall(p);
  const age = ageOn(p.dob, today);
  const base = 12_000 * Math.pow(1.105, ovr - 40);
  let ageF: number;
  if (age <= 21) ageF = 1.35;
  else if (age <= 24) ageF = 1.25;
  else if (age <= 27) ageF = 1.1;
  else if (age <= 29) ageF = 0.9;
  else if (age <= 31) ageF = 0.6;
  else if (age <= 33) ageF = 0.35;
  else ageF = 0.15;
  const potGap = Math.max(0, p.potential - ovr);
  const potF = age <= 24 ? 1 + potGap * 0.035 : 1 + potGap * 0.01;
  let contractF = 1;
  if (p.contract) {
    const yearsLeft = yearsBetween(today, p.contract.endDate);
    contractF = yearsLeft < 0.5 ? 0.35 : yearsLeft < 1 ? 0.6 : yearsLeft < 2 ? 0.85 : 1;
  } else contractF = 0.0;
  const repF = 0.7 + leagueReputation / 200;
  const v = base * ageF * potF * contractF * repF;
  if (v < 10_000) return p.contract ? 10_000 : 0;
  const mag = 10 ** Math.max(0, Math.floor(Math.log10(v)) - 1);
  return Math.round(v / mag) * mag;
}

/** Wage a player expects (per week) given ability and reputation of the hiring club. */
export function expectedWage(p: Player, clubReputation: number, today: string): number {
  const ovr = overall(p);
  const age = ageOn(p.dob, today);
  let w = 400 * Math.pow(1.095, ovr - 40);
  w *= 0.6 + clubReputation / 120;
  if (age >= 31) w *= 0.85;
  if (age <= 20) w *= 0.7;
  const mag = 10 ** Math.max(0, Math.floor(Math.log10(w)) - 1);
  return Math.max(250, Math.round(w / mag) * mag);
}
