import type { BoardObjective, ID, World } from "../core/types";
import { newId } from "../core/ids";
import { clamp } from "../core/util";
import { currentCompetitionSeason, leagueStandings } from "../competition/season";
import { squadStrength } from "./players";
import { weeklyWageBill, weeklyPlayerWages } from "../finance/ledger";
import { ageOn } from "../core/dates";

/** Predicted league finish from squad strength ranking. */
export function predictedPosition(world: World, clubId: ID): number {
  const club = world.clubs[clubId];
  if (!club.leagueId) return 1;
  const others = Object.values(world.clubs).filter((c) => c.leagueId === club.leagueId);
  const ranked = others.map((c) => ({ id: c.id, s: squadStrength(world, c.id) * 2 + c.reputation * 0.3 })).sort((a, b) => b.s - a.s);
  return ranked.findIndex((r) => r.id === clubId) + 1;
}

export function generateBoardObjectives(world: World, clubId: ID): BoardObjective[] {
  const club = world.clubs[clubId];
  const seasonId = world.meta.currentSeasonId;
  for (const id of Object.keys(world.objectives)) if (world.objectives[id].clubId === clubId && world.objectives[id].seasonId === seasonId) delete world.objectives[id];
  const out: BoardObjective[] = [];
  const add = (o: Omit<BoardObjective, "id" | "clubId" | "seasonId" | "status" | "progress">) => {
    const obj: BoardObjective = { ...o, id: newId(world, "obj"), clubId, seasonId, status: "pending", progress: null };
    world.objectives[obj.id] = obj;
    out.push(obj);
  };
  if (club.leagueId) {
    const league = world.competitions[club.leagueId];
    const size = Object.values(world.clubs).filter((c) => c.leagueId === club.leagueId).length;
    const pred = predictedPosition(world, clubId);
    let target: number;
    let desc: string;
    switch (club.strategy) {
      case "title_contender": target = pred <= 2 ? 1 : Math.max(1, pred - 1); desc = target === 1 ? `Win the ${league.name}` : `Finish in the top ${target} of the ${league.name}`; break;
      case "continental_challenger": target = Math.min(size, Math.max(2, pred)); desc = `Finish in the top ${target}`; break;
      case "relegation_battler": target = Math.max(1, size - (league.league?.relegation?.places ?? 3)); desc = `Avoid relegation (finish ${target}th or higher)`; break;
      default: target = Math.min(size, pred + 2); desc = `Finish ${ordinal(target)} or higher`;
    }
    if (league.league?.promotion && pred <= (league.league.promotion.places + 1)) {
      target = league.league.promotion.places;
      desc = `Win promotion (top ${target})`;
    }
    add({ kind: "league_position", competitionId: league.id, target, description: desc, importance: "critical" });
  }
  const cups = Object.values(world.competitions).filter((c) => c.type !== "league" && currentCompetitionSeason(world, c.id)?.clubIds.includes(clubId));
  for (const cup of cups) {
    const rounds = cup.cup?.rounds.length ?? 1;
    const depth = club.reputation >= 80 ? rounds - 1 : club.reputation >= 65 ? rounds - 2 : rounds - 3;
    const target = clamp(depth, 0, rounds - 1);
    const name = cup.cup?.rounds[target]?.name ?? "the later rounds";
    add({ kind: cup.type === "continental" ? "continental_round" : "cup_round", competitionId: cup.id, target, description: `Reach the ${name} of the ${cup.name}`, importance: cup.type === "continental" ? "high" : "medium" });
  }
  add({ kind: "wage_budget", competitionId: null, target: club.finance.wageBudget, description: "Keep the player wage bill within the budget", importance: club.strategy === "financially_constrained" ? "high" : "medium" });
  if (club.strategy === "youth_development") add({ kind: "youth_minutes", competitionId: null, target: 3000, description: "Give 3,000 league minutes to players aged 21 or under", importance: "high" });
  return out;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Furthest knockout round index reached in a cup (-1 = group stage / not started). */
export function cupRoundReached(world: World, compId: ID, clubId: ID): number {
  const cs = currentCompetitionSeason(world, compId);
  if (!cs) return -1;
  let best = -1;
  for (const t of cs.ties) if (t.homeClubId === clubId || t.awayClubId === clubId) best = Math.max(best, t.roundIndex);
  if (cs.championId === clubId) best = (world.competitions[compId].cup?.rounds.length ?? 1);
  return best;
}

export function youthMinutes(world: World, clubId: ID): number {
  const club = world.clubs[clubId];
  let mins = 0;
  for (const p of Object.values(world.players)) {
    if (p.clubId !== clubId) continue;
    if (ageOn(p.dob, world.meta.currentDate) > 21) continue;
    const s = club.leagueId ? p.seasonStats[club.leagueId] : undefined;
    if (s) mins += s.minutes;
  }
  return mins;
}

export function evaluateObjective(world: World, o: BoardObjective, final: boolean): { progress: number | null; met: boolean | null } {
  switch (o.kind) {
    case "league_position": {
      const table = leagueStandings(world, o.competitionId!);
      const pos = table.findIndex((r) => r.clubId === o.clubId) + 1;
      return { progress: pos || null, met: final ? pos > 0 && pos <= o.target : null };
    }
    case "cup_round":
    case "continental_round": {
      const r = cupRoundReached(world, o.competitionId!, o.clubId);
      const cs = currentCompetitionSeason(world, o.competitionId!);
      const done = cs?.status === "completed";
      return { progress: r, met: r >= o.target ? true : final || done ? false : null };
    }
    case "wage_budget": {
      const w = weeklyPlayerWages(world, o.clubId);
      const budget = world.clubs[o.clubId].finance.wageBudget;
      return { progress: w, met: final ? w <= budget * 1.02 : null };
    }
    case "youth_minutes": {
      const m = youthMinutes(world, o.clubId);
      return { progress: m, met: m >= o.target ? true : final ? false : null };
    }
    default:
      return { progress: null, met: null };
  }
}

const WEIGHT = { low: 4, medium: 8, high: 14, critical: 24 } as const;

/** Monthly board review: confidence moves towards how well objectives are tracking. */
export function monthlyBoardReview(world: World, clubId: ID): void {
  const club = world.clubs[clubId];
  const objs = Object.values(world.objectives).filter((o) => o.clubId === clubId && o.seasonId === world.meta.currentSeasonId);
  let delta = 0;
  for (const o of objs) {
    const ev = evaluateObjective(world, o, false);
    o.progress = ev.progress;
    if (ev.met === true && o.status === "pending") o.status = "met";
    if (ev.met === false && o.status === "pending") o.status = "failed";
    const w = WEIGHT[o.importance] / 8;
    if (o.kind === "league_position" && ev.progress) {
      // positive = ahead of target; a place or two behind early in the season is tolerated
      const gap = o.target - ev.progress;
      const season = world.seasons[world.meta.currentSeasonId];
      const progress = clamp((Date.parse(world.meta.currentDate) - Date.parse(season.startDate)) / (Date.parse(season.endDate) - Date.parse(season.startDate)), 0.15, 1);
      const tolerated = gap >= -2 ? Math.max(0, gap) + 0.5 : gap + 2;
      delta += clamp(tolerated, -5, 5) * 0.6 * w * progress;
    } else if (o.status === "met") delta += 1 * w;
    else if (o.status === "failed") delta -= 2 * w;
  }
  if (club.finance.balance < -club.finance.overdraftLimit * 0.8) delta -= 4;
  club.boardConfidence = clamp(club.boardConfidence + delta, 0, 100);
}

/** End-of-season objective resolution. Returns overall satisfaction (-100..100). */
export function resolveSeasonObjectives(world: World, clubId: ID): number {
  const objs = Object.values(world.objectives).filter((o) => o.clubId === clubId && o.seasonId === world.meta.currentSeasonId);
  let score = 0;
  for (const o of objs) {
    const ev = evaluateObjective(world, o, true);
    o.progress = ev.progress;
    if (o.status === "pending") o.status = ev.met ? "met" : "failed";
    // narrowly missing a league target (e.g. 2nd when asked to win it) is a disappointment, not a disaster
    const nearMiss = o.kind === "league_position" && o.status === "failed" && o.progress !== null && o.progress <= o.target + 2;
    score += (o.status === "met" ? 1 : nearMiss ? -0.25 : -1) * WEIGHT[o.importance];
  }
  const club = world.clubs[clubId];
  club.boardConfidence = clamp(club.boardConfidence + score * 0.45, 0, 100);
  return score;
}

/** Match-level confidence & supporter mood update. */
export function afterMatchMood(world: World, clubId: ID, goalsFor: number, goalsAgainst: number, opponentRep: number): void {
  const club = world.clubs[clubId];
  const expected = (club.reputation - opponentRep) / 25; // expected goal diff
  const diff = goalsFor - goalsAgainst - expected;
  const res = goalsFor > goalsAgainst ? 1 : goalsFor === goalsAgainst ? 0 : -1;
  club.boardConfidence = clamp(club.boardConfidence + res * 0.8 + diff * 0.4, 0, 100);
  club.supporterMood = clamp(club.supporterMood + res * 2 + diff * 0.8, 0, 100);
}
