import type { AttributeKey, Club, ID, Player, Position, Staff, World } from "../core/types";
import { ATTRIBUTE_GROUPS } from "../core/types";
import { Rng } from "../core/rng";
import { ageOn } from "../core/dates";
import { overall, POSITION_WEIGHTS } from "../core/ratings";
import { clamp } from "../core/util";
import { newId } from "../core/ids";
import { generatePlayer, randomDob } from "../world/generate";
import { addNews } from "../world/news";
import { fullName } from "../world/players";
import { invalidateSquadIndex } from "../world/index";

const PHYSICAL_DECLINE: AttributeKey[] = ["pace", "acceleration", "stamina", "agility", "naturalFitness", "jumping"];

export function clubStaff(world: World, clubId: ID): Staff[] {
  return Object.values(world.staff).filter((s) => s.clubId === clubId);
}

/** Coaching quality (1–20) relevant to a player, from the coaches the club employs. */
export function coachingQuality(staff: Staff[], p: Player): number {
  const best = (role: Staff["role"], key: keyof Staff["attributes"]) => staff.filter((s) => s.role === role).reduce((m, s) => Math.max(m, s.attributes[key]), 0);
  const manager = staff.find((s) => s.role === "manager");
  const assistant = staff.find((s) => s.role === "assistant");
  const general = Math.max(manager?.attributes.coaching ?? 6, assistant?.attributes.coaching ?? 6) * 0.6 + 6 * 0.4;
  let specialist = 6;
  if (p.position === "GK") specialist = best("goalkeeping_coach", "goalkeeping") || 5;
  else if (["CB", "LB", "RB", "LWB", "RWB", "DM"].includes(p.position)) specialist = best("defensive_coach", "defending") || 6;
  else specialist = best("attacking_coach", "attacking") || 6;
  const fitness = best("fitness_coach", "fitness") || 6;
  return clamp(general * 0.35 + specialist * 0.45 + fitness * 0.2, 1, 20);
}

export function ageCurve(age: number): number {
  if (age <= 18) return 0.19;
  if (age <= 20) return 0.16;
  if (age <= 22) return 0.15;
  if (age <= 24) return 0.09;
  if (age <= 27) return 0.025;
  if (age <= 29) return -0.035;
  if (age <= 31) return -0.12;
  if (age <= 33) return -0.21;
  return -0.3;
}

function trainingFocusWeights(p: Player, club: Club | null): Partial<Record<AttributeKey, number>> {
  const w: Partial<Record<AttributeKey, number>> = { ...POSITION_WEIGHTS[p.position] };
  const boost = (keys: AttributeKey[], amount: number) => keys.forEach((k) => (w[k] = (w[k] ?? 0.5) + amount));
  const focus = p.trainingFocus;
  if (focus === "technical") boost(ATTRIBUTE_GROUPS.technical, 2);
  if (focus === "mental") boost(ATTRIBUTE_GROUPS.mental, 2);
  if (focus === "physical") boost(ATTRIBUTE_GROUPS.physical, 2);
  if (focus === "goalkeeping") boost(ATTRIBUTE_GROUPS.goalkeeping, 3);
  if (focus === "attacking") boost(["finishing", "offTheBall", "dribbling", "longShots", "composure"], 2.5);
  if (focus === "defending") boost(["tackling", "marking", "positioning", "heading", "anticipation"], 2.5);
  if (focus === "set_pieces") boost(["freeKicks", "penalties", "crossing", "heading"], 3);
  const team = club?.training.focus;
  if (team === "attacking") boost(["finishing", "offTheBall", "passing", "vision"], 0.8);
  if (team === "defending") boost(["tackling", "marking", "positioning", "anticipation"], 0.8);
  if (team === "physical") boost(ATTRIBUTE_GROUPS.physical, 0.8);
  if (team === "set_pieces") boost(["freeKicks", "penalties", "crossing", "heading"], 1);
  if (p.position !== "GK") for (const k of ATTRIBUTE_GROUPS.goalkeeping) w[k] = 0;
  return w;
}

/**
 * Weekly development for every player. Growth depends on age, potential gap,
 * coaching, facilities, training intensity, playing time and professionalism.
 */
export function weeklyDevelopment(world: World, rng: Rng): void {
  const today = world.meta.currentDate;
  const staffByClub = new Map<ID, Staff[]>();
  for (const s of Object.values(world.staff)) if (s.clubId) {
    const list = staffByClub.get(s.clubId) ?? [];
    list.push(s);
    staffByClub.set(s.clubId, list);
  }
  const season = world.seasons[world.meta.currentSeasonId];
  const weeksIn = Math.max(1, (Date.parse(today) - Date.parse(season.startDate)) / (7 * 86_400_000));
  for (const p of Object.values(world.players)) {
    if (p.retired) continue;
    const club = p.clubId ? world.clubs[p.clubId] : null;
    const age = ageOn(p.dob, today);
    const ovr = overall(p);
    const base = ageCurve(age);
    const staff = club ? staffByClub.get(club.id) ?? [] : [];
    const coach = club ? coachingQuality(staff, p) : 4;
    const fac = club ? club.facilities.training : 3;
    // academy players (19 and under) follow the youth training intensity
    const intensity = club ? (age <= 19 ? club.training.youthIntensity : club.training.intensity) : 2;
    let minutes = 0;
    for (const s of Object.values(p.seasonStats)) minutes += s.minutes;
    const playRatio = clamp(minutes / (weeksIn * 75), 0, 1);
    let points: number;
    if (base > 0) {
      const gap = p.potential - ovr;
      const gapF = clamp(gap / 12, 0, 1);
      const youthBonus = age <= 19 && club ? (staff.find((s) => s.role === "youth_coach")?.attributes.youth ?? 6) / 20 * 0.3 : 0;
      points = base * gapF * (0.7 + (coach / 20) * 0.6 + youthBonus) * (0.85 + (fac / 20) * 0.3) * (0.8 + intensity * 0.08) * (0.8 + 0.35 * playRatio) * (0.7 + (p.personality.professionalism / 20) * 0.6);
      if (p.injury && p.injury.until > today) points *= 0.3;
    } else {
      const fitnessCoach = staff.filter((s) => s.role === "fitness_coach").reduce((m, s) => Math.max(m, s.attributes.fitness), 6);
      points = base * (1.3 - (p.attributes.naturalFitness / 20) * 0.6) * (1.1 - (fitnessCoach / 20) * 0.3) * (1.1 - (p.personality.professionalism / 20) * 0.2);
    }
    let increments = Math.floor(Math.abs(points));
    if (rng.next() < Math.abs(points) - increments) increments++;
    if (increments === 0) continue;
    const before = ovr;
    if (points > 0) {
      const w = trainingFocusWeights(p, club);
      const keys = (Object.keys(w) as AttributeKey[]).filter((k) => (w[k] ?? 0) > 0 && p.attributes[k] < 20);
      for (let i = 0; i < increments && keys.length; i++) {
        const k = rng.weighted(keys, keys.map((x) => w[x] ?? 0));
        p.attributes[k] = Math.min(20, p.attributes[k] + 1);
      }
      if (overall(p) > p.potential + 1) {
        // keep within potential (allow small overshoot from rounding)
        p.potential = overall(p);
      }
    } else {
      for (let i = 0; i < increments; i++) {
        const k = rng.chance(0.7) ? rng.pick(PHYSICAL_DECLINE) : rng.pick(Object.keys(POSITION_WEIGHTS[p.position]) as AttributeKey[]);
        p.attributes[k] = Math.max(1, p.attributes[k] - 1);
      }
      // experience compensates partially in mental attributes for older pros
      if (age >= 29 && rng.chance(0.25)) {
        const k = rng.pick(["decisions", "positioning", "composure", "anticipation"] as AttributeKey[]);
        p.attributes[k] = Math.min(20, p.attributes[k] + 1);
      }
      p.potential = Math.max(overall(p), Math.min(p.potential, overall(p) + 2));
    }
    if (club?.isUser && overall(p) !== before) {
      world.development.push({ playerId: p.id, date: today, overall: overall(p), potential: p.potential });
    }
    // position retraining
    if (p.retrainPosition && !p.altPositions.includes(p.retrainPosition)) {
      if (rng.chance(0.05 + (club ? club.training.intensity * 0.01 : 0))) {
        p.altPositions.push(p.retrainPosition);
        if (club?.isUser) addNews(world, { category: "general", title: `${fullName(p)} can now play ${p.retrainPosition}`, body: `Position training has paid off: ${fullName(p)} is now comfortable as a ${p.retrainPosition}.`, clubIds: [club.id], playerIds: [p.id] });
        p.retrainPosition = null;
      }
    }
  }
  if (world.development.length > 20000) world.development.splice(0, world.development.length - 20000);
}

/** Daily recovery, training load, training injuries and familiarity. */
export function dailyTraining(world: World, rng: Rng): void {
  const today = world.meta.currentDate;
  const fitnessCoach = new Map<ID, number>();
  for (const s of Object.values(world.staff)) if (s.clubId && s.role === "fitness_coach") fitnessCoach.set(s.clubId, Math.max(fitnessCoach.get(s.clubId) ?? 0, s.attributes.fitness));
  for (const club of Object.values(world.clubs)) {
    const t = club.tactics.find((x) => x.id === club.selection?.tacticId) ?? club.tactics[0];
    if (t) t.familiarity = clamp(t.familiarity + (club.training.focus === "tactical" ? 0.35 : club.training.focus === "match_prep" ? 0.2 : 0.06), 0, 100);
  }
  for (const p of Object.values(world.players)) {
    if (p.retired) continue;
    if (p.injury && p.injury.until <= today) {
      const club = p.clubId ? world.clubs[p.clubId] : null;
      if (club?.isUser) addNews(world, { category: "injury", title: `${fullName(p)} returns to training`, body: `${fullName(p)} has recovered from a ${p.injury.type}.`, clubIds: [club.id], playerIds: [p.id] });
      p.injury = null;
      p.fitness = Math.min(p.fitness, 75);
      p.sharpness = Math.min(p.sharpness, 50);
    }
    const club = p.clubId ? world.clubs[p.clubId] : null;
    const intensity = club?.training.intensity ?? 2;
    const focus = club?.training.focus ?? "balanced";
    const fc = club ? fitnessCoach.get(club.id) ?? 6 : 4;
    const injured = !!p.injury;
    let rec = 5 + fc * 0.18 + p.attributes.naturalFitness * 0.12 - intensity * 0.6 + (focus === "recovery" ? 3 : 0);
    if (injured) rec = 1;
    p.fitness = clamp(p.fitness + rec, 20, 100);
    p.fatigue = clamp(p.fatigue - (6 + (focus === "recovery" ? 4 : 0) - intensity * 0.5), 0, 100);
    p.sharpness = clamp(p.sharpness - 0.4 + (focus === "match_prep" ? 0.4 : 0), 0, 100);
    if (club) {
      p.tacticalFamiliarity = clamp(p.tacticalFamiliarity + (focus === "tactical" ? 0.45 : focus === "match_prep" ? 0.25 : 0.08), 0, 100);
      // training injuries scale with intensity
      if (!injured) {
        const risk = 0.00025 * Math.pow(intensity / 3, 2) * (0.6 + p.personality.injuryProneness / 12) * (1 + p.fatigue / 60);
        if (rng.chance(risk)) {
          const days = rng.int(3, 21);
          const until = new Date(Date.parse(today) + days * 86_400_000).toISOString().slice(0, 10);
          p.injury = { type: rng.pick(["muscle strain", "twisted ankle", "knock in training", "back strain"]), until };
          if (club.isUser) addNews(world, { category: "injury", title: `${fullName(p)} injured in training`, body: `${fullName(p)} picked up a ${p.injury.type} in training and will miss around ${days} days.`, clubIds: [club.id], playerIds: [p.id] });
        }
      }
      // morale drifts towards happiness
      p.morale = clamp(p.morale + (p.happiness - p.morale) * 0.03, 5, 100);
    }
  }
}

const YOUTH_POS: Position[] = ["GK", "CB", "CB", "LB", "RB", "DM", "CM", "CM", "AM", "LM", "RM", "LW", "RW", "ST", "ST"];

/** Annual youth intake for one club. Generated players are unique and clearly flagged as generated. */
export function youthIntake(world: World, clubId: ID, rng: Rng): ID[] {
  const club = world.clubs[clubId];
  const nation = world.nations[club.nationId];
  const youthCoach = Object.values(world.staff).filter((s) => s.clubId === clubId && s.role === "youth_coach").reduce((m, s) => Math.max(m, s.attributes.youth), 5);
  const count = clamp(3 + Math.round(club.facilities.youth / 5) + rng.int(0, 3), 3, 10);
  const existing = new Set(Object.values(world.players).map((p) => `${p.firstName}|${p.lastName}|${p.dob}`));
  const ids: ID[] = [];
  for (let i = 0; i < count; i++) {
    const age = rng.int(15, 17);
    const potMean = 42 + club.facilities.youthRecruitment * 1.4 + (nation?.youthRating ?? 10) * 0.8 + youthCoach * 0.5;
    const potential = clamp(Math.round(rng.normal(potMean, 9)), 38, 95);
    const ovr = clamp(Math.round(potential * rng.range(0.42, 0.62)), 22, 58);
    const pos = rng.pick(YOUTH_POS);
    const pool = rng.chance(0.85) ? nation?.namePool ?? "anglic" : rng.pick(Object.values(world.nations)).namePool;
    let p: Player | null = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const cand = generatePlayer(rng, { id: newId(world, "yth"), nationId: rng.chance(0.9) ? club.nationId : rng.pick(Object.keys(world.nations)), namePool: pool, position: pos, overall: ovr, potential, dob: randomDob(rng, world.meta.currentDate, age), clubId, generated: true });
      const key = `${cand.firstName}|${cand.lastName}|${cand.dob}`;
      if (!existing.has(key) && !world.players[cand.id]) {
        existing.add(key);
        p = cand;
        break;
      }
    }
    if (!p) continue;
    p.contract = { wage: Math.round(150 + club.reputation * 6), startDate: world.meta.currentDate, endDate: `${Number(world.meta.currentDate.slice(0, 4)) + 3}-06-30`, releaseClause: null, squadRole: "prospect", appearanceBonus: 0, goalBonus: 0, youth: true };
    p.morale = 75;
    world.players[p.id] = p;
    invalidateSquadIndex(world);
    ids.push(p.id);
  }
  world.youthIntakes.push({ id: newId(world, "yi"), clubId, date: world.meta.currentDate, playerIds: ids });
  if (club.isUser) {
    const best = ids.map((id) => world.players[id]).sort((a, b) => b.potential - a.potential)[0];
    addNews(world, { category: "youth", title: `Youth intake: ${ids.length} new academy players`, body: `This year's intake has arrived.${best ? ` Staff are excited about ${fullName(best)} (${best.position}).` : ""}`, clubIds: [clubId], playerIds: ids, important: true });
  }
  return ids;
}

/** End-of-season retirements. */
export function processRetirements(world: World, rng: Rng): void {
  for (const p of Object.values(world.players)) {
    if (p.retired) continue;
    const age = ageOn(p.dob, world.meta.currentDate);
    const ovr = overall(p);
    let chance = 0;
    if (age >= 39) chance = 1;
    else if (age >= 36) chance = 0.45 + (60 - ovr) * 0.02;
    else if (age >= 34) chance = 0.15 + (55 - ovr) * 0.02;
    else if (age >= 31 && !p.clubId) chance = 0.25;
    if (chance > 0 && rng.chance(clamp(chance, 0, 1))) {
      const club = p.clubId ? world.clubs[p.clubId] : null;
      if (club?.isUser) addNews(world, { category: "general", title: `${fullName(p)} retires`, body: `${fullName(p)} has announced retirement at the age of ${age}.`, clubIds: [club.id], playerIds: [p.id] });
      world.transfers.push({ id: newId(world, "tr"), playerId: p.id, fromClubId: p.clubId, toClubId: null, date: world.meta.currentDate, fee: 0, type: "retirement", seasonId: world.meta.currentSeasonId, sellOnPct: 0, sellOnBeneficiaryClubId: null, addOns: [] });
      p.retired = true;
      p.clubId = null;
      invalidateSquadIndex(world);
      p.loanParentClubId = null;
      p.contract = null;
    }
  }
}
