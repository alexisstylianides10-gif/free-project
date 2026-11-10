import type {
  AttributeKey, ID, MatchEvent, MatchEventType, Player, PlayerMatchLine, Position, TacticSlot, TacticalSystem, TeamMatchStats,
} from "../core/types";
import { Rng } from "../core/rng";
import { clamp } from "../core/util";
import { positionFamiliarity } from "../core/ratings";
import { roleMods, type RoleMods } from "../tactics/roles";
import { expectedGoals, logit } from "./xg";

// ---------------------------------------------------------------------------
// Public input / output types
// ---------------------------------------------------------------------------

export interface EngineTeamInput {
  clubId: ID;
  name: string;
  tactic: TacticalSystem;
  /** slot id -> player */
  starters: { slotId: string; player: Player }[];
  bench: Player[];
  captainId: ID | null;
  penaltyTakerId: ID | null;
  freeKickTakerId: ID | null;
  cornerTakerId: ID | null;
  /** 0-100 – how well the squad knows the tactical system. */
  cohesion: number;
  maxSubs: number;
  /** When true the engine will not make automatic substitutions / tactical changes for this side. */
  manualControl: boolean;
}

export interface EngineOptions {
  seed: number;
  homeAdvantage: boolean;
  /** Match must produce a winner (knockout single leg or second leg). */
  requiresWinner: boolean;
  extraTime: boolean;
  penalties: boolean;
  /** Goals from earlier legs [homeSide, awaySide] (aggregate ties). */
  priorGoals: [number, number] | null;
  /** Away goals for prior legs [homeSide away goals, awaySide away goals] – used only if awayGoalsRule. */
  priorAwayGoals: [number, number] | null;
  awayGoalsRule: boolean;
  /** Record every event (needed for 2D replay & commentary). */
  detailed: boolean;
}

export interface InjuryOutcome {
  playerId: ID;
  days: number;
  type: string;
}

export interface EngineResult {
  goals: [number, number];
  extraTime: boolean;
  penalties: { home: number; away: number } | null;
  winnerSide: 0 | 1 | null;
  stats: [TeamMatchStats, TeamMatchStats];
  lines: PlayerMatchLine[];
  events: MatchEvent[];
  injuries: InjuryOutcome[];
  playerOfMatchId: ID | null;
  shapes: { side: 0 | 1; playerId: ID; ip: { x: number; y: number }; op: { x: number; y: number } }[];
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

interface PState {
  p: Player;
  side: 0 | 1;
  slot: TacticSlot;
  pos: Position;
  mods: RoleMods;
  energy: number;
  baseFactor: number;
  onPitch: boolean;
  started: boolean;
  minuteOn: number;
  minuteOff: number | null;
  yellow: number;
  red: boolean;
  injured: boolean;
  rating: number;
  line: PlayerMatchLine;
  /** Commentary name: surname, or initial + surname when two players in the match share it. */
  label: string;
}

interface TeamState {
  side: 0 | 1;
  input: EngineTeamInput;
  tactic: TacticalSystem;
  players: PState[]; // everyone who has been involved (starters + used subs)
  bench: Player[];
  subsUsed: number;
  stats: TeamMatchStats;
  possessionSeconds: number;
  cohesion: number;
  timeWasting: boolean;
  /** Shape normalisation: formations change structure, not the team's overall height. */
  ipShift: number;
  opShift: number;
}

const IP_TARGET = 63; // average outfield x in possession
const OP_TARGET = 37; // average outfield x out of possession

function shapeShifts(t: TacticalSystem): { ip: number; op: number } {
  const out = t.slots.filter((s) => s.position !== "GK");
  if (!out.length) return { ip: 0, op: 0 };
  const ip = out.reduce((a, s) => a + s.inPossession.x, 0) / out.length;
  const op = out.reduce((a, s) => a + s.outOfPossession.x, 0) / out.length;
  // keep a little of the formation's own character (25%)
  return { ip: (IP_TARGET - ip) * 0.75, op: (OP_TARGET - op) * 0.75 };
}

const KEY_EVENTS: ReadonlySet<MatchEventType> = new Set([
  "kickoff", "goal", "yellow", "red", "second_yellow", "substitution", "injury", "penalty", "penalty_miss", "penalty_saved",
  "half_time", "full_time", "extra_time", "shootout_goal", "shootout_miss", "tactic_change",
]);

function emptyStats(): TeamMatchStats {
  return { possession: 50, shots: 0, shotsOnTarget: 0, xg: 0, passes: 0, passesCompleted: 0, tackles: 0, interceptions: 0, fouls: 0, corners: 0, offsides: 0, saves: 0, yellow: 0, red: 0, crosses: 0, dribbles: 0, pressWins: 0 };
}

function lvl(v: number): number {
  return (v - 3) / 2; // maps 1..5 -> -1..1
}

const dist = (ax: number, ay: number, bx: number, by: number): number => {
  const dx = (ax - bx) * 1.05;
  const dy = (ay - by) * 0.68;
  return Math.sqrt(dx * dx + dy * dy);
};

/** Distance from point to segment in metres (pitch scaled). */
function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const PX = px * 1.05, PY = py * 0.68, AX = ax * 1.05, AY = ay * 0.68, BX = bx * 1.05, BY = by * 0.68;
  const vx = BX - AX, vy = BY - AY;
  const len2 = vx * vx + vy * vy;
  const t = len2 > 0 ? clamp(((PX - AX) * vx + (PY - AY) * vy) / len2, 0, 1) : 0;
  const cx = AX + t * vx, cy = AY + t * vy;
  return Math.sqrt((PX - cx) ** 2 + (PY - cy) ** 2);
}

function name(ps: PState | null | undefined): string {
  return ps ? ps.label : "someone";
}

// ---------------------------------------------------------------------------
// Match simulation
// ---------------------------------------------------------------------------

/**
 * Possession-chain football simulation.
 *
 * Every action is resolved spatially: players occupy positions derived from
 * their tactical slot (in/out of possession shapes), shifted with the ball,
 * team width, defensive line and pressing. Pass/dribble/shot/cross outcomes
 * depend on the individual attributes of the players involved, their
 * condition, role, instructions, positional familiarity and team cohesion.
 * The simulation is deterministic for a given seed and inputs.
 */
export class MatchSimulation {
  readonly rng: Rng;
  readonly teams: [TeamState, TeamState];
  readonly options: EngineOptions;
  events: MatchEvent[] = [];
  goals: [number, number] = [0, 0];
  minute = 0;
  second = 0;
  period: 1 | 2 | 3 | 4 | 5 = 1; // 5 = shootout
  finished = false;
  extraTimePlayed = false;
  shootout: { home: number; away: number } | null = null;
  private periodEnd = 45 * 60;
  private clock = 0; // seconds elapsed in match time
  private poss: 0 | 1 = 0;
  private carrier: PState | null = null;
  private bx = 50;
  private by = 50;
  private transition: { side: 0 | 1; ticks: number; max: number } | null = null;
  private counterMode = 0;
  /** Shifts every attribute so the match average sits at a reference level: quality is relative to the opponent, not absolute. */
  private attrShift = 0;
  private bigChanceNext = false;
  private lastPasser: PState | null = null;
  private stoppage = 0;
  private injuries: InjuryOutcome[] = [];
  private shapes: EngineResult["shapes"] = [];

  private dupSurnames = new Set<string>();

  constructor(home: EngineTeamInput, away: EngineTeamInput, options: EngineOptions) {
    this.rng = new Rng(options.seed);
    this.options = options;
    const seen = new Set<string>();
    for (const p of [...home.starters.map((s) => s.player), ...home.bench, ...away.starters.map((s) => s.player), ...away.bench]) {
      if (seen.has(p.lastName)) this.dupSurnames.add(p.lastName);
      seen.add(p.lastName);
    }
    let sum = 0, n = 0;
    for (const t of [home, away]) for (const { player } of t.starters) {
      if (player.position === "GK") continue;
      for (const v of Object.values(player.attributes)) { sum += v; n++; }
    }
    // 10.6 is the average attribute of a 70-rated side, where the engine is calibrated
    if (n) this.attrShift = clamp(10.6 - sum / n, -3, 3) * 0.85;
    this.teams = [this.buildTeam(home, 0), this.buildTeam(away, 1)];
    for (const t of this.teams) for (const ps of t.players) this.shapes.push({ side: t.side, playerId: ps.p.id, ip: { ...ps.slot.inPossession }, op: { ...ps.slot.outOfPossession } });
    this.kickoff(0);
    this.push("kickoff", 0, null, null, `Kick-off! ${home.name} get us under way against ${away.name}.`);
    this.stoppage = this.rng.int(1, 3);
    this.periodEnd = (45 + this.stoppage) * 60;
  }

  private buildTeam(input: EngineTeamInput, side: 0 | 1): TeamState {
    const tactic: TacticalSystem = JSON.parse(JSON.stringify(input.tactic));
    const players: PState[] = [];
    const team: TeamState = {
      side, input, tactic, players, bench: [...input.bench], subsUsed: 0, stats: emptyStats(), possessionSeconds: 0,
      cohesion: clamp(input.cohesion, 0, 100), timeWasting: tactic.team.timeWasting, ipShift: 0, opShift: 0,
    };
    const sh = shapeShifts(tactic);
    team.ipShift = sh.ip;
    team.opShift = sh.op;
    for (const { slotId, player } of input.starters) {
      const slot = tactic.slots.find((s) => s.id === slotId);
      if (!slot) continue;
      players.push(this.makePState(team, player, slot, 0, true));
    }
    return team;
  }

  private makePState(team: TeamState, p: Player, slot: TacticSlot, minute: number, started: boolean): PState {
    const fam = slot.position === "GK" ? (p.position === "GK" ? 1 : 0.3) : positionFamiliarity(p, slot.position);
    const morale = 0.94 + (p.morale / 100) * 0.12;
    const form = clamp(0.97 + (p.form - 6.5) * 0.02, 0.94, 1.04);
    const famF = 0.7 + 0.3 * fam;
    const cohesion = 0.95 + (team.cohesion / 100) * 0.07;
    const home = team.side === 0 && this.options.homeAdvantage ? 1.03 : 1;
    const mods = roleMods(slot.role, slot.duty);
    const ins = slot.instructions;
    mods.passRisk += ins.passRisk * 0.5;
    mods.dribble += ins.dribble * 0.5;
    mods.shoot += ins.shoot * 0.5;
    mods.cross += ins.cross * 0.5;
    mods.press += ins.press * 0.5;
    mods.forwardRuns += ins.forwardRuns * 0.5 - (ins.holdPosition ? 0.8 : 0);
    mods.cutInside += ins.width === -1 ? 0.5 : ins.width === 1 ? -0.5 : 0;
    const label = this.dupSurnames.has(p.lastName) && p.firstName ? `${p.firstName.charAt(0)}. ${p.lastName}` : p.lastName;
    return {
      p, side: team.side, slot, pos: slot.position, mods, label,
      energy: clamp(p.fitness, 30, 100),
      baseFactor: morale * form * famF * cohesion * home,
      onPitch: true, started, minuteOn: minute, minuteOff: null, yellow: 0, red: false, injured: false, rating: 6.0,
      line: {
        playerId: p.id, side: team.side, started, minutes: 0, position: slot.position, rating: 6, goals: 0, assists: 0, shots: 0, xg: 0,
        passes: 0, passesCompleted: 0, tackles: 0, interceptions: 0, saves: 0, yellow: 0, red: 0, fatigueEnd: 0,
      },
    };
  }

  // ----- helpers ------------------------------------------------------------

  private onPitch(side: 0 | 1): PState[] {
    return this.teams[side].players.filter((x) => x.onPitch);
  }

  private eff(ps: PState, key: AttributeKey): number {
    const cond = 0.72 + 0.28 * (ps.energy / 100);
    return Math.max(1, ps.p.attributes[key] + this.attrShift) * cond * ps.baseFactor;
  }

  private gk(side: 0 | 1): PState | null {
    const list = this.onPitch(side);
    return list.find((x) => x.pos === "GK") ?? null;
  }

  private cacheKey: number[] = [-1, -1, -1, -1, -1];
  private posCache = new Map<PState, { x: number; y: number }>();

  /** Player position in the frame of `frameSide` (attacking frame of that side). Cached per ball state. */
  private playerPos(ps: PState, frameSide: 0 | 1): { x: number; y: number } {
    const tk = this.transition ? this.transition.ticks : -1;
    const k = this.cacheKey;
    if (k[0] !== this.poss || k[1] !== this.bx || k[2] !== this.by || k[3] !== tk || k[4] !== this.shapeVersion) {
      this.posCache.clear();
      k[0] = this.poss; k[1] = this.bx; k[2] = this.by; k[3] = tk; k[4] = this.shapeVersion;
    }
    let own = this.posCache.get(ps);
    if (!own) {
      own = this.computePos(ps);
      this.posCache.set(ps, own);
    }
    if (frameSide !== ps.side) return { x: 100 - own.x, y: 100 - own.y };
    return own;
  }

  private shapeVersion = 0;

  private computePos(ps: PState): { x: number; y: number } {
    const t = this.teams[ps.side];
    const ti = t.tactic.team;
    const attacking = this.poss === ps.side;
    // ball in this player's own frame
    const ballOwnX = this.poss === ps.side ? this.bx : 100 - this.bx;
    const ballOwnY = this.poss === ps.side ? this.by : 100 - this.by;
    let x: number, y: number;
    if (attacking) {
      const base = ps.slot.inPossession;
      x = base.x + (ps.pos === "GK" ? 0 : t.ipShift) + (ballOwnX - 50) * 0.3 + lvl(ti.mentality) * 4;
      const widthF = 0.78 + (ti.width - 1) * 0.11;
      y = 50 + (base.y - 50) * widthF;
      // attackers hold the edge of the box rather than standing on the goal line
      if (x > 86) x = 86 + (x - 86) * 0.3;
    } else {
      let base = ps.slot.outOfPossession;
      if (this.transition && this.transition.side === ps.side && this.transition.ticks > 0) {
        const k = this.transition.ticks / this.transition.max;
        const ip = ps.slot.inPossession;
        base = { x: base.x + (ip.x - base.x) * k, y: base.y + (ip.y - base.y) * k };
      }
      const line = lvl(ti.defensiveLine) * 5 + lvl(ti.mentality) * 2;
      x = base.x + (ps.pos === "GK" ? 0 : t.opShift) + line + (ballOwnX - 50) * 0.3;
      y = base.y + (ballOwnY - 50) * 0.28;
      if (ps.pos === "GK") x = 3 + Math.max(0, line * 0.6) + ps.mods.sweeper * 4;
    }
    x = clamp(x, 1, 99);
    y = clamp(y, 2, 98);
    return { x, y };
  }

  private push(type: MatchEventType, side: 0 | 1, player: PState | null, other: PState | null, text: string, xg?: number): void {
    if (!this.options.detailed && !KEY_EVENTS.has(type)) return;
    // convert ball position to home frame
    const hx = this.poss === 0 ? this.bx : 100 - this.bx;
    const hy = this.poss === 0 ? this.by : 100 - this.by;
    const m = Math.floor(this.clock / 60);
    this.events.push({ minute: m, second: Math.floor(this.clock % 60), type, side, playerId: player?.p.id ?? null, otherPlayerId: other?.p.id ?? null, x: Math.round(hx * 10) / 10, y: Math.round(hy * 10) / 10, xg, text });
  }

  private kickoff(side: 0 | 1): void {
    this.poss = side;
    this.bx = 50;
    this.by = 50;
    this.transition = null;
    this.counterMode = 0;
    const mids = this.onPitch(side).filter((p) => p.pos !== "GK").sort((a, b) => Math.abs(a.slot.inPossession.x - 50) - Math.abs(b.slot.inPossession.x - 50));
    this.carrier = mids[0] ?? this.onPitch(side)[0] ?? null;
  }

  private turnover(newCarrier: PState | null, reason: "press" | "tackle" | "interception" | "loose" | "gk" | "dead"): void {
    const lost = this.poss;
    this.poss = (1 - lost) as 0 | 1;
    this.bx = 100 - this.bx;
    this.by = 100 - this.by;
    this.carrier = newCarrier ?? this.nearestTo(this.poss, this.bx, this.by);
    this.lastPasser = null;
    this.bigChanceNext = false;
    const loserTi = this.teams[lost].tactic.team;
    const winnerTi = this.teams[this.poss].tactic.team;
    if (reason === "dead" || reason === "gk") {
      this.transition = null;
      this.counterMode = 0;
      return;
    }
    // the side that lost the ball is caught in its attacking shape
    const max = loserTi.defensiveTransition === "regroup" ? 1 : loserTi.defensiveTransition === "counter_press" ? 3 : 2;
    this.transition = { side: lost, ticks: max, max };
    // counter-pressing: immediate attempt to regain the ball
    if (loserTi.defensiveTransition === "counter_press") {
      const presser = this.nearestTo(lost, 100 - this.bx, 100 - this.by);
      if (presser) {
        const p = 0.07 + lvl(loserTi.pressing) * 0.03 + (this.eff(presser, "workRate") - 12) * 0.006 - (this.carrier ? (this.eff(this.carrier, "composure") - 12) * 0.008 : 0);
        presser.energy -= 0.4;
        if (this.rng.chance(clamp(p, 0.04, 0.35))) {
          this.teams[lost].stats.pressWins++;
          presser.rating += 0.08;
          this.push("press_win", lost, presser, this.carrier, `${name(presser)} wins it straight back with an aggressive counter-press.`);
          this.poss = lost;
          this.bx = 100 - this.bx;
          this.by = 100 - this.by;
          this.carrier = presser;
          this.transition = { side: (1 - lost) as 0 | 1, ticks: 2, max: 2 };
          this.counterMode = 1;
          return;
        }
      }
    }
    // counter-attacking intent of the team that won the ball
    const advanced = this.teams[lost].tactic.team.mentality + this.teams[lost].tactic.team.defensiveLine;
    if (winnerTi.attackingTransition === "counter" && this.bx < 70) {
      // counters only really bite when the opponent was caught upfield
      this.counterMode = advanced >= 7 ? 2 : 1;
      if (advanced >= 7 || loserTi.defensiveTransition !== "regroup") this.push("counter", this.poss, this.carrier, null, `${this.teams[this.poss].input.name} break quickly!`);
    } else if (winnerTi.attackingTransition === "balanced" && this.bx < 55 && advanced >= 8) {
      this.counterMode = 2;
    } else this.counterMode = 0;
  }

  private nearestTo(side: 0 | 1, x: number, y: number, exclude?: PState | null): PState | null {
    let best: PState | null = null;
    let bd = Infinity;
    for (const ps of this.onPitch(side)) {
      if (ps === exclude) continue;
      if (ps.pos === "GK" && x > 25) continue;
      const pos = this.playerPos(ps, side);
      const d = dist(pos.x, pos.y, x, y);
      if (d < bd) {
        bd = d;
        best = ps;
      }
    }
    return best;
  }

  private advanceClock(seconds: number): void {
    const t = this.teams[this.poss];
    t.possessionSeconds += seconds;
    const before = Math.floor(this.clock / 60);
    this.clock += seconds;
    const after = Math.floor(this.clock / 60);
    for (let m = before; m < after; m++) this.minuteTick();
    this.minute = Math.floor(this.clock / 60);
    this.second = Math.floor(this.clock % 60);
  }

  /** Per-minute processing: fatigue, injuries, AI decisions. */
  private minuteTick(): void {
    for (const t of this.teams) {
      const ti = t.tactic.team;
      for (const ps of t.players) {
        if (!ps.onPitch) continue;
        const stam = ps.p.attributes.stamina;
        const nf = ps.p.attributes.naturalFitness;
        let drain = 0.34 + lvl(ti.pressing) * 0.09 + lvl(ti.tempo) * 0.05 + ps.mods.press * 0.06 + Math.max(0, ps.mods.forwardRuns) * 0.04 - (stam - 10) * 0.017 - (nf - 10) * 0.005;
        if (ps.pos === "GK") drain *= 0.25;
        ps.energy = clamp(ps.energy - Math.max(0.08, drain), 15, 100);
        // injury risk
        const risk = 0.000035 * (1 + ps.p.personality.injuryProneness / 10) * (1 + (100 - ps.energy) / 70);
        if (this.rng.chance(risk)) this.injure(ps, false);
      }
      if (!t.input.manualControl) this.aiManage(t);
    }
  }

  private injure(ps: PState, contact: boolean): void {
    if (ps.injured || !ps.onPitch) return;
    ps.injured = true;
    const roll = this.rng.next();
    const days = roll < 0.55 ? this.rng.int(3, 10) : roll < 0.85 ? this.rng.int(11, 35) : roll < 0.97 ? this.rng.int(36, 90) : this.rng.int(91, 220);
    const types = contact ? ["ankle sprain", "knee ligament strain", "bruised shin", "dead leg", "twisted knee"] : ["hamstring strain", "calf strain", "groin strain", "thigh strain", "back spasm"];
    const type = days > 90 ? (contact ? "cruciate ligament tear" : "achilles tendon rupture") : this.rng.pick(types);
    this.injuries.push({ playerId: ps.p.id, days, type });
    this.push("injury", ps.side, ps, null, `${ps.p.firstName} ${ps.p.lastName} goes down injured (${type}).`);
    const t = this.teams[ps.side];
    if (!t.input.manualControl || true) {
      // the medical team forces a change when possible; otherwise the player limps on with reduced output
      if (!this.autoSubstitute(t, ps, "injury")) {
        ps.energy = Math.min(ps.energy, 35);
      }
    }
  }

  // ----- AI match management ------------------------------------------------

  private aiManage(t: TeamState): void {
    const m = Math.floor(this.clock / 60);
    const diff = this.goals[t.side] - this.goals[1 - t.side] + this.aggregateDiff(t.side);
    // tactical changes late in matches
    if (m === 65 || m === 78) {
      const ti = t.tactic.team;
      if (diff < 0 && ti.mentality < 5) {
        ti.mentality = (ti.mentality + 1) as typeof ti.mentality;
        this.shapeVersion++;
        ti.tempo = Math.min(5, ti.tempo + 1) as typeof ti.tempo;
        this.push("tactic_change", t.side, null, null, `${t.input.name} push more players forward.`);
      } else if (diff > 0 && m === 78 && ti.mentality > 2) {
        ti.mentality = (ti.mentality - 1) as typeof ti.mentality;
        t.timeWasting = true;
        this.push("tactic_change", t.side, null, null, `${t.input.name} drop deeper to protect the lead.`);
      }
    }
    if (m < 55 || t.subsUsed >= t.input.maxSubs || t.bench.length === 0) return;
    if (m % 5 !== 0) return;
    const tired = this.onPitch(t.side).filter((p) => p.pos !== "GK").sort((a, b) => a.energy - b.energy + (a.rating - b.rating) * 6);
    const cand = tired[0];
    if (!cand) return;
    const shouldSub = cand.energy < 58 || (m >= 70 && (cand.rating < 6.2 || cand.energy < 66)) || (cand.yellow > 0 && ["CB", "DM", "LB", "RB"].includes(cand.pos) && m >= 60);
    if (shouldSub) this.autoSubstitute(t, cand, "tactical");
  }

  private aggregateDiff(side: 0 | 1): number {
    if (!this.options.priorGoals) return 0;
    return this.options.priorGoals[side] - this.options.priorGoals[1 - side];
  }

  private autoSubstitute(t: TeamState, off: PState, reason: "injury" | "tactical"): boolean {
    if (t.subsUsed >= t.input.maxSubs || t.bench.length === 0) return false;
    const pos = off.slot.position;
    let best: Player | null = null;
    let bestScore = -Infinity;
    for (const b of t.bench) {
      if (pos === "GK" && b.position !== "GK") continue;
      if (pos !== "GK" && b.position === "GK") continue;
      const fam = positionFamiliarity(b, pos);
      const score = fam * 100 + b.fitness * 0.2 + Object.values(b.attributes).reduce((a, c) => a + c, 0) * 0.05;
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    }
    if (!best) return false;
    this.substitute(t.side, off.p.id, best.id, reason);
    return true;
  }

  // ----- public controls (live mode) ---------------------------------------

  substitute(side: 0 | 1, outId: ID, inId: ID, reason: "injury" | "tactical" = "tactical"): { ok: boolean; message: string } {
    const t = this.teams[side];
    if (this.finished) return { ok: false, message: "The match has finished." };
    if (t.subsUsed >= t.input.maxSubs) return { ok: false, message: "No substitutions remaining." };
    const off = t.players.find((p) => p.p.id === outId && p.onPitch);
    if (!off) return { ok: false, message: "That player is not on the pitch." };
    const idx = t.bench.findIndex((b) => b.id === inId);
    if (idx < 0) return { ok: false, message: "That player is not on the bench." };
    const incoming = t.bench[idx];
    t.bench.splice(idx, 1);
    const m = Math.floor(this.clock / 60);
    off.onPitch = false;
    off.minuteOff = m;
    const ps = this.makePState(t, incoming, off.slot, m, false);
    t.players.push(ps);
    t.subsUsed++;
    this.shapeVersion++;
    if (this.carrier === off) this.carrier = ps;
    this.push("substitution", side, ps, off, `${reason === "injury" ? "Forced change" : "Substitution"} for ${t.input.name}: ${incoming.firstName} ${incoming.lastName} replaces ${off.p.lastName}.`);
    return { ok: true, message: "Substitution made." };
  }

  /** Apply a new tactical system / instructions mid-match. Slots are matched by id; unmatched players keep their slot. */
  changeTactic(side: 0 | 1, tactic: TacticalSystem, assignment?: Record<string, ID>): void {
    const t = this.teams[side];
    this.shapeVersion++;
    const copy: TacticalSystem = JSON.parse(JSON.stringify(tactic));
    t.tactic = copy;
    t.timeWasting = copy.team.timeWasting;
    const sh = shapeShifts(copy);
    t.ipShift = sh.ip;
    t.opShift = sh.op;
    const onPitch = t.players.filter((p) => p.onPitch);
    const usedSlots = new Set<string>();
    if (assignment) {
      for (const [slotId, pid] of Object.entries(assignment)) {
        const ps = onPitch.find((p) => p.p.id === pid);
        const slot = copy.slots.find((s) => s.id === slotId);
        if (ps && slot) {
          this.reslot(t, ps, slot);
          usedSlots.add(slotId);
        }
      }
    }
    for (const ps of onPitch) {
      if (assignment && Object.values(assignment).includes(ps.p.id)) continue;
      const same = copy.slots.find((s) => s.id === ps.slot.id && !usedSlots.has(s.id));
      const free = same ?? copy.slots.find((s) => !usedSlots.has(s.id) && (s.position === "GK") === (ps.pos === "GK"));
      if (free) {
        this.reslot(t, ps, free);
        usedSlots.add(free.id);
      }
    }
    this.push("tactic_change", side, null, null, `${t.input.name} change their approach (${copy.name}, ${copy.formationLabel}).`);
  }

  private reslot(t: TeamState, ps: PState, slot: TacticSlot): void {
    this.shapeVersion++;
    const fresh = this.makePState(t, ps.p, slot, ps.minuteOn, ps.started);
    ps.slot = slot;
    ps.pos = slot.position;
    ps.mods = fresh.mods;
    ps.baseFactor = fresh.baseFactor;
    ps.line.position = slot.position;
  }

  // ----- core loop ----------------------------------------------------------

  /** Simulate until the given match minute (or the end). */
  stepTo(minute: number): void {
    let guard = 0;
    while (!this.finished && this.clock < minute * 60 && guard++ < 100000) this.step();
  }

  simulateToEnd(): EngineResult {
    let guard = 0;
    while (!this.finished && guard++ < 200000) this.step();
    return this.result();
  }

  get matchClockSeconds(): number {
    return this.clock;
  }

  step(): void {
    if (this.finished) return;
    if (this.clock >= this.periodEnd) {
      this.endPeriod();
      return;
    }
    if (!this.carrier || !this.carrier.onPitch) this.carrier = this.nearestTo(this.poss, this.bx, this.by);
    if (!this.carrier) {
      this.advanceClock(10);
      return;
    }
    if (this.transition) {
      this.transition.ticks--;
      if (this.transition.ticks <= 0) this.transition = null;
    }
    const att = this.teams[this.poss];
    const def = this.teams[1 - this.poss];
    const ti = att.tactic.team;
    const dti = def.tactic.team;
    const c = this.carrier;
    if (c.pos === "GK" && this.bx < 20) {
      this.goalkeeperDistribution(c);
      return;
    }

    // pressure on the ball carrier
    const defenders = this.onPitch(def.side);
    let nearest: PState | null = null;
    let nd = Infinity;
    let pressure = 0;
    for (const d of defenders) {
      const pos = this.playerPos(d, this.poss);
      const dd = dist(pos.x, pos.y, this.bx, this.by);
      if (dd < nd) {
        nd = dd;
        nearest = d;
      }
      pressure += Math.max(0, 1 - dd / 11);
    }
    // pressing engagement depends on where the ball is and the pressing level
    const engageLine = 100 - (38 + dti.pressing * 9); // attacking-frame x beyond which they press
    const inPressZone = this.bx >= engageLine - 8;
    pressure = clamp(pressure * (inPressZone ? 1 + lvl(dti.pressing) * 0.35 : 0.65), 0, 1.6);
    const pressureN = clamp(pressure / 1.6, 0, 1);

    // 1. pressing / tackle before the carrier acts
    if (nearest && inPressZone && nearest.pos !== "GK") {
      const presserQ = (this.eff(nearest, "workRate") + this.eff(nearest, "anticipation") + this.eff(nearest, "tackling")) / 3 * (1 + nearest.mods.press * 0.15);
      const carrierQ = (this.eff(c, "composure") + this.eff(c, "firstTouch") + this.eff(c, "technique")) / 3;
      let p = 0.045 + lvl(dti.pressing) * 0.03 + (presserQ - carrierQ) * 0.006 + (def.cohesion - 60) * 0.0004;
      p *= 0.6 + pressureN;
      if (this.counterMode > 0) p *= 0.6;
      nearest.energy -= 0.08 + Math.max(0, lvl(dti.pressing)) * 0.12;
      if (this.rng.chance(clamp(p, 0.01, 0.3))) {
        def.stats.pressWins++;
        nearest.rating += 0.09;
        c.rating -= 0.05;
        const foulP = 0.3 + (nearest.p.attributes.aggression - 10) * 0.012 + (nearest.slot.instructions.tackleHarder ? 0.08 : 0) - (nearest.p.attributes.tackling - 10) * 0.01;
        const boxF = this.bx > 83 && this.by > 21 && this.by < 79 ? 0.2 : 1;
        if (this.rng.chance(clamp(foulP, 0.08, 0.5) * boxF)) {
          this.foul(nearest, c);
          return;
        }
        this.push("press_win", def.side, nearest, c, `${name(nearest)} closes down ${name(c)} and wins possession.`);
        this.turnover(nearest, "press");
        this.advanceClock(this.rng.range(2, 4));
        return;
      }
    }

    // 2. choose action
    const { distance: shotDist } = { distance: dist(this.bx, this.by, 100, 50) };
    const wide = this.by < 22 || this.by > 78;
    const mentality = lvl(ti.mentality);
    const actions: string[] = [];
    const weights: number[] = [];
    // shoot
    if (shotDist < 32 && c.pos !== "GK") {
      const xgEst = expectedGoals({ x: this.bx, y: this.by, header: false, bigChance: this.bigChanceNext, directFreeKick: false, penalty: false, pressure: pressureN });
      const shooter = (this.eff(c, "finishing") + this.eff(c, "longShots") * (shotDist > 18 ? 1 : 0.3)) / (shotDist > 18 ? 2 : 1.3);
      let w = Math.pow(xgEst, 0.85) * 0.88 * (1 - 0.45 * pressureN) * (1 + c.mods.shoot * 0.6) * (1 + mentality * 0.2) * (0.7 + shooter / 40);
      if (shotDist > 22) w *= 0.6 + (c.p.attributes.longShots - 8) * 0.06;
      actions.push("shoot");
      weights.push(Math.max(0.01, w));
    }
    // cross
    if (wide && this.bx > 62) {
      const ws = ti.crossStyle === "high" ? 1.1 : ti.crossStyle === "low" ? 0.9 : 1;
      actions.push("cross");
      weights.push(0.55 * (1 + c.mods.cross * 0.8) * (1 + lvl(ti.width) * 0.35) * ws * (this.eff(c, "crossing") / 12));
    }
    // dribble
    {
      let w = 0.14 * Math.pow(this.eff(c, "dribbling") / 12, 2) * (1 + c.mods.dribble * 0.8) * (nd > 6 ? 1.3 : 0.8);
      if (this.counterMode > 0) w *= 1.4;
      if (this.bx < 30) w *= 0.4;
      if (c.pos === "GK" || c.pos === "CB") w *= 0.3;
      actions.push("dribble");
      weights.push(w);
    }
    // hold-up
    if (c.mods.holdUp > 0 && this.bx > 50 && pressure > 0.3) {
      actions.push("hold");
      weights.push(0.25 * c.mods.holdUp);
    }
    // clearance under pressure deep in own half
    if (this.bx < 24 && pressureN > 0.45) {
      const composure = this.eff(c, "composure");
      actions.push("clear");
      weights.push(0.5 * (ti.buildUp === "short" ? 0.5 : ti.buildUp === "direct" ? 1.4 : 1) * (14 / Math.max(6, composure)));
    }
    actions.push("pass");
    weights.push(1.0);

    const action = this.rng.weighted(actions, weights);
    switch (action) {
      case "shoot": this.shoot(c, pressureN, { header: false, bigChance: this.bigChanceNext, freeKick: false }); break;
      case "cross": this.cross(c, false); break;
      case "dribble": this.dribble(c, nearest, nd); break;
      case "hold": this.holdUp(c); break;
      case "clear": this.clear(c); break;
      default: this.pass(c, pressureN);
    }
  }

  private timeFactor(): number {
    const ti = this.teams[this.poss].tactic.team;
    let f = 1.2 - (ti.tempo - 1) * 0.07;
    if (this.counterMode > 0) f *= 0.8;
    if (this.teams[this.poss].timeWasting) f *= 1.3;
    return f;
  }

  private pass(c: PState, pressureN: number): void {
    const att = this.teams[this.poss];
    const def = this.teams[1 - this.poss];
    const ti = att.tactic.team;
    const dti = def.tactic.team;
    const mates = this.onPitch(this.poss).filter((p) => p !== c);
    const defenders = this.onPitch(def.side);
    const defPos = defenders.map((d) => ({ d, ...this.playerPos(d, this.poss) }));
    // deepest defensive line (excluding GK) in attacking frame = max x of outfield defenders
    let lastLine = 0;
    for (const dp of defPos) if (dp.d.pos !== "GK" && dp.x > lastLine) lastLine = dp.x;
    lastLine = Math.min(lastLine, 92);

    type Opt = { to: PState; x: number; y: number; type: "short" | "forward" | "long" | "switch" | "through"; w: number };
    const opts: Opt[] = [];
    const risk = lvl(ti.passingRisk) + c.mods.passRisk * 0.6;
    const counter = this.counterMode > 0 && ti.attackingTransition !== "hold_shape";
    for (const m of mates) {
      const pos = this.playerPos(m, this.poss);
      if (m.pos === "GK" && (this.bx > 40 || ti.buildUp === "direct")) continue;
      const d = dist(this.bx, this.by, pos.x, pos.y);
      if (d < 4) continue;
      const dx = pos.x - this.bx;
      const dy = Math.abs(pos.y - this.by);
      let open = 99;
      for (const dp of defPos) {
        const od = dist(dp.x, dp.y, pos.x, pos.y);
        if (od < open) open = od;
      }
      let type: Opt["type"];
      if (d > 30) type = dy > 38 ? "switch" : "long";
      else type = dx > 5 ? "forward" : "short";
      let w = (0.3 + Math.min(open, 14) / 6) * (1 + m.mods.playmaker * 0.5);
      const buildPhase = this.bx < 55; // build-up style governs the first two thirds
      if (type === "short") w *= (ti.buildUp === "short" && buildPhase ? 1.5 : ti.buildUp === "direct" ? 0.6 : 1) * (1.2 - lvl(ti.tempo) * 0.3) * (counter ? 0.4 : 1);
      if (type === "forward") w *= 1.1 + lvl(ti.tempo) * 0.15 + risk * 0.15 + (counter ? 0.5 : 0) + lvl(ti.mentality) * 0.15;
      if (type === "long") w *= (ti.buildUp === "direct" ? 1.6 : ti.buildUp === "short" ? 0.25 : 0.6) * (1 + c.mods.longPass * 0.6) * (dx > 10 ? 1 : 0.3);
      if (type === "switch") w *= (0.35 + lvl(ti.width) * 0.25 + c.mods.longPass * 0.2) * (this.eff(c, "vision") / 13);
      if (dx < -15) w *= 0.35;
      // focus of play
      // team width: wide teams look for the flanks, narrow teams play through the middle
      if (Math.abs(pos.y - 50) > 28) w *= 1 + lvl(ti.width) * 0.3;
      if (ti.focus === "left" && pos.y < 35) w *= 1.4;
      if (ti.focus === "right" && pos.y > 65) w *= 1.4;
      if (ti.focus === "centre" && pos.y >= 35 && pos.y <= 65) w *= 1.35;
      if (m.pos === "GK") w *= ti.buildUp === "short" ? 0.4 : 0.15;
      if (pos.x > 83) w *= 0.6;
      opts.push({ to: m, x: pos.x, y: pos.y, type, w: Math.max(0.001, w) });
      // through ball option for runners
      if (this.bx > 30 && m.mods.forwardRuns > -0.2 && pos.x > this.bx + 4 && ["ST", "LW", "RW", "AM", "LM", "RM", "LWB", "RWB", "CM"].includes(m.pos)) {
        const tx = clamp(Math.max(lastLine + 6, pos.x + 6), 0, 96);
        const space = 100 - lastLine; // space behind the line
        let tw = (0.1 + risk * 0.07 + (counter ? 0.22 : 0)) * (1 + m.mods.forwardRuns * 0.6) * (this.eff(c, "vision") / 13) * (0.6 + space / 80);
        tw *= 1 + c.mods.passRisk * 0.4;
        opts.push({ to: m, x: tx, y: pos.y, type: "through", w: Math.max(0.001, tw) });
      }
    }
    if (opts.length === 0) {
      this.advanceClock(3);
      return;
    }
    const choice = this.rng.weighted(opts, opts.map((o) => o.w));
    const d = dist(this.bx, this.by, choice.x, choice.y);
    let base = choice.type === "short" ? 0.955 : choice.type === "forward" ? 0.865 : choice.type === "long" ? 0.67 : choice.type === "switch" ? 0.74 : 0.5;
    const passing = this.eff(c, "passing");
    const vision = this.eff(c, "vision");
    const technique = this.eff(c, "technique");
    let p = base + (passing - 12) * 0.016 + (technique - 12) * 0.005 + (choice.type === "through" || choice.type === "long" ? (vision - 12) * 0.012 : 0);
    p += (this.eff(choice.to, "firstTouch") - 12) * 0.005;
    p -= pressureN * (ti.buildUp === "short" && this.bx < 40 ? 0.04 : 0.08); // teams drilled to play out stay calmer under pressure
    p -= Math.max(0, d - 25) * 0.003;
    p -= risk * 0.02;
    p += (att.cohesion - 60) * 0.0008;
    if (this.counterMode > 0 && ti.attackingTransition === "counter") p -= 0.035; // rushed passes in transition
    if (ti.buildUp === "short" && (choice.type === "short" || choice.type === "forward")) p += this.bx > 60 ? 0.02 : 0.015; // rehearsed short combinations
    if (choice.type !== "through") p -= lvl(dti.defensiveLine) * 0.02; // a high line squeezes the space between the lines
    // pass lane interception
    let laneBlock = 0;
    let interceptor: PState | null = null;
    for (const dp of defPos) {
      if (dp.d.pos === "GK" && choice.type !== "through") continue;
      const ld = distToSegment(dp.x, dp.y, this.bx, this.by, choice.x, choice.y);
      const block = Math.max(0, 1 - ld / 4) * (0.6 + (this.eff(dp.d, "anticipation") + this.eff(dp.d, "positioning")) / 60);
      if (block > laneBlock) {
        laneBlock = block;
        interceptor = dp.d;
      }
    }
    // tight marking on the receiver
    let marker: PState | null = null;
    let md = Infinity;
    for (const dp of defPos) {
      const od = dist(dp.x, dp.y, choice.x, choice.y);
      if (od < md) {
        md = od;
        marker = dp.d;
      }
    }
    if (marker && marker.slot.instructions.markTighter && md < 6) p -= 0.04;
    if (choice.type !== "short") p -= Math.max(0, 1 - md / 5) * 0.1;
    p -= laneBlock * 0.14;
    // crowded penalty area
    if (choice.x > 83) {
      let inBox = 0;
      for (const dp of defPos) if (dp.x > 82 && dp.y > 20 && dp.y < 80) inBox++;
      p -= inBox * 0.07;
    }
    if (choice.type === "through") {
      // defensive line height: more space behind a high line
      // a high line leaves space but the keeper sweeps behind it
      const sweeper = this.gk(def.side);
      if (lvl(dti.defensiveLine) > 0 && sweeper) p -= lvl(dti.defensiveLine) * (0.04 + Math.max(0, sweeper.mods.sweeper) * 0.04 + (this.eff(sweeper, "oneOnOnes") - 12) * 0.004);
      if (dti.offsideTrap) p -= 0.02;
    }
    p = clamp(p, 0.05, 0.985);

    att.stats.passes++;
    c.line.passes++;
    this.advanceClock(this.rng.range(2.5, 5.5) * this.timeFactor() * (choice.type === "long" || choice.type === "switch" ? 1.2 : 1));
    // offside on through balls
    if (choice.type === "through") {
      let offP = 0.12 + lvl(dti.defensiveLine) * 0.07 + (dti.offsideTrap ? 0.1 : 0) - (this.eff(choice.to, "offTheBall") - 12) * 0.012 - (this.eff(choice.to, "anticipation") - 12) * 0.006;
      if (this.counterMode > 0) offP *= 0.6;
      if (this.rng.chance(clamp(offP, 0.02, 0.35))) {
        att.stats.offsides++;
        this.bx = choice.x;
        this.by = choice.y;
        this.push("offside", att.side, choice.to, c, `${name(choice.to)} is caught offside.`);
        this.turnover(this.gk(def.side) ?? null, "dead");
        this.bx = Math.min(this.bx, 30);
        this.advanceClock(this.rng.range(8, 14));
        return;
      }
    }
    if (this.rng.chance(p)) {
      att.stats.passesCompleted++;
      c.line.passesCompleted++;
      c.rating += choice.type === "through" ? 0.07 : choice.type === "forward" || choice.type === "long" ? 0.025 : 0.01;
      this.lastPasser = c;
      this.bx = choice.x;
      this.by = choice.y;
      this.carrier = choice.to;
      this.bigChanceNext = choice.type === "through" && choice.x > 80 && Math.abs(choice.y - 50) < 25;
      if (this.counterMode > 0) this.counterMode--;
      this.push("pass", att.side, c, choice.to, choice.type === "through" ? `${name(c)} threads a ball through for ${name(choice.to)}.` : `${name(c)} finds ${name(choice.to)}.`);
    } else {
      c.rating -= 0.04;
      this.bx = (this.bx + choice.x) / 2;
      this.by = (this.by + choice.y) / 2;
      const intercepted = !!interceptor && laneBlock > 0.6;
      const winner = intercepted ? interceptor : marker;
      if (winner && intercepted) {
        def.stats.interceptions++;
        winner.line.interceptions++;
        winner.rating += 0.08;
      }
      if (choice.x > 83 && this.rng.chance(0.07)) {
        this.push("clearance", def.side, winner, c, `${name(winner)} turns it behind.`);
        this.corner();
        return;
      }
      this.push("pass_fail", att.side, c, winner, winner ? `${name(winner)} cuts out ${name(c)}'s pass.` : `${name(c)}'s pass goes astray.`);
      this.turnover(winner, "interception");
    }
  }

  private dribble(c: PState, defender: PState | null, nd: number): void {
    const att = this.teams[this.poss];
    const def = this.teams[1 - this.poss];
    att.stats.dribbles++;
    this.advanceClock(this.rng.range(2, 4.5) * this.timeFactor());
    if (!defender || nd > 9) {
      // space to run into
      const run = 6 + this.eff(c, "pace") * 0.5;
      this.bx = clamp(this.bx + run, 0, this.bx > 80 ? 90 : 88);
      if (c.mods.cutInside > 0.3) this.by += (50 - this.by) * 0.25;
      this.push("dribble", att.side, c, null, `${name(c)} drives forward into space.`);
      c.rating += 0.03;
      return;
    }
    const attack = (this.eff(c, "dribbling") * 1.2 + this.eff(c, "agility") + this.eff(c, "pace") * 0.6 + this.eff(c, "technique") * 0.4) / 3.2;
    const tight = defender.slot.instructions.markTighter ? 0.6 : 0;
    const defend = (this.eff(defender, "tackling") * 1.1 + this.eff(defender, "positioning") + this.eff(defender, "pace") * 0.5 + this.eff(defender, "strength") * 0.3 + tight) / 2.9;
    let p = 0.52 + (attack - defend) * 0.035 + (this.counterMode > 0 ? 0.08 : 0) + (defender.slot.instructions.tackleHarder ? -0.04 : 0);
    p = clamp(p, 0.12, 0.88);
    if (this.rng.chance(p)) {
      this.bx = clamp(this.bx + this.rng.range(7, 14), 0, this.bx > 80 ? 93 : 89);
      if (c.mods.cutInside > 0.3) this.by += (50 - this.by) * 0.35;
      else this.by += this.rng.range(-5, 5);
      this.by = clamp(this.by, 3, 97);
      c.rating += 0.09;
      defender.rating -= 0.04;
      this.push("dribble", att.side, c, defender, `${name(c)} skips past ${name(defender)}.`);
      if (this.bx > 82 && Math.abs(this.by - 50) < 20) this.bigChanceNext = this.rng.chance(0.35);
    } else {
      def.stats.tackles++;
      defender.line.tackles++;
      defender.rating += 0.12;
      c.rating -= 0.05;
      const foulP = 0.3 + (defender.p.attributes.aggression - 10) * 0.012 + (defender.slot.instructions.tackleHarder ? 0.1 : 0) - (defender.p.attributes.tackling - 10) * 0.01 + (this.bx > 80 ? -0.06 : 0);
      const boxF = this.bx > 83 && this.by > 21 && this.by < 79 ? 0.2 : 1;
      if (this.rng.chance(clamp(foulP, 0.08, 0.5) * boxF)) {
        this.foul(defender, c);
        return;
      }
      if (this.rng.chance(0.005)) this.injure(c, true);
      this.push("tackle", def.side, defender, c, `${name(defender)} times the tackle perfectly on ${name(c)}.`);
      this.turnover(defender, "tackle");
    }
  }

  private holdUp(c: PState): void {
    const att = this.teams[this.poss];
    const strength = (this.eff(c, "strength") + this.eff(c, "firstTouch")) / 2;
    this.advanceClock(this.rng.range(3, 6) * this.timeFactor());
    if (this.rng.chance(clamp(0.55 + (strength - 12) * 0.035, 0.25, 0.9))) {
      c.rating += 0.05;
      this.push("dribble", att.side, c, null, `${name(c)} holds the ball up and brings others into play.`);
      this.counterMode = 0;
      // team moves up: next pass is easier
      this.bx = clamp(this.bx + 2, 0, 95);
    } else {
      const d = this.nearestTo((1 - this.poss) as 0 | 1, 100 - this.bx, 100 - this.by);
      if (d) {
        this.teams[d.side].stats.tackles++;
        d.line.tackles++;
        d.rating += 0.08;
      }
      this.push("tackle", (1 - this.poss) as 0 | 1, d, c, `${name(d)} muscles ${name(c)} off the ball.`);
      this.turnover(d, "tackle");
    }
  }

  private clear(c: PState): void {
    this.advanceClock(this.rng.range(2, 4));
    this.push("clearance", this.poss, c, null, `${name(c)} hacks it clear.`);
    const att = this.teams[this.poss];
    att.stats.passes++;
    c.line.passes++;
    this.bx = clamp(this.bx + this.rng.range(30, 50), 0, 85);
    this.by = clamp(this.by + this.rng.range(-25, 25), 5, 95);
    // aerial 50/50
    const mate = this.nearestTo(this.poss, this.bx, this.by);
    const opp = this.nearestTo((1 - this.poss) as 0 | 1, 100 - this.bx, 100 - this.by);
    if (mate && opp) {
      const a = this.eff(mate, "jumping") + this.eff(mate, "heading") + this.eff(mate, "strength");
      const b = this.eff(opp, "jumping") + this.eff(opp, "heading") + this.eff(opp, "strength");
      if (this.rng.chance(clamp(0.42 + (a - b) * 0.01, 0.15, 0.8))) {
        att.stats.passesCompleted++;
        c.line.passesCompleted++;
        this.carrier = mate;
        return;
      }
      this.turnover(opp, "loose");
      return;
    }
    this.turnover(opp, "loose");
  }

  private goalkeeperDistribution(gk: PState): void {
    const att = this.teams[this.poss];
    const def = this.teams[1 - this.poss];
    const ti = att.tactic.team;
    const dti = def.tactic.team;
    const mode = ti.gkDistribution === "balanced" ? (ti.buildUp === "short" ? "short" : ti.buildUp === "direct" ? "long" : this.rng.pick(["short", "long", "quick"] as const)) : ti.gkDistribution;
    this.advanceClock(this.rng.range(4, 9) * (att.timeWasting ? 1.6 : 1));
    att.stats.passes++;
    gk.line.passes++;
    if (mode === "long") {
      const fwd = this.onPitch(this.poss).filter((p) => ["ST", "AM", "LW", "RW"].includes(p.pos));
      const target = fwd.length ? this.rng.weighted(fwd, fwd.map((f) => 1 + f.mods.aerial + f.mods.holdUp)) : this.nearestTo(this.poss, 65, 50);
      this.bx = 62 + this.rng.range(-5, 8);
      this.by = this.rng.range(30, 70);
      const opp = this.nearestTo(def.side, 100 - this.bx, 100 - this.by);
      if (target && opp) {
        const a = this.eff(target, "jumping") + this.eff(target, "heading") + this.eff(target, "strength") + target.mods.aerial * 3;
        const b = this.eff(opp, "jumping") + this.eff(opp, "heading") + this.eff(opp, "strength");
        const kick = (this.eff(gk, "kicking") - 12) * 0.01;
        if (this.rng.chance(clamp(0.42 + (a - b) * 0.012 + kick, 0.15, 0.8))) {
          att.stats.passesCompleted++;
          gk.line.passesCompleted++;
          this.carrier = target;
          this.push("pass", att.side, gk, target, `${name(gk)} goes long and ${name(target)} wins the header.`);
          return;
        }
        this.push("pass_fail", att.side, gk, opp, `${name(gk)}'s long kick is won by ${name(opp)}.`);
        this.turnover(opp, "loose");
        return;
      }
    }
    // short / quick distribution
    const targets = this.onPitch(this.poss).filter((p) => (mode === "quick" ? ["LB", "RB", "LWB", "RWB", "DM", "CM", "LM", "RM"] : ["CB", "LB", "RB", "DM"]).includes(p.pos));
    const target = targets.length ? this.rng.pick(targets) : this.nearestTo(this.poss, 20, 50);
    if (!target) {
      this.turnover(null, "loose");
      return;
    }
    const pos = this.playerPos(target, this.poss);
    // opponents pressing high make short build-up risky
    const press = lvl(dti.pressing);
    const pSucc = clamp(0.94 - Math.max(0, press) * 0.08 + (this.eff(gk, "kicking") - 12) * 0.006 + gk.mods.passRisk * 0.01 - (mode === "quick" ? 0.04 : 0), 0.6, 0.99);
    this.bx = pos.x;
    this.by = pos.y;
    if (this.rng.chance(pSucc)) {
      att.stats.passesCompleted++;
      gk.line.passesCompleted++;
      this.carrier = target;
      if (mode === "quick" && this.counterMode === 0 && ti.attackingTransition === "counter") this.counterMode = 1;
      this.push("pass", att.side, gk, target, `${name(gk)} plays it out to ${name(target)}.`);
    } else {
      const opp = this.nearestTo(def.side, 100 - this.bx, 100 - this.by);
      if (opp) {
        def.stats.interceptions++;
        opp.line.interceptions++;
      }
      gk.rating -= 0.15;
      this.push("pass_fail", att.side, gk, opp, `${name(opp)} pounces on a loose pass from ${name(gk)}!`);
      this.turnover(opp, "interception");
      this.bigChanceNext = this.rng.chance(0.4);
    }
  }

  private cross(c: PState, fromCorner: boolean): void {
    const att = this.teams[this.poss];
    const def = this.teams[1 - this.poss];
    const ti = att.tactic.team;
    att.stats.crosses++;
    this.advanceClock(this.rng.range(2.5, 4.5) * this.timeFactor());
    const style = fromCorner ? "high" : ti.crossStyle === "mixed" ? (this.rng.chance(0.5) ? "high" : "low") : ti.crossStyle;
    const inBox = this.onPitch(this.poss).filter((p) => p !== c && p.pos !== "GK");
    const boxW = inBox.map((p) => {
      const pos = this.playerPos(p, this.poss);
      let w = pos.x > 72 ? 1 + (pos.x - 72) / 8 : 0.05;
      w *= 1 + p.mods.aerial * 0.8 + Math.max(0, p.mods.forwardRuns) * 0.4;
      w *= style === "high" ? (p.p.attributes.heading + p.p.attributes.jumping) / 24 : (p.p.attributes.offTheBall + p.p.attributes.finishing) / 24;
      if (fromCorner && p.pos === "CB") w *= att.tactic.setPieces.playersForwardOnCorners === "many" ? 2.4 : att.tactic.setPieces.playersForwardOnCorners === "few" ? 0.3 : 1.4;
      return Math.max(0.01, w);
    });
    if (inBox.length === 0) {
      this.turnover(null, "loose");
      return;
    }
    const target = this.rng.weighted(inBox, boxW);
    const delivery = this.eff(c, "crossing") * 0.7 + this.eff(c, "technique") * 0.3;
    const gk = this.gk(def.side);
    // goalkeeper claims
    if (gk && style === "high") {
      const claim = 0.1 + (this.eff(gk, "commandOfArea") + this.eff(gk, "aerialReach") - 24) * 0.012 - (delivery - 12) * 0.008;
      if (this.rng.chance(clamp(claim, 0.03, 0.35))) {
        gk.rating += 0.1;
        def.stats.saves += 0;
        this.push("save_claim", def.side, gk, c, `${name(gk)} comes off the line to claim the cross.`);
        this.turnover(gk, "gk");
        this.bx = 6;
        this.by = 50;
        return;
      }
    }
    const marker = this.nearestTo(def.side, 100 - 88, 100 - 50, null);
    const defs = this.onPitch(def.side).filter((d) => d.pos !== "GK");
    const zonal = def.tactic.setPieces.defendCorners;
    const best = defs.sort((a, b) => (b.p.attributes.heading + b.p.attributes.jumping) - (a.p.attributes.heading + a.p.attributes.jumping))[0] ?? marker;
    const attQ = style === "high"
      ? (this.eff(target, "heading") + this.eff(target, "jumping") + this.eff(target, "strength") * 0.5 + target.mods.aerial * 2) / 2.5
      : (this.eff(target, "offTheBall") + this.eff(target, "anticipation") + this.eff(target, "acceleration")) / 3;
    const defQ = best ? (style === "high"
      ? (this.eff(best, "heading") + this.eff(best, "jumping") + this.eff(best, "marking") * 0.5) / 2.5
      : (this.eff(best, "marking") + this.eff(best, "positioning") + this.eff(best, "anticipation")) / 3) : 8;
    let p = 0.3 + (attQ - defQ) * 0.03 + (delivery - 12) * 0.02 + (fromCorner && zonal === "man" ? 0.02 : 0) + (fromCorner && zonal === "zonal" ? -0.02 : 0);
    p = clamp(p, 0.08, 0.6);
    this.bx = this.rng.range(86, 94);
    this.by = this.rng.range(38, 62);
    if (this.rng.chance(p)) {
      this.lastPasser = c;
      this.carrier = target;
      this.push("cross", att.side, c, target, `${name(c)} whips in a cross towards ${name(target)}...`);
      this.shoot(target, 0.5, { header: style === "high", bigChance: false, freeKick: false });
    } else {
      c.rating -= 0.02;
      if (best) best.rating += 0.06;
      if (this.rng.chance(fromCorner ? 0.08 : 0.17)) {
        this.push("cross_fail", att.side, c, best, `${name(best)} heads behind for a corner.`);
        this.corner();
        return;
      }
      this.push("cross_fail", att.side, c, best, `${name(best)} clears the cross.`);
      this.bx = this.rng.range(60, 75);
      this.turnover(best, "loose");
    }
  }

  private corner(): void {
    const att = this.teams[this.poss];
    att.stats.corners++;
    this.advanceClock(this.rng.range(15, 30));
    this.bx = 99;
    this.by = this.rng.chance(0.5) ? 2 : 98;
    const takerId = att.input.cornerTakerId;
    const taker = this.onPitch(this.poss).find((p) => p.p.id === takerId) ?? this.onPitch(this.poss).filter((p) => p.pos !== "GK").sort((a, b) => b.p.attributes.crossing - a.p.attributes.crossing)[0];
    this.push("corner", att.side, taker ?? null, null, `Corner to ${att.input.name}.`);
    if (!taker) return;
    const delivery = att.tactic.setPieces.cornerDelivery;
    if (delivery === "short" || (delivery === "mixed" && this.rng.chance(0.2))) {
      this.bx = 90;
      this.by = this.by < 50 ? 12 : 88;
      this.carrier = taker;
      return;
    }
    this.cross(taker, true);
  }

  private foul(fouler: PState, victim: PState): void {
    const def = this.teams[fouler.side];
    def.stats.fouls++;
    fouler.rating -= 0.05;
    this.advanceClock(this.rng.range(20, 45));
    // victim frame: this.poss is victim side
    const inBox = this.bx > 83 && this.by > 21 && this.by < 79;
    this.push("foul", fouler.side, fouler, victim, `Foul by ${name(fouler)} on ${name(victim)}.`);
    // cards
    const temper = (fouler.p.attributes.aggression - fouler.p.personality.temperament) * 0.012;
    const yellowP = clamp(0.16 + temper + (fouler.slot.instructions.tackleHarder ? 0.05 : 0) + (inBox ? 0.12 : 0) + (this.counterMode > 0 ? 0.12 : 0), 0.05, 0.6);
    const redP = clamp(0.0025 + temper * 0.08 + (this.counterMode > 0 && this.bx > 70 ? 0.012 : 0), 0.001, 0.03);
    if (this.rng.chance(redP)) this.sendOff(fouler, false);
    else if (this.rng.chance(fouler.yellow > 0 ? yellowP * 0.45 : yellowP)) {
      fouler.yellow++;
      fouler.line.yellow++;
      def.stats.yellow++;
      fouler.rating -= 0.3;
      if (fouler.yellow >= 2) this.sendOff(fouler, true);
      else this.push("yellow", fouler.side, fouler, null, `Yellow card for ${fouler.p.firstName} ${fouler.p.lastName}.`);
    }
    if (this.rng.chance(0.006)) this.injure(victim, true);
    if (inBox) {
      this.penalty();
      return;
    }
    // free kick for the victim's team
    this.counterMode = 0;
    this.transition = null;
    const d = dist(this.bx, this.by, 100, 50);
    const sp = this.teams[this.poss].tactic.setPieces;
    const takerId = this.teams[this.poss].input.freeKickTakerId;
    const taker = this.onPitch(this.poss).find((p) => p.p.id === takerId) ?? victim;
    if (d < 32 && this.bx > 65) {
      this.push("free_kick", this.poss, taker, null, `Free kick in a dangerous position for ${this.teams[this.poss].input.name}.`);
      const shootP = sp.freeKickApproach === "shoot" ? 0.8 : sp.freeKickApproach === "cross" ? 0.1 : d < 26 ? 0.55 : 0.3;
      if (this.rng.chance(shootP)) {
        this.shoot(taker, 0.3, { header: false, bigChance: false, freeKick: true });
        return;
      }
      this.cross(taker, true);
      return;
    }
    this.carrier = victim.onPitch ? victim : this.nearestTo(this.poss, this.bx, this.by);
  }

  private sendOff(ps: PState, secondYellow: boolean): void {
    const t = this.teams[ps.side];
    ps.red = true;
    ps.onPitch = false;
    this.shapeVersion++;
    ps.minuteOff = Math.floor(this.clock / 60);
    ps.line.red++;
    t.stats.red++;
    if (secondYellow) t.stats.yellow++;
    ps.rating -= 1.2;
    this.push(secondYellow ? "second_yellow" : "red", ps.side, ps, null, secondYellow ? `Second yellow! ${ps.p.lastName} is sent off.` : `Straight red card for ${ps.p.firstName} ${ps.p.lastName}!`);
    if (ps.pos === "GK") {
      // bring on a substitute keeper at the cost of an outfield player
      const outfield = this.onPitch(ps.side).filter((p) => p.pos !== "GK").sort((a, b) => a.energy - b.energy)[0];
      const keeper = t.bench.find((b) => b.position === "GK");
      if (outfield && keeper && t.subsUsed < t.input.maxSubs) {
        this.substitute(ps.side, outfield.p.id, keeper.id, "tactical");
        const newGk = t.players[t.players.length - 1];
        this.reslot(t, newGk, ps.slot);
      } else if (outfield) {
        this.reslot(t, outfield, ps.slot);
      }
    }
  }

  private penalty(): void {
    const att = this.teams[this.poss];
    const def = this.teams[1 - this.poss];
    const takerId = att.input.penaltyTakerId;
    const taker = this.onPitch(this.poss).find((p) => p.p.id === takerId) ?? this.onPitch(this.poss).filter((p) => p.pos !== "GK").sort((a, b) => b.p.attributes.penalties - a.p.attributes.penalties)[0];
    this.bx = 89;
    this.by = 50;
    this.advanceClock(this.rng.range(40, 80));
    this.push("penalty", att.side, taker ?? null, null, `Penalty to ${att.input.name}!`);
    if (!taker) return;
    const gk = this.gk(def.side);
    const outcome = this.penaltyKick(taker, gk);
    att.stats.shots++;
    att.stats.xg += 0.76;
    taker.line.shots++;
    taker.line.xg += 0.76;
    if (outcome === "goal") {
      att.stats.shotsOnTarget++;
      this.scoreGoal(taker, null, 0.76, "penalty");
    } else if (outcome === "saved") {
      att.stats.shotsOnTarget++;
      def.stats.saves++;
      if (gk) {
        gk.line.saves++;
        gk.rating += 0.8;
      }
      taker.rating -= 0.6;
      this.push("penalty_saved", def.side, gk, taker, `Saved! ${name(gk)} denies ${name(taker)} from the spot.`);
      this.turnover(gk, "gk");
      this.bx = 6;
    } else {
      taker.rating -= 0.6;
      this.push("penalty_miss", att.side, taker, null, `${name(taker)} blazes the penalty over!`);
      this.turnover(gk, "dead");
      this.bx = 6;
    }
  }

  private penaltyKick(taker: PState, gk: PState | null): "goal" | "saved" | "miss" {
    const skill = (this.eff(taker, "penalties") * 2 + this.eff(taker, "composure")) / 3;
    const keeper = gk ? (this.eff(gk, "reflexes") + this.eff(gk, "oneOnOnes") + this.eff(gk, "anticipation")) / 3 : 2;
    const miss = clamp(0.07 - (skill - 12) * 0.006, 0.02, 0.18);
    const save = clamp(0.17 + (keeper - skill) * 0.012, 0.06, 0.35);
    const r = this.rng.next();
    if (r < miss) return "miss";
    if (r < miss + save) return "saved";
    return "goal";
  }

  private shoot(s: PState, pressureN: number, ctx: { header: boolean; bigChance: boolean; freeKick: boolean }): void {
    const att = this.teams[this.poss];
    const def = this.teams[1 - this.poss];
    const xg = expectedGoals({ x: this.bx, y: this.by, header: ctx.header, bigChance: ctx.bigChance, directFreeKick: ctx.freeKick, penalty: false, pressure: pressureN });
    this.bigChanceNext = false;
    att.stats.shots++;
    att.stats.xg += xg;
    s.line.shots++;
    s.line.xg += xg;
    if (this.lastPasser && this.lastPasser !== s) this.lastPasser.rating += 0.12; // key pass
    this.advanceClock(this.rng.range(1.5, 3));
    const gk = this.gk(def.side);
    const finishing = ctx.header ? this.eff(s, "heading") : ctx.freeKick ? this.eff(s, "freeKicks") : xg < 0.06 ? (this.eff(s, "longShots") + this.eff(s, "technique")) / 2 : this.eff(s, "finishing");
    const composure = this.eff(s, "composure");
    const keeper = gk ? (ctx.bigChance ? (this.eff(gk, "oneOnOnes") * 2 + this.eff(gk, "reflexes")) / 3 : (this.eff(gk, "reflexes") * 2 + this.eff(gk, "handling") + this.eff(gk, "positioning")) / 4) : 1;
    const pGoal = 1 / (1 + Math.exp(-(logit(xg) + 0.11 * (finishing - 12) + 0.05 * (composure - 12) - 0.12 * (keeper - 12))));
    // blocks
    const blockP = ctx.header || ctx.bigChance ? 0.04 : clamp(0.1 + pressureN * 0.18, 0.05, 0.32);
    if (this.rng.chance(blockP)) {
      const blocker = this.nearestTo(def.side, 100 - this.bx, 100 - this.by);
      if (blocker) blocker.rating += 0.1;
      this.push("shot_blocked", att.side, s, blocker, `${name(s)} shoots but ${name(blocker)} blocks it.`, xg);
      if (this.rng.chance(0.28)) this.corner();
      else this.turnover(blocker, "loose");
      return;
    }
    const pGoalAdj = Math.min(0.97, pGoal / (1 - blockP));
    const r = this.rng.next();
    if (r < pGoalAdj) {
      att.stats.shotsOnTarget++;
      this.scoreGoal(s, this.lastPasser && this.lastPasser !== s ? this.lastPasser : null, xg, ctx.header ? "header" : ctx.freeKick ? "free_kick" : "shot");
      return;
    }
    const onTargetP = clamp(0.3 + (finishing - 12) * 0.02 + xg * 0.4, 0.15, 0.7);
    if (this.rng.next() < onTargetP) {
      att.stats.shotsOnTarget++;
      def.stats.saves++;
      s.rating += 0.08;
      if (gk) {
        gk.line.saves++;
        gk.rating += 0.22 + xg;
      }
      this.push("shot_saved", att.side, s, gk, ctx.header ? `${name(s)} heads goalwards — saved by ${name(gk)}!` : `${name(s)} forces a save from ${name(gk)}.`, xg);
      const catchP = gk ? clamp(0.5 + (this.eff(gk, "handling") - 12) * 0.03, 0.25, 0.8) : 0.5;
      if (this.rng.chance(catchP)) {
        this.turnover(gk, "gk");
        this.bx = 6;
        this.by = 50;
      } else if (this.rng.chance(0.32)) this.corner();
      else {
        // rebound
        this.bx = 90;
        this.by = this.rng.range(35, 65);
        const att2 = this.nearestTo(this.poss, this.bx, this.by, null);
        const def2 = this.nearestTo(def.side, 100 - this.bx, 100 - this.by);
        if (att2 && def2 && this.rng.chance(0.35 + (this.eff(att2, "anticipation") - this.eff(def2, "anticipation")) * 0.02)) {
          this.carrier = att2;
          this.bigChanceNext = true;
        } else this.turnover(def2, "loose");
      }
      return;
    }
    s.rating -= 0.05;
    this.push("shot_off", att.side, s, null, ctx.header ? `${name(s)}'s header drifts wide.` : `${name(s)} drags the shot wide.`, xg);
    this.turnover(gk, "dead");
    this.bx = 6;
    this.by = 50;
    this.advanceClock(this.rng.range(10, 20));
  }

  private scoreGoal(scorer: PState, assister: PState | null, xg: number, kind: string): void {
    const side = this.poss;
    this.goals[side]++;
    scorer.line.goals++;
    scorer.rating += 1.0;
    if (assister) {
      assister.line.assists++;
      assister.rating += 0.55;
    }
    const opp = this.teams[1 - side];
    for (const ps of opp.players) {
      if (!ps.onPitch) continue;
      if (ps.pos === "GK") ps.rating -= 0.35;
      else if (["CB", "LB", "RB", "LWB", "RWB"].includes(ps.pos)) ps.rating -= 0.12;
    }
    const text = kind === "penalty"
      ? `GOAL! ${scorer.p.firstName} ${scorer.p.lastName} converts the penalty. ${this.scoreline()}`
      : kind === "header"
        ? `GOAL! ${scorer.p.firstName} ${scorer.p.lastName} heads in${assister ? ` from ${assister.p.lastName}'s cross` : ""}. ${this.scoreline()}`
        : kind === "free_kick"
          ? `GOAL! A sublime free kick from ${scorer.p.firstName} ${scorer.p.lastName}! ${this.scoreline()}`
          : `GOAL! ${scorer.p.firstName} ${scorer.p.lastName} finishes${assister ? ` after a pass from ${assister.p.lastName}` : ""}. ${this.scoreline()}`;
    this.bx = 100;
    this.by = 50;
    this.push("goal", side, scorer, assister, text, xg);
    this.advanceClock(this.rng.range(40, 70));
    this.kickoff((1 - side) as 0 | 1);
    this.stoppage += 0.5;
  }

  private scoreline(): string {
    return `${this.teams[0].input.name} ${this.goals[0]}-${this.goals[1]} ${this.teams[1].input.name}`;
  }

  private endPeriod(): void {
    if (this.period === 1) {
      this.push("half_time", 0, null, null, `Half-time: ${this.scoreline()}.`);
      this.period = 2;
      this.clock = 45 * 60;
      for (const t of this.teams) for (const ps of t.players) if (ps.onPitch) ps.energy = Math.min(100, ps.energy + 6);
      this.kickoff(1);
      const st = this.rng.int(2, 4) + Math.round(this.stoppage / 2);
      this.periodEnd = (90 + Math.min(st, 8)) * 60;
      return;
    }
    if (this.period === 2) {
      if (this.options.requiresWinner && this.isLevel()) {
        if (this.options.extraTime) {
          this.period = 3;
          this.extraTimePlayed = true;
          this.clock = 90 * 60;
          this.push("extra_time", 0, null, null, `It's level — we go to extra time.`);
          for (const t of this.teams) {
            t.input = { ...t.input, maxSubs: t.input.maxSubs + 1 };
            for (const ps of t.players) if (ps.onPitch) ps.energy = Math.min(100, ps.energy + 4);
          }
          this.kickoff(0);
          this.periodEnd = 105 * 60;
          return;
        }
        if (this.options.penalties) {
          this.penaltyShootout();
        }
      }
      this.finish();
      return;
    }
    if (this.period === 3) {
      this.period = 4;
      this.clock = 105 * 60;
      this.kickoff(1);
      this.periodEnd = (120 + this.rng.int(0, 2)) * 60;
      return;
    }
    if (this.period === 4) {
      if (this.isLevel() && this.options.penalties) this.penaltyShootout();
      this.finish();
    }
  }

  private isLevel(): boolean {
    const prior = this.options.priorGoals ?? [0, 0];
    const h = this.goals[0] + prior[0];
    const a = this.goals[1] + prior[1];
    if (h !== a) return false;
    if (this.options.awayGoalsRule && this.options.priorAwayGoals) {
      // away goals: home side's away goals were scored in previous leg; away side's away goals are this match's goals
      const homeAway = this.options.priorAwayGoals[0];
      const awayAway = this.goals[1];
      if (homeAway !== awayAway) return false;
    }
    return true;
  }

  private penaltyShootout(): void {
    this.period = 5;
    const takers: PState[][] = this.teams.map((t) => this.onPitch(t.side).slice().sort((a, b) => (b.p.attributes.penalties + b.p.attributes.composure) - (a.p.attributes.penalties + a.p.attributes.composure)));
    const score: [number, number] = [0, 0];
    let round = 0;
    while (round < 30) {
      for (const side of [0, 1] as const) {
        const list = takers[side];
        if (list.length === 0) continue;
        const taker = list[round % list.length];
        const res = this.penaltyKick(taker, this.gk((1 - side) as 0 | 1));
        this.poss = side;
        this.bx = 89;
        this.by = 50;
        if (res === "goal") {
          score[side]++;
          this.push("shootout_goal", side, taker, null, `${taker.p.lastName} scores. (${score[0]}-${score[1]})`);
        } else this.push("shootout_miss", side, taker, null, `${taker.p.lastName} ${res === "saved" ? "is denied by the keeper" : "misses"}! (${score[0]}-${score[1]})`);
        if (round < 5) {
          const remaining0 = 5 - (round + 1);
          const remaining1 = 5 - (round + (side === 1 ? 1 : 0));
          if (score[0] > score[1] + remaining1 || score[1] > score[0] + remaining0) {
            this.shootout = { home: score[0], away: score[1] };
            return;
          }
        }
      }
      round++;
      if (round >= 5 && score[0] !== score[1]) break;
    }
    if (score[0] === score[1]) score[this.rng.chance(0.5) ? 0 : 1]++;
    this.shootout = { home: score[0], away: score[1] };
  }

  private finish(): void {
    this.finished = true;
    this.push("full_time", 0, null, null, `Full-time: ${this.scoreline()}${this.shootout ? ` (${this.shootout.home}-${this.shootout.away} on penalties)` : ""}.`);
  }

  result(): EngineResult {
    const totalPoss = this.teams[0].possessionSeconds + this.teams[1].possessionSeconds || 1;
    this.teams[0].stats.possession = Math.round((this.teams[0].possessionSeconds / totalPoss) * 100);
    this.teams[1].stats.possession = 100 - this.teams[0].stats.possession;
    const endMinute = Math.max(90, Math.floor(this.clock / 60));
    const lines: PlayerMatchLine[] = [];
    let motm: PState | null = null;
    for (const t of this.teams) {
      const won = this.goals[t.side] > this.goals[1 - t.side];
      const lost = this.goals[t.side] < this.goals[1 - t.side];
      const conceded = this.goals[1 - t.side];
      for (const ps of t.players) {
        const off = ps.minuteOff ?? endMinute;
        ps.line.minutes = Math.max(1, off - ps.minuteOn);
        let r = ps.rating + (won ? 0.2 : lost ? -0.2 : 0);
        if (conceded === 0 && ps.line.minutes >= 60 && ["GK", "CB", "LB", "RB", "LWB", "RWB"].includes(ps.pos)) r += ps.pos === "GK" ? 0.6 : 0.4;
        ps.line.rating = Math.round(clamp(r, 3, 10) * 10) / 10;
        ps.line.xg = Math.round(ps.line.xg * 100) / 100;
        ps.line.fatigueEnd = Math.round(100 - ps.energy);
        lines.push(ps.line);
        if (!motm || ps.line.rating > motm.line.rating) motm = ps;
      }
      t.stats.xg = Math.round(t.stats.xg * 100) / 100;
    }
    let winnerSide: 0 | 1 | null = null;
    if (this.shootout) winnerSide = this.shootout.home > this.shootout.away ? 0 : 1;
    else if (this.goals[0] !== this.goals[1]) winnerSide = this.goals[0] > this.goals[1] ? 0 : 1;
    if (this.options.priorGoals && !this.shootout) {
      const h = this.goals[0] + this.options.priorGoals[0];
      const a = this.goals[1] + this.options.priorGoals[1];
      winnerSide = h > a ? 0 : a > h ? 1 : null;
      if (winnerSide === null && this.options.awayGoalsRule && this.options.priorAwayGoals) {
        const homeAway = this.options.priorAwayGoals[0];
        winnerSide = homeAway > this.goals[1] ? 0 : homeAway < this.goals[1] ? 1 : null;
      }
    }
    return {
      goals: [this.goals[0], this.goals[1]],
      extraTime: this.extraTimePlayed,
      penalties: this.shootout,
      winnerSide,
      stats: [this.teams[0].stats, this.teams[1].stats],
      lines,
      events: this.events,
      injuries: this.injuries,
      playerOfMatchId: motm?.p.id ?? null,
      shapes: this.shapes,
    };
  }

  /** Snapshot for the live 2D visualisation (positions in home frame). */
  snapshot(): { ball: { x: number; y: number }; possession: 0 | 1; players: { id: ID; side: 0 | 1; x: number; y: number; name: string; number: number; energy: number; hasBall: boolean }[] } {
    const players: { id: ID; side: 0 | 1; x: number; y: number; name: string; number: number; energy: number; hasBall: boolean }[] = [];
    for (const t of this.teams) {
      let n = 1;
      for (const ps of t.players) {
        if (!ps.onPitch) continue;
        const pos = this.playerPos(ps, 0);
        players.push({ id: ps.p.id, side: t.side, x: pos.x, y: pos.y, name: ps.label, number: n++, energy: Math.round(ps.energy), hasBall: ps === this.carrier });
      }
    }
    const hx = this.poss === 0 ? this.bx : 100 - this.bx;
    const hy = this.poss === 0 ? this.by : 100 - this.by;
    return { ball: { x: hx, y: hy }, possession: this.poss, players };
  }

  /** Current live view of a team for UI controls. */
  teamView(side: 0 | 1): { onPitch: { id: ID; slotId: string; position: Position; energy: number; rating: number; yellow: number }[]; bench: Player[]; subsLeft: number; tactic: TacticalSystem } {
    const t = this.teams[side];
    return {
      onPitch: t.players.filter((p) => p.onPitch).map((p) => ({ id: p.p.id, slotId: p.slot.id, position: p.pos, energy: Math.round(p.energy), rating: Math.round(clamp(p.rating, 3, 10) * 10) / 10, yellow: p.yellow })),
      bench: t.bench,
      subsLeft: t.input.maxSubs - t.subsUsed,
      tactic: t.tactic,
    };
  }
}

export function simulateMatch(home: EngineTeamInput, away: EngineTeamInput, options: EngineOptions): EngineResult {
  return new MatchSimulation(home, away, options).simulateToEnd();
}
