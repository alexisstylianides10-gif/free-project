import type { Competition, CompetitionSeason, CupTie, Fixture, ID, ISODate, MatchRecord, Season, World } from "../core/types";
import { newId } from "../core/ids";
import { addDays, toDate } from "../core/dates";
import { Rng } from "../core/rng";
import { datesOnWeekday, roundRobin, spreadDates } from "./schedule";
import { groupTables, leagueTable } from "./table";

export function seasonLabel(startYear: number): string {
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export function createSeason(world: World, startDate: ISODate): Season {
  const y = toDate(startDate).getUTCFullYear();
  const season: Season = {
    id: `s_${y}`,
    label: seasonLabel(y),
    startDate,
    endDate: `${y + 1}-06-30`,
    transferWindows: [
      { start: `${y}-07-01`, end: `${y}-08-31` },
      { start: `${y + 1}-01-01`, end: `${y + 1}-01-31` },
    ],
    status: "active",
  };
  world.seasons[season.id] = season;
  return season;
}

export function isTransferWindowOpen(world: World, date: ISODate): boolean {
  const s = world.seasons[world.meta.currentSeasonId];
  if (!s) return false;
  return s.transferWindows.some((w) => date >= w.start && date <= w.end);
}

/** Entrants for a competition in a new season. */
export function entrantsFor(world: World, comp: Competition, rng: Rng): ID[] {
  const clubs = Object.values(world.clubs);
  if (comp.type === "league") return clubs.filter((c) => c.leagueId === comp.id).map((c) => c.id).sort();
  if (comp.type === "cup" && comp.cup) {
    const ids = clubs.filter((c) => c.leagueId && comp.cup!.entrantLeagueIds.includes(c.leagueId)).sort((a, b) => b.reputation - a.reputation).map((c) => c.id);
    return ids.slice(0, comp.cup.bracketSize);
  }
  // continental: computed qualifiers (from previous season or dataset seed)
  const q = world.qualifiers[comp.id];
  if (q && q.length) return q.filter((id) => world.clubs[id]).slice();
  void rng;
  return [];
}

function makeFixture(world: World, cs: CompetitionSeason, comp: Competition, date: ISODate, round: number, roundName: string, home: ID, away: ID, extra: Partial<Fixture> = {}): Fixture {
  const f: Fixture = {
    id: newId(world, "fx"),
    competitionSeasonId: cs.id,
    competitionId: comp.id,
    seasonId: cs.seasonId,
    date,
    round,
    roundName,
    homeClubId: home,
    awayClubId: away,
    stadiumId: world.clubs[home]?.tempStadiumId ?? world.clubs[home]?.stadiumId ?? null,
    tieId: null,
    leg: null,
    groupIndex: null,
    status: "scheduled",
    matchId: null,
    requiresWinner: false,
    ...extra,
  };
  world.fixtures[f.id] = f;
  return f;
}

/** Create competition seasons and fixtures for every competition. */
export function setupCompetitionSeasons(world: World, season: Season, rng: Rng): void {
  const y = toDate(season.startDate).getUTCFullYear();
  const leagueStart = `${y}-08-08`;
  const leagueEnd = `${y + 1}-05-29`;
  // international breaks (no league games)
  const blocked = new Set<ISODate>();
  for (const md of [`${y}-09-05`, `${y}-10-10`, `${y}-11-14`, `${y + 1}-03-27`]) {
    for (let k = -3; k <= 3; k++) blocked.add(addDays(md, k));
  }
  for (const comp of Object.values(world.competitions)) {
    const clubIds = entrantsFor(world, comp, rng);
    const cs: CompetitionSeason = {
      id: `cs_${comp.id}_${season.id}`,
      competitionId: comp.id,
      seasonId: season.id,
      clubIds,
      groups: [],
      ties: [],
      currentRound: 0,
      roundDates: [],
      stage: comp.type === "league" ? "league" : comp.cup?.groupStage ? "groups" : "knockout",
      status: "scheduled",
      championId: null,
      finalPositions: [],
    };
    world.competitionSeasons[cs.id] = cs;
    if (clubIds.length < 2) {
      cs.status = "completed";
      continue;
    }
    if (comp.type === "league" && comp.league) {
      const rounds = roundRobin(rng.shuffle(clubIds.slice()), comp.league.rounds);
      let candidates = datesOnWeekday(leagueStart, leagueEnd, 6).filter((d) => !blocked.has(d));
      if (candidates.length < rounds.length) {
        const extra = datesOnWeekday(leagueStart, leagueEnd, 3).filter((d) => !blocked.has(d));
        candidates = [...candidates, ...extra].sort();
      }
      const dates = spreadDates(candidates, rounds.length);
      rounds.forEach((pairs, r) => {
        for (const [h, a] of pairs) makeFixture(world, cs, comp, dates[r], r + 1, `Matchday ${r + 1}`, h, a);
      });
      cs.status = "in_progress";
      continue;
    }
    if (!comp.cup) continue;
    const cup = comp.cup;
    const wd = comp.preferredWeekday;
    if (cup.groupStage) {
      const gs = cup.groupStage;
      // seeded draw with pots by reputation
      const sorted = clubIds.slice().sort((a, b) => world.clubs[b].reputation - world.clubs[a].reputation).slice(0, gs.groups * gs.teamsPerGroup);
      const groups: { name: string; clubIds: ID[] }[] = Array.from({ length: gs.groups }, (_, i) => ({ name: `Group ${String.fromCharCode(65 + i)}`, clubIds: [] }));
      for (let pot = 0; pot < gs.teamsPerGroup; pot++) {
        const potClubs = rng.shuffle(sorted.slice(pot * gs.groups, (pot + 1) * gs.groups));
        // avoid same-nation clashes where possible
        for (const club of potClubs) {
          const nation = world.clubs[club].nationId;
          const open = groups.filter((g) => g.clubIds.length === pot);
          const pref = open.find((g) => !g.clubIds.some((c) => world.clubs[c].nationId === nation)) ?? open[0];
          pref.clubIds.push(club);
        }
      }
      cs.groups = groups;
      cs.clubIds = sorted;
      const groupDates = spreadDates(datesOnWeekday(`${y}-09-14`, `${y}-12-12`, wd), gs.rounds * (gs.teamsPerGroup - 1));
      groups.forEach((g, gi) => {
        const rr = roundRobin(g.clubIds, gs.rounds);
        rr.forEach((pairs, r) => {
          for (const [h, a] of pairs) makeFixture(world, cs, comp, groupDates[r], r + 1, `Group matchday ${r + 1}`, h, a, { groupIndex: gi });
        });
      });
      const koDates = spreadDates(datesOnWeekday(`${y + 1}-02-14`, `${y + 1}-05-25`, wd), cup.rounds.reduce((s, r) => s + r.legs, 0));
      let k = 0;
      cs.roundDates = cup.rounds.map((r) => koDates.slice(k, (k += r.legs)));
      cs.status = "in_progress";
      continue;
    }
    // pure knockout
    const legsTotal = cup.rounds.reduce((s, r) => s + r.legs, 0);
    const koDates = spreadDates(datesOnWeekday(`${y}-09-01`, `${y + 1}-05-20`, wd).filter((d) => !blocked.has(d)), legsTotal);
    let k = 0;
    cs.roundDates = cup.rounds.map((r) => koDates.slice(k, (k += r.legs)));
    drawKnockoutRound(world, cs, comp, 0, clubIds, rng);
    cs.status = "in_progress";
  }
}

/** Draw a knockout round and create its fixtures. `clubIds` are the clubs still in the competition. */
export function drawKnockoutRound(world: World, cs: CompetitionSeason, comp: Competition, roundIndex: number, clubIds: ID[], rng: Rng, seededPairs?: [ID, ID][]): void {
  const cup = comp.cup!;
  const round = cup.rounds[roundIndex];
  if (!round) return;
  cs.currentRound = roundIndex;
  cs.stage = "knockout";
  const slots = 2 ** (cup.rounds.length - roundIndex);
  let pairs: [ID, ID][] = [];
  const byes: ID[] = [];
  if (seededPairs) pairs = seededPairs;
  else {
    const ordered = clubIds.slice().sort((a, b) => world.clubs[b].reputation - world.clubs[a].reputation);
    const nByes = Math.max(0, slots - ordered.length);
    byes.push(...ordered.slice(0, nByes));
    const rest = rng.shuffle(ordered.slice(nByes));
    for (let i = 0; i + 1 < rest.length; i += 2) {
      let h = rest[i];
      let a = rest[i + 1];
      if (cup.homeAdvantageToLowerTier) {
        const th = world.competitions[world.clubs[h].leagueId ?? ""]?.tier ?? 1;
        const ta = world.competitions[world.clubs[a].leagueId ?? ""]?.tier ?? 1;
        if (ta > th) [h, a] = [a, h];
      }
      pairs.push([h, a]);
    }
    if (rest.length % 2 === 1) byes.push(rest[rest.length - 1]);
  }
  let dates = cs.roundDates[roundIndex] ?? [];
  const today = world.meta.currentDate;
  if (dates.length < round.legs || dates[0] <= today) {
    // keep the round in the future (e.g. when a previous round finished late)
    dates = datesOnWeekday(addDays(today, 3), addDays(today, 90), comp.preferredWeekday).slice(0, round.legs);
    cs.roundDates[roundIndex] = dates;
  }
  const isFinal = roundIndex === cup.rounds.length - 1;
  for (const [h, a] of pairs) {
    const tie: CupTie = { id: newId(world, "tie"), roundIndex, homeClubId: h, awayClubId: a, fixtureIds: [], winnerId: null, decidedBy: null };
    const leg1 = makeFixture(world, cs, comp, dates[0], roundIndex + 1, round.name + (round.legs === 2 ? " (1st leg)" : ""), h, a, { tieId: tie.id, leg: 1, requiresWinner: round.legs === 1 });
    tie.fixtureIds.push(leg1.id);
    if (round.legs === 2) {
      const leg2 = makeFixture(world, cs, comp, dates[1], roundIndex + 1, round.name + " (2nd leg)", a, h, { tieId: tie.id, leg: 2, requiresWinner: true });
      tie.fixtureIds.push(leg2.id);
    }
    if (isFinal && round.legs === 1) leg1.stadiumId = world.clubs[h]?.stadiumId ?? null;
    cs.ties.push(tie);
  }
  for (const b of byes) cs.ties.push({ id: newId(world, "tie"), roundIndex, homeClubId: b, awayClubId: b, fixtureIds: [], winnerId: b, decidedBy: "walkover" });
}

/** Aggregate goals for a tie from the perspective of the first-leg home club. */
export function tieAggregate(world: World, tie: CupTie): { home: number; away: number; homeAway: number; awayAway: number; legsPlayed: number } {
  let home = 0, away = 0, homeAway = 0, awayAway = 0, legsPlayed = 0;
  for (const fid of tie.fixtureIds) {
    const f = world.fixtures[fid];
    if (!f || f.status !== "played" || !f.matchId) continue;
    const m = world.matches[f.matchId];
    legsPlayed++;
    if (f.homeClubId === tie.homeClubId) {
      home += m.homeGoals;
      away += m.awayGoals;
      awayAway += m.awayGoals;
    } else {
      home += m.awayGoals;
      away += m.homeGoals;
      homeAway += m.awayGoals;
    }
  }
  return { home, away, homeAway, awayAway, legsPlayed };
}

/** Prior goals for the decisive leg, in that fixture's home/away orientation. */
export function priorForFixture(world: World, f: Fixture): { prior: [number, number] | null; priorAway: [number, number] | null } {
  if (!f.tieId || f.leg !== 2) return { prior: null, priorAway: null };
  const cs = world.competitionSeasons[f.competitionSeasonId];
  const tie = cs.ties.find((t) => t.id === f.tieId);
  if (!tie) return { prior: null, priorAway: null };
  const leg1 = world.fixtures[tie.fixtureIds[0]];
  if (!leg1 || !leg1.matchId) return { prior: null, priorAway: null };
  const m = world.matches[leg1.matchId];
  // leg2 home = leg1 away
  return { prior: [m.awayGoals, m.homeGoals], priorAway: [m.awayGoals, 0] };
}

/**
 * Called after a cup/continental fixture is played. Resolves ties, advances
 * rounds, completes the competition.
 */
export function onKnockoutFixturePlayed(world: World, f: Fixture, match: MatchRecord, rng: Rng): { championId: ID | null } {
  const cs = world.competitionSeasons[f.competitionSeasonId];
  const comp = world.competitions[f.competitionId];
  if (!comp.cup) return { championId: null };
  if (f.tieId) {
    const tie = cs.ties.find((t) => t.id === f.tieId);
    if (tie && !tie.winnerId) {
      const allPlayed = tie.fixtureIds.every((id) => world.fixtures[id].status === "played");
      if (allPlayed) {
        const agg = tieAggregate(world, tie);
        if (agg.home !== agg.away) {
          tie.winnerId = agg.home > agg.away ? tie.homeClubId : tie.awayClubId;
          tie.decidedBy = tie.fixtureIds.length > 1 ? "aggregate" : match.extraTime ? "extra_time" : "normal";
        } else if (comp.cup.awayGoals && tie.fixtureIds.length > 1 && agg.homeAway !== agg.awayAway) {
          tie.winnerId = agg.homeAway > agg.awayAway ? tie.homeClubId : tie.awayClubId;
          tie.decidedBy = "aggregate";
        } else if (match.penalties) {
          const lastHomeWon = match.penalties.home > match.penalties.away;
          tie.winnerId = lastHomeWon ? f.homeClubId : f.awayClubId;
          tie.decidedBy = "penalties";
        } else {
          // should not happen (engine enforces a winner); resolve deterministically
          tie.winnerId = rng.chance(0.5) ? tie.homeClubId : tie.awayClubId;
          tie.decidedBy = "penalties";
        }
      }
    }
    // round complete?
    const roundTies = cs.ties.filter((t) => t.roundIndex === tie?.roundIndex);
    if (tie && roundTies.every((t) => t.winnerId)) {
      const winners = roundTies.map((t) => t.winnerId!) as ID[];
      if (tie.roundIndex === comp.cup.rounds.length - 1 || winners.length === 1) {
        cs.championId = winners[0];
        cs.status = "completed";
        return { championId: winners[0] };
      }
      drawKnockoutRound(world, cs, comp, tie.roundIndex + 1, winners, rng);
    }
    return { championId: null };
  }
  // group stage fixture
  if (cs.stage === "groups" && comp.cup.groupStage) {
    const groupFixtures = Object.values(world.fixtures).filter((x) => x.competitionSeasonId === cs.id && x.groupIndex !== null);
    if (groupFixtures.every((x) => x.status === "played")) {
      const tables = groupTables(world, cs);
      const adv = comp.cup.groupStage.advancePerGroup;
      const winners = tables.map((t) => t.rows[0].clubId);
      const runners = adv > 1 ? tables.map((t) => t.rows[1].clubId) : [];
      const pairs: [ID, ID][] = [];
      if (adv > 1) {
        // group runner-up hosts the first leg
        for (let i = 0; i < winners.length; i++) pairs.push([runners[(i + 1) % runners.length], winners[i]]);
      } else {
        for (let i = 0; i + 1 < winners.length; i += 2) pairs.push([winners[i + 1], winners[i]]);
      }
      drawKnockoutRound(world, cs, comp, 0, [], rng, pairs);
    }
  }
  return { championId: null };
}

export function leagueStandings(world: World, compId: ID) {
  const cs = world.competitionSeasons[`cs_${compId}_${world.meta.currentSeasonId}`];
  if (!cs) return [];
  return leagueTable(world, cs);
}

export function currentCompetitionSeason(world: World, compId: ID): CompetitionSeason | undefined {
  return world.competitionSeasons[`cs_${compId}_${world.meta.currentSeasonId}`];
}
