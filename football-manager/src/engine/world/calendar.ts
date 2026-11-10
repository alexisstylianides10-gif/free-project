import type { ClubSeasonEntry, ID, World } from "../core/types";
import { Rng } from "../core/rng";
import { addDays, monthDay, weekday } from "../core/dates";
import { clamp, niceMoney } from "../core/util";
import { overall } from "../core/ratings";
import { newId } from "../core/ids";
import { createSeason, setupCompetitionSeasons } from "../competition/season";
import { leagueTable } from "../competition/table";
import { postTransaction, weeklyWageBill } from "../finance/ledger";
import { dailyTraining, processRetirements, weeklyDevelopment, youthIntake } from "../development/progression";
import { aiContractRenewals, aiFillSquadsAndStaff, aiFinancialReview, aiManagerChanges, aiTransferDay, expireContracts, expireStaleNegotiations } from "../ai/clubAI";
import { endLoan, processTransferPayments, rollAddOnCounters } from "../transfers/market";
import { processStadiumProjects, weeklyStadiumMaintenance } from "../club/stadium";
import { processScouting } from "../club/scouting";
import { paySponsorships, payPerformanceBonuses, generateSponsorOffers } from "./commercial";
import { generateBoardObjectives, monthlyBoardReview, resolveSeasonObjectives, ordinal } from "./board";
import { playFixture, userFixtureOn } from "./matchday";
import { assignSquadRoles, fullName, refreshValues } from "./players";
import { addNews } from "./news";
import { aiTacticFor } from "./create";

export class CalendarError extends Error {}

export interface DayReport {
  date: string;
  processed: boolean;
  /** The user has an unplayed match today and must play it before the day can be processed. */
  userMatchPending: ID | null;
  matchesPlayed: number;
  seasonEnded: boolean;
  sacked: boolean;
}

/**
 * Process exactly one calendar day. Deterministic for a given world state:
 * the RNG state is persisted in the world, entities are processed in sorted
 * order, and a date can never be processed twice.
 */
export function advanceDay(world: World, opts: { simulateUserMatch: boolean } = { simulateUserMatch: true }): DayReport {
  const date = world.meta.currentDate;
  if (world.meta.lastProcessedDate && date <= world.meta.lastProcessedDate) throw new CalendarError(`Date ${date} has already been processed.`);
  if (world.manager.sacked) throw new CalendarError("You have been dismissed. Start a new career or load a save.");
  const report: DayReport = { date, processed: false, userMatchPending: null, matchesPlayed: 0, seasonEnded: false, sacked: false };
  const userFixture = userFixtureOn(world, date);
  if (userFixture && !opts.simulateUserMatch) {
    report.userMatchPending = userFixture.id;
    return report;
  }
  const rng = new Rng(world.meta.rngState);
  // 1. matches (user's first so its result is detailed)
  if (userFixture) {
    playFixture(world, userFixture.id, true);
    report.matchesPlayed++;
  }
  const todays = Object.values(world.fixtures).filter((f) => f.date === date && f.status === "scheduled").sort((a, b) => a.id.localeCompare(b.id));
  for (const f of todays) {
    // a fixture may have been created/resolved while processing others (cup draws) – re-check status
    if (world.fixtures[f.id].status !== "scheduled") continue;
    playFixture(world, f.id, false);
    report.matchesPlayed++;
  }
  // 2. daily systems
  dailyTraining(world, rng);
  processScouting(world);
  processTransferPayments(world);
  aiTransferDay(world, rng);
  processStadiumProjects(world, date.endsWith("-01"));
  for (const l of Object.values(world.loans)) if (l.active && l.endDate <= date) {
    const p = world.players[l.playerId];
    endLoan(world, l.id, "expired");
    if (p && (world.clubs[l.parentClubId]?.isUser || world.clubs[l.loanClubId]?.isUser)) addNews(world, { category: "transfer", title: `${fullName(p)} returns from loan`, body: `${fullName(p)}'s loan spell has ended.`, clubIds: [l.parentClubId, l.loanClubId], playerIds: [p.id] });
  }
  expireStaleNegotiations(world);
  // 3. weekly (Mondays)
  if (weekday(date) === 1) weeklyProcessing(world, rng);
  // 4. monthly
  if (date.endsWith("-01")) monthlyProcessing(world, rng);
  // 5. youth intakes
  const md = monthDay(date);
  for (const club of Object.values(world.clubs).sort((a, b) => a.id.localeCompare(b.id))) if (club.youthIntakeDate === md) youthIntake(world, club.id, rng);
  // 6. season end
  const season = world.seasons[world.meta.currentSeasonId];
  if (date === season.endDate) {
    world.meta.rngState = rng.state;
    endSeason(world, rng);
    report.seasonEnded = true;
  }
  if (world.clubs[world.meta.userClubId].boardConfidence <= 8 && !world.manager.sacked) {
    world.manager.sacked = true;
    report.sacked = true;
    addNews(world, { category: "board", title: "You have been sacked", body: `The board of ${world.clubs[world.meta.userClubId].name} have lost confidence and terminated your contract.`, clubIds: [world.meta.userClubId], important: true });
  }
  world.meta.rngState = rng.state;
  world.meta.lastProcessedDate = date;
  world.meta.currentDate = addDays(date, 1);
  world.meta.daysSinceAutosave++;
  report.processed = true;
  return report;
}

function weeklyProcessing(world: World, rng: Rng): void {
  const date = world.meta.currentDate;
  const staffWages = new Map<ID, number>();
  for (const st of Object.values(world.staff)) if (st.clubId && st.contract) staffWages.set(st.clubId, (staffWages.get(st.clubId) ?? 0) + st.contract.wage);
  for (const club of Object.values(world.clubs).sort((a, b) => a.id.localeCompare(b.id))) {
    const w = { players: weeklyWageBill(world, club.id, false).players, staff: Math.round(staffWages.get(club.id) ?? 0) };
    if (w.players) postTransaction(world, club.id, -w.players, "player_wages", "Player wages", `wages:p:${club.id}:${date}`);
    if (w.staff) postTransaction(world, club.id, -w.staff, "staff_wages", "Staff wages", `wages:s:${club.id}:${date}`);
    postTransaction(world, club.id, -(club.facilities.training * 3500 * (0.7 + club.training.intensity * 0.1)), "training_costs", "Training ground running costs", `train:${club.id}:${date}`);
    postTransaction(world, club.id, -(club.facilities.youth * 2200), "youth_costs", "Academy running costs", `youth:${club.id}:${date}`);
  }
  weeklyStadiumMaintenance(world);
  weeklyDevelopment(world, rng);
  refreshValues(world);
  // happiness: playing time vs squad role
  const playedByClub = new Map<ID, number>();
  for (const f of Object.values(world.fixtures)) {
    if (f.status !== "played" || f.seasonId !== world.meta.currentSeasonId) continue;
    playedByClub.set(f.homeClubId, (playedByClub.get(f.homeClubId) ?? 0) + 1);
    playedByClub.set(f.awayClubId, (playedByClub.get(f.awayClubId) ?? 0) + 1);
  }
  for (const p of Object.values(world.players)) {
    if (!p.clubId || !p.contract || p.retired) continue;
    const possible = playedByClub.get(p.clubId) ?? 0;
    if (possible < 6) continue;
    let starts = 0;
    for (const s of Object.values(p.seasonStats)) starts += s.starts;
    const share = starts / possible;
    const exp = { key: 0.75, first_team: 0.55, rotation: 0.3, backup: 0.1, prospect: 0.05 }[p.contract.squadRole];
    const delta = share >= exp ? 1 : share >= exp * 0.6 ? -0.5 : -2;
    p.happiness = clamp(p.happiness + delta, 0, 100);
  }
  if (rng.chance(0.25)) generateSponsorOffers(world, world.meta.userClubId, rng);
}

function monthlyProcessing(world: World, rng: Rng): void {
  const date = world.meta.currentDate;
  const month = Number(date.slice(5, 7));
  paySponsorships(world);
  const inSeason = month >= 8 || month <= 5;
  for (const club of Object.values(world.clubs).sort((a, b) => a.id.localeCompare(b.id))) {
    const league = club.leagueId ? world.competitions[club.leagueId] : null;
    if (inSeason && league?.league) postTransaction(world, club.id, league.league.tvMoneyPerClub / 10, "tv_revenue", `${league.shortName} TV distribution`, `tv:${club.id}:${date.slice(0, 7)}`);
    postTransaction(world, club.id, Math.round(club.reputation * club.reputation * 260 * (0.6 + club.supporterMood / 125)), "merchandise", "Merchandise sales", `merch:${club.id}:${date.slice(0, 7)}`);
    for (const loan of club.finance.loans) {
      if (loan.remaining <= 0) continue;
      const interest = Math.round(loan.remaining * (loan.interestRate / 12));
      const principal = Math.min(loan.remaining, loan.monthlyPayment - interest);
      postTransaction(world, club.id, -interest, "interest", "Loan interest", `loanint:${loan.id}:${date.slice(0, 7)}`);
      postTransaction(world, club.id, -principal, "loan_repayment", "Loan repayment", `loanrep:${loan.id}:${date.slice(0, 7)}`);
      loan.remaining = Math.max(0, loan.remaining - principal);
      club.finance.debt = Math.max(0, club.finance.debt - principal);
    }
    if (club.finance.balance < 0) postTransaction(world, club.id, Math.round(club.finance.balance * 0.008), "interest", "Overdraft interest", `odint:${club.id}:${date.slice(0, 7)}`);
    monthlyBoardReview(world, club.id);
  }
  if (month >= 1 && month <= 5) aiContractRenewals(world);
  if (month === 1) {
    const season = world.seasons[world.meta.currentSeasonId];
    const expiring = Object.values(world.players).filter((p) => p.clubId === world.meta.userClubId && p.contract && p.contract.endDate <= season.endDate && !p.loanParentClubId);
    if (expiring.length) addNews(world, { category: "contract", title: `${expiring.length} contract(s) expire this summer`, body: `Players out of contract on ${season.endDate}: ${expiring.map((p) => fullName(p)).join(", ")}. Offer renewals from their profiles.`, clubIds: [world.meta.userClubId], playerIds: expiring.map((p) => p.id), important: true });
  }
  aiManagerChanges(world, rng);
  aiFinancialReview(world);
}

/** Close the season: tables, prizes, promotion/relegation, history, contracts, budgets, and set up the next season. */
export function endSeason(world: World, rng: Rng): void {
  const season = world.seasons[world.meta.currentSeasonId];
  const nextQualifiers: Record<ID, ID[]> = {};
  const qualifierRank = new Map<string, number>(); // league position each qualifier finished in
  const moves: { clubId: ID; to: ID }[] = [];
  const positions: Record<ID, { comp: ID; pos: number; points: number; gf: number; ga: number }> = {};
  for (const comp of Object.values(world.competitions)) {
    const cs = world.competitionSeasons[`cs_${comp.id}_${season.id}`];
    if (!cs) continue;
    if (comp.type === "league" && comp.league && cs.clubIds.length >= 2) {
      const table = leagueTable(world, cs);
      cs.finalPositions = table.map((r) => r.clubId);
      cs.championId = table[0]?.clubId ?? null;
      cs.status = "completed";
      const n = table.length;
      table.forEach((row, i) => {
        positions[row.clubId] = { comp: comp.id, pos: i + 1, points: row.points, gf: row.goalsFor, ga: row.goalsAgainst };
        const prize = Math.round(comp.league!.prizeMoneyTop * (1 - (i / n) * 0.9));
        postTransaction(world, row.clubId, prize, "prize_money", `${comp.shortName} finishing position (${ordinal(i + 1)})`, `leagueprize:${comp.id}:${season.id}:${row.clubId}`);
      });
      if (cs.championId) {
        world.trophies.push({ id: newId(world, "tro"), clubId: cs.championId, competitionId: comp.id, seasonId: season.id, seasonLabel: season.label });
        world.clubs[cs.championId].reputation = clamp(world.clubs[cs.championId].reputation + 2, 1, 100);
        addNews(world, { category: "competition", title: `${world.clubs[cs.championId].name} are ${comp.name} champions`, body: `${world.clubs[cs.championId].name} finished top with ${table[0].points} points.`, clubIds: [cs.championId], important: comp.tier === 1 || cs.clubIds.includes(world.meta.userClubId) });
      }
      for (const q of comp.league.qualification) {
        table.slice(q.fromPosition - 1, q.toPosition).forEach((r, i) => qualifierRank.set(`${q.competitionId}|${r.clubId}`, q.fromPosition + i));
        const ids = table.slice(q.fromPosition - 1, q.toPosition).map((r) => r.clubId);
        (nextQualifiers[q.competitionId] ||= []).push(...ids);
      }
      if (comp.league.relegation) for (const r of table.slice(n - comp.league.relegation.places)) moves.push({ clubId: r.clubId, to: comp.league.relegation.toCompetitionId });
      if (comp.league.promotion) for (const r of table.slice(0, comp.league.promotion.places)) moves.push({ clubId: r.clubId, to: comp.league.promotion.toCompetitionId });
    } else if (cs.status !== "completed") cs.status = "completed";
  }
  // A club plays in at most one continental competition per season (the most prestigious it earned),
  // then each competition is topped up from the same region by reputation if rules supplied too few.
  const continental = Object.values(world.competitions).filter((c) => c.type === "continental" && c.cup).sort((a, b) => b.reputation - a.reputation);
  const taken = new Set<ID>();
  let overflow: ID[] = []; // clubs that earned a place but didn't fit drop to the next competition down
  for (const comp of continental) {
    const need = comp.cup!.groupStage ? comp.cup!.groupStage.groups * comp.cup!.groupStage.teamsPerGroup : comp.cup!.bracketSize;
    // if more clubs earned places than the format holds: every champion first, then the strongest leagues' places
    const rankOf = (id: ID) => qualifierRank.get(`${comp.id}|${id}`) ?? 99;
    const leagueRep = (id: ID) => world.competitions[world.clubs[id]?.leagueId ?? ""]?.reputation ?? 0;
    const earned = Array.from(new Set(nextQualifiers[comp.id] ?? [])).filter((id) => !taken.has(id))
      .sort((a, b) => Number(rankOf(a) > 1) - Number(rankOf(b) > 1) || leagueRep(b) - leagueRep(a) || rankOf(a) - rankOf(b));
    const list = [...new Set([...overflow.filter((id) => !taken.has(id)), ...earned])];
    // region = nations of the leagues that send clubs to this competition
    const region = new Set(Object.values(world.competitions).filter((l) => l.league?.qualification.some((q) => q.competitionId === comp.id)).map((l) => l.nationId));
    if (list.length < need) {
      // top up with the next-best finishers, alternating between leagues (strongest leagues first)
      const extras = Object.values(world.clubs)
        .filter((c) => !list.includes(c.id) && !taken.has(c.id) && c.leagueId && world.competitions[c.leagueId].tier === 1 && (region.size === 0 || region.has(c.nationId)))
        .sort((a, b) => (positions[a.id]?.pos ?? 99) - (positions[b.id]?.pos ?? 99) || world.competitions[b.leagueId!].reputation - world.competitions[a.leagueId!].reputation || b.reputation - a.reputation);
      for (const c of extras) {
        if (list.length >= need) break;
        list.push(c.id);
      }
    }
    nextQualifiers[comp.id] = list.slice(0, need);
    overflow = list.slice(need);
    for (const id of nextQualifiers[comp.id]) taken.add(id);
  }
  // board, sponsors, history
  for (const club of Object.values(world.clubs)) {
    const pos = positions[club.id];
    const cupWins = world.trophies.filter((t) => t.clubId === club.id && t.seasonId === season.id && world.competitions[t.competitionId].type !== "league").length;
    payPerformanceBonuses(world, club.id, pos?.pos ?? null, cupWins);
    const revenue = Object.values(club.finance.revenueSeason).reduce((a, b) => a + b, 0);
    const expenses = Object.values(club.finance.expenseSeason).reduce((a, b) => a + b, 0);
    const cupResults = Object.values(world.competitionSeasons).filter((cs) => cs.seasonId === season.id && cs.ties.some((t) => t.homeClubId === club.id || t.awayClubId === club.id)).map((cs) => {
      const comp = world.competitions[cs.competitionId];
      const maxRound = Math.max(...cs.ties.filter((t) => t.homeClubId === club.id || t.awayClubId === club.id).map((t) => t.roundIndex));
      return { competitionId: comp.id, reached: cs.championId === club.id ? "Winners" : comp.cup?.rounds[maxRound]?.name ?? "Group stage" };
    });
    const entry: ClubSeasonEntry = { id: newId(world, "csh"), clubId: club.id, seasonId: season.id, seasonLabel: season.label, competitionId: pos?.comp ?? club.leagueId, position: pos?.pos ?? null, points: pos?.points ?? 0, goalsFor: pos?.gf ?? 0, goalsAgainst: pos?.ga ?? 0, cupResults, revenue, expenses, managerId: club.managerId };
    world.clubHistory.push(entry);
    if (club.isUser) {
      const score = resolveSeasonObjectives(world, club.id);
      addNews(world, { category: "board", title: `Season review: ${score >= 0 ? "the board are satisfied" : "the board are disappointed"}`, body: `Board confidence is now ${Math.round(club.boardConfidence)}%. ${pos ? `League finish: ${ordinal(pos.pos)}.` : ""}`, clubIds: [club.id], important: true });
      if (club.boardConfidence >= 70 && world.manager.contractEnd && world.manager.contractEnd <= addDays(season.endDate, 400)) {
        world.manager.contractEnd = `${Number(season.endDate.slice(0, 4)) + 3}-06-30`;
        world.manager.wage = niceMoney(world.manager.wage * 1.25);
        const st = world.staff[world.manager.staffId];
        if (st.contract) st.contract = { ...st.contract, wage: world.manager.wage, endDate: world.manager.contractEnd };
        addNews(world, { category: "board", title: "New contract for the manager", body: `The board have extended your contract until ${world.manager.contractEnd}.`, clubIds: [club.id], important: true });
      }
      world.manager.reputation = clamp(world.manager.reputation + Math.round(score / 6), 1, 100);
    } else {
      club.boardConfidence = clamp(club.boardConfidence + (pos ? (predictedRank(world, club.id) - pos.pos) * 3 : 0), 0, 100);
    }
    club.finance.revenueSeason = {};
    club.finance.expenseSeason = {};
  }
  // player history and stat reset
  rollAddOnCounters(world);
  for (const p of Object.values(world.players)) {
    let apps = 0, goals = 0, assists = 0, ratingSum = 0;
    for (const s of Object.values(p.seasonStats)) {
      apps += s.apps;
      goals += s.goals;
      assists += s.assists;
      ratingSum += s.ratingSum;
    }
    if (apps > 0 || p.clubId === world.meta.userClubId) {
      world.playerHistory.push({ id: newId(world, "ph"), playerId: p.id, seasonId: season.id, seasonLabel: season.label, clubId: p.clubId, apps, goals, assists, avgRating: apps ? Math.round((ratingSum / apps) * 100) / 100 : 0, overall: overall(p), potential: p.potential, value: p.value });
    }
    p.seasonStats = {};
    p.yellowAccumulation = {};
    p.suspensions = p.suspensions.filter((s) => s.competitionId === null || world.competitions[s.competitionId]?.type === "league");
  }
  // contracts, loans, retirements
  for (const l of Object.values(world.loans)) if (l.active && l.endDate <= season.endDate) endLoan(world, l.id, "expired");
  expireContracts(world);
  processRetirements(world, rng);
  // promotion & relegation
  for (const m of moves) {
    const club = world.clubs[m.clubId];
    const from = club.leagueId ? world.competitions[club.leagueId] : null;
    const to = world.competitions[m.to];
    const up = to.tier < (from?.tier ?? 99);
    club.leagueId = m.to;
    club.reputation = clamp(club.reputation + (up ? 3 : -3), 1, 100);
    for (const s of Object.values(world.competitions)) void s;
    addNews(world, { category: "competition", title: `${club.name} ${up ? "promoted to" : "relegated to"} the ${to.name}`, body: `${club.name} will play in the ${to.name} next season.`, clubIds: [club.id], important: club.isUser });
  }
  season.status = "completed";
  // new season
  const nextStart = addDays(season.endDate, 1);
  const prevDate = world.meta.currentDate;
  world.meta.currentDate = nextStart; // fixtures & dates for the new season are generated relative to it
  const next = createSeason(world, nextStart);
  world.meta.currentSeasonId = next.id;
  world.qualifiers = nextQualifiers;
  setupCompetitionSeasons(world, next, rng);
  world.qualifiers = {};
  // budgets for the new season
  for (const club of Object.values(world.clubs)) {
    const wages = weeklyWageBill(world, club.id).players;
    const healthy = club.finance.balance > 0;
    club.finance.transferBudget = Math.max(0, Math.round((healthy ? club.finance.balance * 0.4 : 0) / 100_000) * 100_000);
    club.finance.wageBudget = Math.max(Math.round(wages * (healthy ? 1.1 : 1.0) / 1000) * 1000, Math.round(club.reputation * club.reputation * 6 / 1000) * 1000);
    club.aiTransferActivity = { windowKey: "", signings: 0, sales: 0 };
    for (const t of club.tactics) t.familiarity = clamp(t.familiarity - 5, 30, 100);
    if (!club.isUser && club.tactics.length === 0) club.tactics = [aiTacticFor(world, club, null, rng)];
  }
  for (const p of Object.values(world.players)) {
    if (p.retired) continue;
    p.fitness = clamp(p.fitness + 20, 0, 100);
    p.fatigue = 0;
    p.sharpness = 40;
  }
  aiFillSquadsAndStaff(world, rng);
  for (const club of Object.values(world.clubs)) assignSquadRoles(world, club.id);
  refreshValues(world);
  generateBoardObjectives(world, world.meta.userClubId);
  const uc = world.clubs[world.meta.userClubId];
  addNews(world, { category: "board", title: `${next.label} season budgets`, body: `The board have set a transfer budget of ${uc.finance.transferBudget.toLocaleString()} and a wage budget of ${uc.finance.wageBudget.toLocaleString()} per week.`, clubIds: [uc.id], important: true });
  world.meta.currentDate = prevDate; // advanceDay moves the calendar on
}

function predictedRank(world: World, clubId: ID): number {
  const club = world.clubs[clubId];
  const others = Object.values(world.clubs).filter((c) => c.leagueId === club.leagueId).sort((a, b) => b.reputation - a.reputation);
  return others.findIndex((c) => c.id === clubId) + 1;
}

/** Advance until the day of the user's next match (or a limit). Stops when a user match is due. */
export function advanceUntil(world: World, stop: (w: World, r: DayReport) => boolean, maxDays = 60): DayReport[] {
  const out: DayReport[] = [];
  for (let i = 0; i < maxDays; i++) {
    const r = advanceDay(world, { simulateUserMatch: false });
    out.push(r);
    if (!r.processed || stop(world, r) || world.manager.sacked) break;
  }
  return out;
}
