import type { Club, Competition, Fixture, ID, MatchRecord, SeasonStats, World } from "../core/types";
import { deriveSeed, Rng } from "../core/rng";
import { addDays } from "../core/dates";
import { clamp } from "../core/util";
import { MatchSimulation, type EngineResult, type EngineTeamInput } from "../match/engine";
import { activeTactic, autoSelect, validateSelection } from "../tactics/selection";
import { onKnockoutFixturePlayed, priorForFixture } from "../competition/season";
import { postTransaction } from "../finance/ledger";
import { afterMatchMood } from "./board";
import { addNews } from "./news";
import { fullName } from "./players";
import { newId } from "../core/ids";
import { clubPlayers } from "./index";

export function emptySeasonStats(): SeasonStats {
  return { apps: 0, starts: 0, minutes: 0, goals: 0, assists: 0, yellow: 0, red: 0, cleanSheets: 0, ratingSum: 0, xg: 0, shots: 0, passes: 0, passesCompleted: 0, tackles: 0, interceptions: 0, saves: 0 };
}

export function stadiumFor(world: World, f: Fixture) {
  const home = world.clubs[f.homeClubId];
  return world.stadiums[f.stadiumId ?? home.tempStadiumId ?? home.stadiumId] ?? world.stadiums[home.stadiumId];
}

/** Usable capacity (reduced while construction is under way). */
export function effectiveCapacity(world: World, stadiumId: ID): number {
  const st = world.stadiums[stadiumId];
  if (!st) return 0;
  let cap = st.capacity;
  for (const p of st.projects) if (p.startDate <= world.meta.currentDate && p.endDate > world.meta.currentDate) cap -= p.capacityReduction;
  return Math.max(0, cap);
}

/**
 * Attendance model: demand depends on club reputation, supporter mood, league
 * position, opponent appeal, competition and ticket price (elastic), capped by
 * usable stadium capacity.
 */
export function attendanceFor(world: World, f: Fixture): number {
  const home = world.clubs[f.homeClubId];
  const away = world.clubs[f.awayClubId];
  const st = stadiumFor(world, f);
  if (!st) return 0;
  const cap = effectiveCapacity(world, st.id);
  const comp = world.competitions[f.competitionId];
  const refPrice = 12 + home.reputation * 0.45;
  const priceRatio = home.finance.ticketPrice / refPrice;
  let demand = 0.32 + home.reputation / 160 + (home.supporterMood - 50) / 250 + away.reputation / 450 + (comp.type === "continental" ? 0.15 : comp.type === "cup" ? -0.05 : 0);
  if (f.roundName.includes("Final") || f.roundName.includes("Semi")) demand += 0.2;
  demand -= (priceRatio - 1) * 0.45;
  demand += (st.facilities - 3) * 0.02;
  const base = clamp(demand, 0.12, 1.0);
  const fanbase = 6_000 + home.reputation * home.reputation * 9;
  return Math.max(0, Math.round(Math.min(cap, fanbase * base * 1.6, cap * base * 1.15)));
}

export function buildTeamInput(world: World, club: Club, comp: Competition, fixture: Fixture, manual: boolean): EngineTeamInput {
  const today = fixture.date;
  let tactic = activeTactic(club);
  let sel = club.selection;
  if (!club.isUser || !sel || !club.tactics.some((t) => t.id === sel!.tacticId)) {
    const rotate = !club.isUser && comp.type === "cup" && comp.tier === 1 && club.reputation >= 60;
    sel = autoSelect(world, club, tactic, comp, today, { rotate, keepExisting: club.isUser ? sel : null });
    if (club.isUser) club.selection = sel;
  } else {
    tactic = club.tactics.find((t) => t.id === sel!.tacticId) ?? tactic;
    const issues = validateSelection(world, club, sel, comp, today).filter((i) => i.level === "error");
    if (issues.length) {
      // The assistant manager fills gaps (injuries/suspensions) so matches are never forfeited.
      sel = autoSelect(world, club, tactic, comp, today, { keepExisting: sel });
      if (sel.autoFill) club.selection = { ...sel };
    }
  }
  const starters = tactic.slots
    .filter((s) => sel!.starters[s.id] && world.players[sel!.starters[s.id]])
    .map((s) => ({ slotId: s.id, player: world.players[sel!.starters[s.id]] }));
  const benchMax = comp.matchday.benchSize;
  const bench = sel.bench.filter((id) => world.players[id] && !starters.some((s) => s.player.id === id)).slice(0, benchMax).map((id) => world.players[id]);
  const xi = starters.map((s) => s.player);
  const cohesion = xi.length ? (xi.reduce((a, p) => a + p.tacticalFamiliarity, 0) / xi.length) * 0.6 + tactic.familiarity * 0.4 : 50;
  return {
    clubId: club.id, name: club.shortName, tactic, starters, bench, captainId: sel.captainId, penaltyTakerId: sel.penaltyTakerId, freeKickTakerId: sel.freeKickTakerId,
    cornerTakerId: sel.cornerTakerId, cohesion, maxSubs: comp.matchday.substitutes, manualControl: manual,
  };
}

export function createMatchSimulation(world: World, fixtureId: ID, opts: { userManual: boolean; detailed: boolean }): MatchSimulation {
  const f = world.fixtures[fixtureId];
  if (!f) throw new Error(`Fixture ${fixtureId} not found`);
  if (f.status === "played") throw new Error("This fixture has already been played.");
  const comp = world.competitions[f.competitionId];
  const home = world.clubs[f.homeClubId];
  const away = world.clubs[f.awayClubId];
  const hi = buildTeamInput(world, home, comp, f, opts.userManual && home.isUser);
  const ai = buildTeamInput(world, away, comp, f, opts.userManual && away.isUser);
  const { prior, priorAway } = priorForFixture(world, f);
  const neutral = f.roundName.startsWith("Final") && comp.type !== "league";
  return new MatchSimulation(hi, ai, {
    seed: deriveSeed(world.meta.seed, f.id),
    homeAdvantage: !neutral,
    requiresWinner: f.requiresWinner,
    extraTime: !!comp.cup?.extraTime,
    penalties: comp.cup?.penalties ?? true,
    priorGoals: prior,
    priorAwayGoals: priorAway,
    awayGoalsRule: !!comp.cup?.awayGoals,
    detailed: opts.detailed,
  });
}

/** Apply an engine result to the world. Idempotent: a played fixture cannot be applied twice. */
export function applyMatchResult(world: World, fixtureId: ID, r: EngineResult, detailed: boolean): MatchRecord {
  const f = world.fixtures[fixtureId];
  if (f.status === "played") throw new Error("Fixture already has a result.");
  const comp = world.competitions[f.competitionId];
  const home = world.clubs[f.homeClubId];
  const away = world.clubs[f.awayClubId];
  const attendance = attendanceFor(world, f);
  const match: MatchRecord = {
    id: newId(world, "m"), fixtureId: f.id, date: f.date, homeClubId: home.id, awayClubId: away.id, homeGoals: r.goals[0], awayGoals: r.goals[1],
    extraTime: r.extraTime, penalties: r.penalties, attendance, stats: r.stats,
    // AI-vs-AI matches keep only aggregate stats and key events to bound save size
    lines: home.isUser || away.isUser ? r.lines : [], events: r.events, detailed, seed: deriveSeed(world.meta.seed, f.id),
    playerOfMatchId: r.playerOfMatchId, shapes: detailed ? r.shapes : undefined,
  };
  world.matches[match.id] = match;
  f.status = "played";
  f.matchId = match.id;

  // gate receipts (home club); cup finals split between both clubs
  const st = stadiumFor(world, f);
  const ticket = attendance * home.finance.ticketPrice;
  const hosp = st ? st.vipBoxes * 1500 + st.hospitality * attendance * 1.2 : 0;
  const isFinal = f.roundName.startsWith("Final") && comp.type !== "league";
  if (isFinal) {
    postTransaction(world, home.id, ticket / 2, "ticket_sales", `Gate share: ${comp.shortName} final`, `gate:${f.id}:h`, f.date);
    postTransaction(world, away.id, ticket / 2, "ticket_sales", `Gate share: ${comp.shortName} final`, `gate:${f.id}:a`, f.date);
  } else {
    postTransaction(world, home.id, ticket, "ticket_sales", `Ticket sales vs ${away.shortName}`, `gate:${f.id}`, f.date);
    if (hosp > 0) postTransaction(world, home.id, hosp, "hospitality", `Hospitality vs ${away.shortName}`, `hosp:${f.id}`, f.date);
  }
  if (st) st.pitchQuality = clamp(st.pitchQuality - 0.6, 20, 100);

  // player updates
  const played = new Set<ID>();
  for (const line of r.lines) {
    const p = world.players[line.playerId];
    if (!p) continue;
    played.add(p.id);
    const s = (p.seasonStats[comp.id] ||= emptySeasonStats());
    s.apps++;
    if (line.started) s.starts++;
    s.minutes += line.minutes;
    s.goals += line.goals;
    s.assists += line.assists;
    s.yellow += line.yellow;
    s.red += line.red;
    s.ratingSum += line.rating;
    s.xg += line.xg;
    s.shots += line.shots;
    s.passes += line.passes;
    s.passesCompleted += line.passesCompleted;
    s.tackles += line.tackles;
    s.interceptions += line.interceptions;
    s.saves += line.saves;
    const conceded = line.side === 0 ? r.goals[1] : r.goals[0];
    if (conceded === 0 && line.minutes >= 60 && ["GK", "CB", "LB", "RB", "LWB", "RWB"].includes(line.position)) s.cleanSheets++;
    p.form = Math.round((p.form * 0.7 + line.rating * 0.3) * 100) / 100;
    p.fitness = clamp(p.fitness - line.minutes * 0.32 - line.fatigueEnd * 0.05, 25, 100);
    p.fatigue = clamp(p.fatigue + line.minutes * 0.22, 0, 100);
    p.sharpness = clamp(p.sharpness + line.minutes * 0.12, 0, 100);
    p.tacticalFamiliarity = clamp(p.tacticalFamiliarity + line.minutes / 90 * 1.5, 0, 100);
    const won = (line.side === 0 && r.goals[0] > r.goals[1]) || (line.side === 1 && r.goals[1] > r.goals[0]);
    const lost = (line.side === 0 && r.goals[0] < r.goals[1]) || (line.side === 1 && r.goals[1] < r.goals[0]);
    p.morale = clamp(p.morale + (won ? 3 : lost ? -3 : 0) + (line.rating - 6.6) * 2, 5, 100);
    // discipline
    if (line.red > 0) {
      const second = r.events.some((e) => e.type === "second_yellow" && e.playerId === p.id);
      p.suspensions.push({ competitionId: comp.id, matches: second ? 1 : 3, reason: second ? "Two yellow cards" : "Red card" });
    } else if (line.yellow > 0) {
      const acc = (p.yellowAccumulation[comp.id] ?? 0) + line.yellow;
      if (acc >= comp.yellowCardBanThreshold) {
        p.suspensions.push({ competitionId: comp.id, matches: 1, reason: `${comp.yellowCardBanThreshold} yellow cards` });
        p.yellowAccumulation[comp.id] = 0;
      } else p.yellowAccumulation[comp.id] = acc;
    }
    // appearance & goal bonuses
    if (p.contract && p.clubId) {
      const bonus = p.contract.appearanceBonus + p.contract.goalBonus * line.goals;
      if (bonus > 0) postTransaction(world, p.clubId, -bonus, "bonus", `Bonuses: ${fullName(p)}`, `bonus:${f.id}:${p.id}`, f.date);
    }
  }
  // suspensions served by players who were banned for this competition
  for (const club of [home, away]) {
    for (const p of clubPlayers(world, club.id)) {
      if (played.has(p.id)) continue;
      for (const s of p.suspensions) if (s.matches > 0 && (s.competitionId === comp.id || s.competitionId === null)) {
        s.matches--;
        break;
      }
      p.suspensions = p.suspensions.filter((s) => s.matches > 0);
    }
  }
  // injuries – medical staff & facilities shorten recovery
  for (const inj of r.injuries) {
    const p = world.players[inj.playerId];
    if (!p || !p.clubId) continue;
    const club = world.clubs[p.clubId];
    const physio = Object.values(world.staff).filter((s) => s.clubId === club.id && s.role === "physio").reduce((m, s) => Math.max(m, s.attributes.medical), 8);
    const factor = clamp(1.15 - physio * 0.012 - club.facilities.medical * 0.01, 0.7, 1.1);
    const days = Math.max(1, Math.round(inj.days * factor));
    p.injury = { type: inj.type, until: addDays(f.date, days) };
    p.fitness = Math.min(p.fitness, 60);
    if (club.isUser) addNews(world, { category: "injury", title: `${fullName(p)} injured`, body: `${fullName(p)} suffered a ${inj.type} and is expected to be out for around ${days} days.`, clubIds: [club.id], playerIds: [p.id] });
  }
  // board & supporters
  afterMatchMood(world, home.id, r.goals[0], r.goals[1], away.reputation);
  afterMatchMood(world, away.id, r.goals[1], r.goals[0], home.reputation);
  // tactical familiarity grows with use
  for (const club of [home, away]) {
    const t = activeTactic(club);
    if (t) t.familiarity = clamp(t.familiarity + 0.8, 0, 100);
  }
  // knockout progression
  if (comp.cup) {
    const rng = new Rng(deriveSeed(world.meta.seed, f.id, "draw"));
    const { championId } = onKnockoutFixturePlayed(world, f, match, rng);
    if (championId) {
      const champ = world.clubs[championId];
      world.trophies.push({ id: newId(world, "tro"), clubId: championId, competitionId: comp.id, seasonId: world.meta.currentSeasonId, seasonLabel: world.seasons[world.meta.currentSeasonId].label });
      postTransaction(world, championId, comp.cup.prizeMoneyWinner, "prize_money", `${comp.name} winners`, `prize:${comp.id}:${world.meta.currentSeasonId}`, f.date);
      addNews(world, { category: "competition", title: `${champ.name} win the ${comp.name}!`, body: `${champ.name} are ${comp.name} champions for ${world.seasons[world.meta.currentSeasonId].label}.`, clubIds: [championId], important: true });
    }
  }
  if (home.isUser || away.isUser) {
    const user = home.isUser ? home : away;
    const opp = home.isUser ? away : home;
    const gf = home.isUser ? r.goals[0] : r.goals[1];
    const ga = home.isUser ? r.goals[1] : r.goals[0];
    const res = gf > ga ? "win" : gf < ga ? "defeat" : "draw";
    const pens = r.penalties ? ` (${home.isUser ? r.penalties.home : r.penalties.away}-${home.isUser ? r.penalties.away : r.penalties.home} pens)` : "";
    addNews(world, { category: "match", title: `${res === "win" ? "Victory" : res === "draw" ? "Draw" : "Defeat"}: ${home.shortName} ${r.goals[0]}-${r.goals[1]} ${away.shortName}${pens}`, body: `${comp.name}, ${f.roundName}. ${user.shortName} ${gf}-${ga} ${opp.shortName}. Attendance ${attendance.toLocaleString()}.`, clubIds: [user.id] });
  }
  return match;
}

/** Instant simulation of a fixture (used for every AI match and for the user's "instant result"). */
export function playFixture(world: World, fixtureId: ID, detailed = false): MatchRecord {
  const sim = createMatchSimulation(world, fixtureId, { userManual: false, detailed });
  const r = sim.simulateToEnd();
  return applyMatchResult(world, fixtureId, r, detailed);
}

export function userFixtureOn(world: World, date: string): Fixture | null {
  const uc = world.meta.userClubId;
  for (const id in world.fixtures) {
    const f = world.fixtures[id];
    if (f.date === date && f.status === "scheduled" && (f.homeClubId === uc || f.awayClubId === uc)) return f;
  }
  return null;
}

export function nextUserFixture(world: World): Fixture | null {
  const uc = world.meta.userClubId;
  let best: Fixture | null = null;
  for (const id in world.fixtures) {
    const f = world.fixtures[id];
    if (f.status !== "scheduled" || (f.homeClubId !== uc && f.awayClubId !== uc)) continue;
    if (f.date < world.meta.currentDate) continue;
    if (!best || f.date < best.date) best = f;
  }
  return best;
}
