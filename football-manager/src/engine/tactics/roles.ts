import type { AttributeKey, Duty, Position } from "../core/types";

/**
 * Role modifiers consumed by the match engine. Every value is in roughly
 * [-1, 1] and shifts action selection / positioning probabilities.
 */
export interface RoleMods {
  dribble: number;
  shoot: number;
  cross: number;
  passRisk: number;
  forwardRuns: number;
  press: number;
  holdUp: number;
  aerial: number;
  playmaker: number; // likelihood to receive and distribute the ball
  defensive: number; // defensive contribution / screening
  cutInside: number;
  sweeper: number; // GK sweeping / rushing out
  longPass: number;
  dropDeep: number; // drops into midfield to receive
}

export interface RoleDef {
  id: string;
  name: string;
  positions: Position[];
  duties: Duty[];
  description: string;
  keyAttributes: AttributeKey[];
  mods: Partial<RoleMods>;
}

export const ROLES: RoleDef[] = [
  { id: "goalkeeper", name: "Goalkeeper", positions: ["GK"], duties: ["defend"], description: "Stays on the line and prioritises shot stopping.", keyAttributes: ["reflexes", "handling", "positioning", "aerialReach"], mods: { sweeper: -0.5 } },
  { id: "sweeper_keeper", name: "Sweeper Keeper", positions: ["GK"], duties: ["defend", "support", "attack"], description: "Rushes out to sweep behind a high line and starts attacks with short passing.", keyAttributes: ["oneOnOnes", "kicking", "anticipation", "composure"], mods: { sweeper: 1, passRisk: 0.3, playmaker: 0.2 } },

  { id: "central_defender", name: "Central Defender", positions: ["CB"], duties: ["defend", "support"], description: "Wins the ball, clears danger, keeps it simple.", keyAttributes: ["tackling", "marking", "heading", "positioning"], mods: { defensive: 1, passRisk: -0.5, forwardRuns: -1 } },
  { id: "ball_playing_defender", name: "Ball-Playing Defender", positions: ["CB"], duties: ["defend", "support"], description: "Breaks lines with progressive and long passes from the back.", keyAttributes: ["passing", "composure", "vision", "tackling"], mods: { defensive: 0.7, passRisk: 0.5, longPass: 0.8, playmaker: 0.3, forwardRuns: -0.8 } },
  { id: "full_back", name: "Full-Back", positions: ["LB", "RB"], duties: ["defend", "support", "attack"], description: "Balanced full-back who supports attacks down the flank.", keyAttributes: ["tackling", "positioning", "pace", "crossing"], mods: { defensive: 0.5, cross: 0.3, forwardRuns: 0.2 } },
  { id: "overlapping_full_back", name: "Overlapping Full-Back", positions: ["LB", "RB", "LWB", "RWB"], duties: ["support", "attack"], description: "Bombs on outside the winger to deliver crosses.", keyAttributes: ["stamina", "crossing", "pace", "offTheBall"], mods: { forwardRuns: 1, cross: 0.8, defensive: 0.1, dribble: 0.2 } },
  { id: "inverted_full_back", name: "Inverted Full-Back", positions: ["LB", "RB"], duties: ["defend", "support"], description: "Tucks into midfield in possession to create overloads centrally.", keyAttributes: ["passing", "decisions", "positioning", "firstTouch"], mods: { cutInside: 1, playmaker: 0.4, defensive: 0.6, cross: -0.6, forwardRuns: 0.2 } },
  { id: "wing_back", name: "Wing-Back", positions: ["LWB", "RWB", "LB", "RB"], duties: ["support", "attack"], description: "Provides the width on their own flank, defending and attacking.", keyAttributes: ["stamina", "crossing", "workRate", "pace"], mods: { forwardRuns: 0.8, cross: 0.7, dribble: 0.3 } },

  { id: "holding_midfielder", name: "Holding Midfielder", positions: ["DM", "CM"], duties: ["defend"], description: "Screens the defence and holds position.", keyAttributes: ["positioning", "tackling", "anticipation", "teamwork"], mods: { defensive: 1, forwardRuns: -1, passRisk: -0.4 } },
  { id: "deep_lying_playmaker", name: "Deep-Lying Playmaker", positions: ["DM", "CM"], duties: ["defend", "support"], description: "Dictates tempo from deep with a range of passing.", keyAttributes: ["passing", "vision", "composure", "decisions"], mods: { playmaker: 1, longPass: 0.8, passRisk: 0.4, defensive: 0.4, forwardRuns: -0.6 } },
  { id: "ball_winning_midfielder", name: "Ball-Winning Midfielder", positions: ["DM", "CM"], duties: ["defend", "support"], description: "Harasses opponents, presses and tackles aggressively.", keyAttributes: ["tackling", "aggression", "workRate", "stamina"], mods: { press: 1, defensive: 0.8, passRisk: -0.3 } },
  { id: "central_midfielder", name: "Central Midfielder", positions: ["CM"], duties: ["defend", "support", "attack"], description: "All-round midfielder.", keyAttributes: ["passing", "decisions", "teamwork", "stamina"], mods: { playmaker: 0.3, defensive: 0.3 } },
  { id: "box_to_box", name: "Box-to-Box Midfielder", positions: ["CM"], duties: ["support"], description: "Covers ground in both boxes, arriving late to shoot.", keyAttributes: ["stamina", "workRate", "passing", "tackling"], mods: { forwardRuns: 0.7, shoot: 0.3, press: 0.4, defensive: 0.4 } },
  { id: "advanced_playmaker", name: "Advanced Playmaker", positions: ["CM", "AM", "LM", "RM"], duties: ["support", "attack"], description: "Finds pockets between the lines and plays the killer pass.", keyAttributes: ["vision", "passing", "technique", "firstTouch"], mods: { playmaker: 1, passRisk: 0.7, dribble: 0.2, defensive: -0.3 } },
  { id: "attacking_midfielder", name: "Attacking Midfielder", positions: ["AM"], duties: ["support", "attack"], description: "Links midfield to attack and shoots from distance.", keyAttributes: ["technique", "longShots", "offTheBall", "passing"], mods: { shoot: 0.5, forwardRuns: 0.5, playmaker: 0.4, defensive: -0.4 } },
  { id: "shadow_striker", name: "Shadow Striker", positions: ["AM"], duties: ["attack"], description: "Bursts beyond the striker into the box.", keyAttributes: ["offTheBall", "finishing", "composure", "acceleration"], mods: { forwardRuns: 1, shoot: 0.8, defensive: -0.6 } },

  { id: "wide_midfielder", name: "Wide Midfielder", positions: ["LM", "RM"], duties: ["defend", "support", "attack"], description: "Works the flank in both phases.", keyAttributes: ["workRate", "crossing", "passing", "stamina"], mods: { cross: 0.5, defensive: 0.4 } },
  { id: "traditional_winger", name: "Traditional Winger", positions: ["LM", "RM", "LW", "RW"], duties: ["support", "attack"], description: "Hugs the touchline, beats the full-back and crosses.", keyAttributes: ["crossing", "dribbling", "pace", "acceleration"], mods: { cross: 1, dribble: 0.6, cutInside: -1, defensive: -0.3 } },
  { id: "inverted_winger", name: "Inverted Winger", positions: ["LM", "RM", "LW", "RW"], duties: ["support", "attack"], description: "Drifts inside on their stronger foot to create and shoot.", keyAttributes: ["dribbling", "passing", "technique", "vision"], mods: { cutInside: 1, dribble: 0.6, shoot: 0.4, playmaker: 0.3, cross: -0.4 } },
  { id: "inside_forward", name: "Inside Forward", positions: ["LW", "RW"], duties: ["support", "attack"], description: "Cuts inside to attack the goal directly.", keyAttributes: ["finishing", "dribbling", "offTheBall", "acceleration"], mods: { cutInside: 1, shoot: 0.9, forwardRuns: 0.7, dribble: 0.5, cross: -0.6, defensive: -0.4 } },

  { id: "advanced_forward", name: "Advanced Forward", positions: ["ST"], duties: ["attack"], description: "Plays on the shoulder of the last defender.", keyAttributes: ["offTheBall", "finishing", "pace", "acceleration"], mods: { forwardRuns: 1, shoot: 0.6, defensive: -0.8 } },
  { id: "pressing_forward", name: "Pressing Forward", positions: ["ST"], duties: ["defend", "support", "attack"], description: "Leads the press from the front.", keyAttributes: ["workRate", "stamina", "aggression", "anticipation"], mods: { press: 1, forwardRuns: 0.3, shoot: 0.2 } },
  { id: "target_forward", name: "Target Forward", positions: ["ST"], duties: ["support", "attack"], description: "Physical focal point who holds up the ball and wins headers.", keyAttributes: ["strength", "heading", "jumping", "firstTouch"], mods: { holdUp: 1, aerial: 1, forwardRuns: -0.2, dribble: -0.4 } },
  { id: "false_nine", name: "False Nine", positions: ["ST"], duties: ["support"], description: "Drops deep to link play and drag centre-backs out.", keyAttributes: ["passing", "vision", "technique", "dribbling"], mods: { dropDeep: 1, playmaker: 0.8, dribble: 0.3, forwardRuns: -0.6, shoot: -0.1 } },
  { id: "poacher", name: "Poacher", positions: ["ST"], duties: ["attack"], description: "Lives in the box and finishes chances.", keyAttributes: ["finishing", "offTheBall", "composure", "anticipation"], mods: { shoot: 1, forwardRuns: 0.8, playmaker: -0.6, defensive: -1 } },
];

export const ROLE_MAP: Record<string, RoleDef> = Object.fromEntries(ROLES.map((r) => [r.id, r]));

const ZERO: RoleMods = { dribble: 0, shoot: 0, cross: 0, passRisk: 0, forwardRuns: 0, press: 0, holdUp: 0, aerial: 0, playmaker: 0, defensive: 0, cutInside: 0, sweeper: 0, longPass: 0, dropDeep: 0 };

export function roleMods(roleId: string, duty: Duty): RoleMods {
  const r = ROLE_MAP[roleId];
  const m: RoleMods = { ...ZERO, ...(r?.mods ?? {}) };
  if (duty === "attack") {
    m.forwardRuns += 0.35;
    m.shoot += 0.15;
    m.defensive -= 0.25;
  } else if (duty === "defend") {
    m.forwardRuns -= 0.4;
    m.defensive += 0.3;
    m.shoot -= 0.15;
  }
  return m;
}

export function rolesForPosition(pos: string): RoleDef[] {
  return ROLES.filter((r) => r.positions.includes(pos as Position));
}

export function defaultRoleFor(pos: Position): string {
  switch (pos) {
    case "GK": return "goalkeeper";
    case "CB": return "central_defender";
    case "LB": case "RB": return "full_back";
    case "LWB": case "RWB": return "wing_back";
    case "DM": return "holding_midfielder";
    case "CM": return "central_midfielder";
    case "AM": return "attacking_midfielder";
    case "LM": case "RM": return "wide_midfielder";
    case "LW": case "RW": return "inside_forward";
    case "ST": return "advanced_forward";
  }
}
