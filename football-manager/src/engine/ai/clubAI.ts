import { blockedMoveConversation } from "../world/career";
import type { Club, ID, Player, Position, StaffRole, World } from "../core/types";
import { Rng, hashString } from "../core/rng";
import { expectedWage, overall } from "../core/ratings";
import { POSITION_GROUP } from "../core/ratings";
import { addDays, ageOn, diffDays } from "../core/dates";
import { clamp, niceMoney } from "../core/util";
import { isTransferWindowOpen } from "../competition/season";
import { weeklyWageBill, weeklyPlayerWages } from "../finance/ledger";
import {
  completeLoan, completeTransfer, contractDemand, defaultTransferOffer, evaluateBid, evaluateContract, MAX_SQUAD, MIN_SQUAD, openNegotiation, renewContract, squadCount,
} from "../transfers/market";
import { assignSquadRoles, fullName } from "../world/players";
import { addNews } from "../world/news";
import { aiTacticFor } from "../world/create";
import { newId } from "../core/ids";
import { clubPlayers, invalidateSquadIndex } from "../world/index";

const GROUP_TARGET: Record<"GK" | "DEF" | "MID" | "ATT", number> = { GK: 3, DEF: 8, MID: 8, ATT: 5 };
const GROUP_POSITIONS: Record<"GK" | "DEF" | "MID" | "ATT", Position[]> = { GK: ["GK"], DEF: ["CB", "LB", "RB", "LWB", "RWB"], MID: ["DM", "CM", "AM", "LM", "RM"], ATT: ["LW", "RW", "ST"] };

function windowKey(world: World): string {
  const s = world.seasons[world.meta.currentSeasonId];
  const w = s.transferWindows.find((x) => world.meta.currentDate >= x.start && world.meta.currentDate <= x.end);
  return w ? `${s.id}:${w.start}` : "";
}

/** Target overall a club wants in its starting XI, by reputation. */
function targetLevel(club: Club): number {
  return Math.round(40 + club.reputation * 0.38);
}

interface Need {
  group: "GK" | "DEF" | "MID" | "ATT";
  urgency: number;
  minOverall: number;
}

export function clubNeeds(world: World, club: Club): Need[] {
  const squad = clubPlayers(world, club.id);
  const needs: Need[] = [];
  for (const g of ["GK", "DEF", "MID", "ATT"] as const) {
    const inGroup = squad.filter((p) => POSITION_GROUP[p.position] === g).map((p) => overall(p)).sort((a, b) => b - a);
    const starters = g === "GK" ? 1 : g === "DEF" ? 4 : g === "MID" ? 3 : 3;
    const weakestStarter = inGroup[starters - 1] ?? 30;
    const depthGap = GROUP_TARGET[g] - inGroup.length;
    const qualityGap = targetLevel(club) - weakestStarter;
    const urgency = Math.max(0, depthGap) * 2 + Math.max(0, qualityGap) * 0.6;
    if (urgency > 1.5) needs.push({ group: g, urgency, minOverall: Math.max(weakestStarter + 2, targetLevel(club) - 6) });
  }
  return needs.sort((a, b) => b.urgency - a.urgency);
}

function ageFits(club: Club, age: number): boolean {
  if (club.strategy === "youth_development") return age <= 24;
  if (club.strategy === "title_contender") return age <= 31;
  if (club.strategy === "financially_constrained") return age <= 33;
  return age <= 30;
}

/** One AI club's transfer activity for the day. Returns number of moves made. */
interface PoolEntry { p: Player; ovr: number; age: number }

function aiClubTransfers(world: World, club: Club, rng: Rng, pool: Record<string, PoolEntry[]>): number {
  const key = windowKey(world);
  if (club.aiTransferActivity.windowKey !== key) club.aiTransferActivity = { windowKey: key, signings: 0, sales: 0 };
  if (club.aiTransferActivity.signings >= 3) return 0;
  const counts = squadCount(world, club.id);
  if (counts.total >= MAX_SQUAD - 2) return 0;
  const needs = clubNeeds(world, club);
  // rich, ambitious clubs also go for "statement" upgrades on a starting spot
  if (!needs.length && club.reputation >= 74 && club.finance.transferBudget >= 15_000_000 && rng.chance(0.35)) {
    const g = rng.pick(["DEF", "MID", "ATT", "ATT", "MID"] as const);
    const squad = clubPlayers(world, club.id).filter((p) => POSITION_GROUP[p.position] === g).map((p) => overall(p)).sort((a, b) => b - a);
    const starters = g === "DEF" ? 4 : 3;
    const weakest = squad[starters - 1] ?? 60;
    needs.push({ group: g, urgency: 1, minOverall: weakest + 3 });
  }
  if (!needs.length) return 0;
  const need = needs[0];
  const today = world.meta.currentDate;
  const budget = club.finance.transferBudget;
  const wageRoom = club.finance.wageBudget - weeklyPlayerWages(world, club.id);
  const positions = GROUP_POSITIONS[need.group];
  const candidates: { p: Player; score: number }[] = [];
  for (const { p, ovr, age } of pool[need.group] ?? []) {
    if (p.clubId === club.id || p.retired || p.loanParentClubId) continue;
    if (!positions.includes(p.position)) continue;
    if (ovr < need.minOverall) continue;
    if (!ageFits(club, age)) continue;
    const seller = p.clubId ? world.clubs[p.clubId] : null;
    if (seller && seller.reputation > club.reputation + 8) continue;
    if (seller?.isUser && p.squadStatus !== "listed") continue; // AI bids on user's players via incoming offers only
    if (p.value > budget * 0.9 && seller) continue;
    const wage = expectedWage(p, club.reputation, today);
    if (wage > Math.max(wageRoom, 0) + (p.contract?.wage ?? 0) * 0.2 && club.strategy !== "title_contender") continue;
    const score = (ovr - need.minOverall) * 3 + (p.potential - ovr) * (club.strategy === "youth_development" ? 1.5 : 0.4) - p.value / Math.max(1, budget) * 10 + rng.next() * 4;
    candidates.push({ p, score });
  }
  if (!candidates.length) return 0;
  candidates.sort((a, b) => b.score - a.score);
  const target = candidates[Math.min(candidates.length - 1, rng.int(0, 2))].p;
  const seller = target.clubId ? world.clubs[target.clubId] : null;
  // club-to-club
  const n = openNegotiation(world, target.id, club.id, seller ? "transfer" : "free_agent");
  if (seller) {
    if (!isTransferWindowOpen(world, today)) return 0;
    let offer = defaultTransferOffer(niceMoney(target.value * rng.range(0.9, 1.15)));
    let res = evaluateBid(world, target, club, offer, 2);
    if (res.decision === "countered" && res.counter && res.counter.fee <= budget) {
      offer = res.counter;
      res = evaluateBid(world, target, club, offer, 1);
    }
    if (res.decision !== "accepted" || offer.fee > budget) {
      n.status = "rejected";
      return 0;
    }
    if (seller.isUser) {
      // user-listed player: create an incoming bid the user must answer
      n.incoming = true;
      n.status = "open";
      n.rounds.push({ date: today, by: "ai", kind: "transfer", transfer: offer, response: "pending", message: `${club.shortName} bid ${offer.fee.toLocaleString()} for ${fullName(target)}.` });
      n.counterTransfer = offer;
      addNews(world, { category: "transfer", title: `Bid received for ${fullName(target)}`, body: `${club.name} have offered ${offer.fee.toLocaleString()} for ${fullName(target)}. Respond in the Transfers screen.`, clubIds: [seller.id], playerIds: [target.id], important: true });
      return 0;
    }
    n.agreedTransfer = offer;
    n.status = "contract_stage";
  }
  const demand = contractDemand(world, target, club, false);
  const c = { ...demand, signingBonus: niceMoney(demand.signingBonus * 0.8) };
  const res2 = evaluateContract(world, target, club, c, false, 1);
  if (res2.decision !== "accepted") {
    const better = { ...c, wage: res2.counter?.wage ?? niceMoney(c.wage * 1.1), squadRole: res2.counter?.squadRole ?? c.squadRole };
    const res3 = evaluateContract(world, target, club, better, false, 0);
    if (res3.decision !== "accepted") {
      n.status = "rejected";
      return 0;
    }
    n.agreedContract = better;
  } else n.agreedContract = c;
  const done = completeTransfer(world, n);
  if (done.ok) {
    club.aiTransferActivity.signings++;
    if (seller) seller.aiTransferActivity.sales++;
    return 1;
  }
  return 0;
}

/** AI clubs list surplus players and loan out prospects. */
function aiSquadTrimming(world: World, club: Club, rng: Rng): void {
  const squad = clubPlayers(world, club.id).filter((p) => !p.loanParentClubId);
  if (squad.length <= 26) return;
  const sorted = squad.slice().sort((a, b) => overall(a) - overall(b));
  for (const p of sorted.slice(0, squad.length - 26)) {
    const age = ageOn(p.dob, world.meta.currentDate);
    if (age <= 21 && p.potential - overall(p) >= 8) p.squadStatus = "loan_listed";
    else p.squadStatus = "listed";
  }
  // loan out a prospect to a lower-reputation club
  const prospect = squad.find((p) => p.squadStatus === "loan_listed");
  if (prospect && rng.chance(0.3) && isTransferWindowOpen(world, world.meta.currentDate)) {
    const takers = Object.values(world.clubs).filter((c) => !c.isUser && c.id !== club.id && c.reputation < club.reputation - 5 && c.reputation > club.reputation - 35 && squadCount(world, c.id).total < 28);
    if (takers.length) {
      const borrower = rng.pick(takers);
      const n = openNegotiation(world, prospect.id, borrower.id, "transfer");
      n.agreedTransfer = { ...defaultTransferOffer(0), type: "loan", loanWageSharePct: 100, loanEndDate: world.seasons[world.meta.currentSeasonId].endDate };
      n.status = "contract_stage";
      completeLoan(world, n);
    }
  }
}

/** Daily AI transfer processing across the world (deterministic order). */
export function aiTransferDay(world: World, rng: Rng): void {
  const today = world.meta.currentDate;
  const open = isTransferWindowOpen(world, today);
  // ratings and ages are computed once per day, not once per club
  // candidate pools (by position group) are built at most once per day, and only when needed
  let full: Record<string, PoolEntry[]> | null = null;
  let free: Record<string, PoolEntry[]> | null = null;
  const buildPool = (onlyFree: boolean): Record<string, PoolEntry[]> => {
    const out: Record<string, PoolEntry[]> = { GK: [], DEF: [], MID: [], ATT: [] };
    for (const p of Object.values(world.players)) {
      if (p.retired || (onlyFree && p.clubId)) continue;
      out[POSITION_GROUP[p.position]].push({ p, ovr: overall(p), age: ageOn(p.dob, today) });
    }
    return out;
  };
  const clubs = Object.values(world.clubs).filter((c) => !c.isUser).sort((a, b) => a.id.localeCompare(b.id));
  const dayHash = hashString(today);
  for (const club of clubs) {
    // each club acts roughly once every 6 days to spread load and avoid frenzies
    if ((hashString(club.id) + dayHash) % 6 !== 0) continue;
    if (open) {
      aiSquadTrimming(world, club, rng);
      aiClubTransfers(world, club, rng, (full ??= buildPool(false)));
    } else if (squadCount(world, club.id).total < MIN_SQUAD + 2) {
      // outside the window only free agents can be signed
      aiClubTransfers(world, club, rng, (free ??= buildPool(true)));
    }
  }
  if (open) incomingBidsForUser(world, rng);
}

/** AI clubs bid for the user's players (listed players attract more interest). */
function incomingBidsForUser(world: World, rng: Rng): void {
  const user = world.clubs[world.meta.userClubId];
  const squad = clubPlayers(world, user.id).filter((p) => !p.loanParentClubId);
  for (const p of squad) {
    const pending = Object.values(world.negotiations).some((n) => n.playerId === p.id && n.incoming && n.status === "open");
    if (pending) continue;
    const chance = p.squadStatus === "listed" ? 0.08 : p.squadStatus === "loan_listed" ? 0.06 : p.squadStatus === "untouchable" ? 0 : 0.0025 * (overall(p) > 75 ? 2 : 1);
    if (!rng.chance(chance)) continue;
    const ovr = overall(p);
    const suitors = Object.values(world.clubs).filter((c) => !c.isUser && c.reputation >= user.reputation - 25 && c.finance.transferBudget >= p.value * 0.8 && squadCount(world, c.id).total < MAX_SQUAD - 1 && targetLevel(c) - 4 <= ovr);
    if (!suitors.length) continue;
    const buyer = rng.pick(suitors);
    const n = openNegotiation(world, p.id, buyer.id, "transfer", true);
    if (n.status !== "open" || n.rounds.length) continue;
    const loan = p.squadStatus === "loan_listed";
    const offer = loan
      ? { ...defaultTransferOffer(0), type: "loan" as const, loanFee: niceMoney(p.value * 0.05), loanWageSharePct: 100, loanEndDate: world.seasons[world.meta.currentSeasonId].endDate }
      : { ...defaultTransferOffer(niceMoney(p.value * rng.range(0.8, 1.2))), upfrontPct: rng.chance(0.3) ? 70 : 100, addOnAppearances: rng.chance(0.3) ? niceMoney(p.value * 0.1) : 0 };
    n.counterTransfer = offer;
    n.rounds.push({ date: world.meta.currentDate, by: "ai", kind: "transfer", transfer: offer, response: "pending", message: `${buyer.shortName} ${loan ? "want to take" : "bid for"} ${fullName(p)}${loan ? " on loan" : ` (${offer.fee.toLocaleString()})`}.` });
    addNews(world, { category: "transfer", title: `${loan ? "Loan offer" : "Bid"} for ${fullName(p)}`, body: `${buyer.name} ${loan ? "would like to take" : "have bid for"} ${fullName(p)}. Respond in Transfers → Offers.`, clubIds: [user.id], playerIds: [p.id], important: true });
  }
}

/** User accepts an incoming AI bid. */
export function acceptIncomingBid(world: World, negotiationId: ID): { ok: boolean; message: string } {
  const n = world.negotiations[negotiationId];
  if (!n || !n.incoming || n.status !== "open" || !n.counterTransfer) return { ok: false, message: "This offer is no longer available." };
  const p = world.players[n.playerId];
  const buyer = world.clubs[n.buyingClubId];
  if (!isTransferWindowOpen(world, world.meta.currentDate)) return { ok: false, message: "The transfer window is closed." };
  const counts = squadCount(world, p.clubId!);
  if (counts.total - 1 < MIN_SQUAD) return { ok: false, message: `You must keep at least ${MIN_SQUAD} players.` };
  n.agreedTransfer = n.counterTransfer;
  n.status = "contract_stage";
  if (n.agreedTransfer.type !== "permanent") return completeLoan(world, n);
  const demand = contractDemand(world, p, buyer, false);
  const res = evaluateContract(world, p, buyer, demand, false, 1);
  n.agreedContract = res.decision === "accepted" ? demand : { ...demand, wage: res.counter?.wage ?? demand.wage };
  const done = completeTransfer(world, n);
  if (!done.ok) n.status = "rejected";
  return done;
}

/** User counters an incoming bid; the AI buyer decides. */
export function counterIncomingBid(world: World, negotiationId: ID, fee: number): { ok: boolean; message: string } {
  const n = world.negotiations[negotiationId];
  if (!n || !n.incoming || n.status !== "open" || !n.counterTransfer) return { ok: false, message: "This offer is no longer available." };
  const p = world.players[n.playerId];
  const buyer = world.clubs[n.buyingClubId];
  const max = Math.min(buyer.finance.transferBudget, p.value * (1.25 + buyer.reputation / 400));
  n.rounds.push({ date: world.meta.currentDate, by: "user", kind: "transfer", transfer: { ...n.counterTransfer, fee }, response: "pending", message: `You asked for ${fee.toLocaleString()}.` });
  if (fee <= max) {
    n.counterTransfer = { ...n.counterTransfer, fee: niceMoney(fee) };
    n.rounds[n.rounds.length - 1].response = "accepted";
    return acceptIncomingBid(world, negotiationId);
  }
  n.patience--;
  if (n.patience <= 0 || fee > max * 1.4) {
    n.status = "withdrawn";
    n.rounds[n.rounds.length - 1].response = "rejected";
    return { ok: false, message: `${buyer.shortName} have walked away from the deal.` };
  }
  const improved = niceMoney((n.counterTransfer.fee + max) / 2);
  n.counterTransfer = { ...n.counterTransfer, fee: improved };
  n.rounds[n.rounds.length - 1].response = "countered";
  n.rounds.push({ date: world.meta.currentDate, by: "ai", kind: "transfer", transfer: n.counterTransfer, response: "pending", message: `${buyer.shortName} improve their offer to ${improved.toLocaleString()}.` });
  return { ok: true, message: `${buyer.shortName} improve their offer to ${improved.toLocaleString()}.` };
}

export function rejectIncomingBid(world: World, negotiationId: ID): void {
  const n = world.negotiations[negotiationId];
  if (!n) return;
  n.status = "rejected";
  const p = world.players[n.playerId];
  if (p && overall(p) >= 70 && p.personality.ambition >= 15 && world.clubs[n.buyingClubId].reputation > (world.clubs[p.clubId ?? ""]?.reputation ?? 0) + 10) {
    p.happiness = clamp(p.happiness - 15, 0, 100);
    blockedMoveConversation(world, p.id, n.buyingClubId);
    addNews(world, { category: "transfer", title: `${fullName(p)} unhappy after blocked move`, body: `${fullName(p)} wanted to join ${world.clubs[n.buyingClubId].name} and is disappointed the move was blocked.`, clubIds: [world.meta.userClubId], playerIds: [p.id] });
  }
}

/** Monthly (Jan–May) AI renewal decisions for players whose contracts expire this season. */
export function aiContractRenewals(world: World): void {
  const season = world.seasons[world.meta.currentSeasonId];
  for (const club of Object.values(world.clubs)) {
    if (club.isUser) continue;
    const squad = clubPlayers(world, club.id).filter((p) => !p.loanParentClubId && p.contract);
    const ranked = squad.slice().sort((a, b) => overall(b) - overall(a));
    for (const p of squad) {
      if (!p.contract || p.contract.endDate > season.endDate) continue;
      const rank = ranked.indexOf(p);
      const age = ageOn(p.dob, world.meta.currentDate);
      // keep a realistic squad: first-teamers, depth and young talent
      const wanted = (rank < 24 && age < 33) || (rank < 14 && age < 35) || (age <= 23 && p.potential - overall(p) > 5);
      if (!wanted) continue;
      const demand = contractDemand(world, p, club, true);
      const res = evaluateContract(world, p, club, demand, true, 1);
      if (res.decision === "accepted") renewContract(world, p, demand);
    }
  }
}

/** Contracts that expire at season end: players leave as free agents. */
export function expireContracts(world: World): void {
  const season = world.seasons[world.meta.currentSeasonId];
  for (const p of Object.values(world.players)) {
    if (!p.contract || p.retired || p.loanParentClubId) continue;
    if (p.contract.endDate > season.endDate) continue;
    const club = p.clubId ? world.clubs[p.clubId] : null;
    if (club?.isUser) addNews(world, { category: "contract", title: `${fullName(p)} leaves on a free transfer`, body: `${fullName(p)}'s contract has expired and he has left the club.`, clubIds: [club.id], playerIds: [p.id] });
    world.transfers.push({ id: newId(world, "tr"), playerId: p.id, fromClubId: p.clubId, toClubId: null, date: world.meta.currentDate, fee: 0, type: "release", seasonId: world.meta.currentSeasonId, sellOnPct: 0, sellOnBeneficiaryClubId: null, addOns: [] });
    p.clubId = null;
    invalidateSquadIndex(world);
    p.contract = null;
    p.squadStatus = "none";
    for (const c of Object.values(world.clubs)) if (c.selection) {
      for (const k of Object.keys(c.selection.starters)) if (c.selection.starters[k] === p.id) delete c.selection.starters[k];
      c.selection.bench = c.selection.bench.filter((x) => x !== p.id);
    }
  }
}

/** Pre-season: AI clubs with thin squads sign free agents; AI vacancies in staff are filled. */
export function aiFillSquadsAndStaff(world: World, rng: Rng): void {
  const freeAgents = Object.values(world.players).filter((p) => !p.clubId && !p.retired);
  for (const club of Object.values(world.clubs)) {
    if (club.isUser) continue;
    let guard = 0;
    while (squadCount(world, club.id).total < 22 && guard++ < 10) {
      const needs = clubNeeds(world, club);
      const g = needs[0]?.group ?? "MID";
      const pool = freeAgents.filter((p) => !p.clubId && GROUP_POSITIONS[g].includes(p.position)).sort((a, b) => overall(b) - overall(a));
      const pick = pool.find((p) => overall(p) <= targetLevel(club) + 5) ?? pool[pool.length - 1];
      if (!pick) break;
      const n = openNegotiation(world, pick.id, club.id, "free_agent");
      n.agreedContract = { ...contractDemand(world, pick, club, false), signingBonus: 0 };
      if (!completeTransfer(world, n).ok) break;
    }
    // staff vacancies
    for (const role of ["manager", "assistant", "goalkeeping_coach", "fitness_coach", "physio"] as StaffRole[]) {
      if (Object.values(world.staff).some((s) => s.clubId === club.id && s.role === role)) continue;
      const pool = Object.values(world.staff).filter((s) => !s.clubId && s.role === role && !s.isUser && s.reputation <= club.reputation + 15).sort((a, b) => b.reputation - a.reputation);
      const hire = pool[0];
      if (!hire) continue;
      hire.clubId = club.id;
      hire.contract = { wage: niceMoney(300 + hire.attributes.coaching ** 2 * (role === "manager" ? 100 : 25)), startDate: world.meta.currentDate, endDate: `${Number(world.meta.currentDate.slice(0, 4)) + 2}-06-30` };
      if (role === "manager") {
        club.managerId = hire.id;
        club.tactics = [aiTacticFor(world, club, hire.preferredFormation, rng)];
        club.selection = null;
      }
    }
  }
}

/** AI manager dismissals when board confidence collapses. */
export function aiManagerChanges(world: World, rng: Rng): void {
  for (const club of Object.values(world.clubs)) {
    if (club.isUser || !club.managerId) continue;
    if (club.boardConfidence >= 18) continue;
    const old = world.staff[club.managerId];
    const pool = Object.values(world.staff).filter((s) => !s.clubId && s.role === "manager" && !s.isUser && s.reputation <= club.reputation + 12).sort((a, b) => b.reputation - a.reputation);
    const replacement = pool[rng.int(0, Math.min(2, pool.length - 1))];
    if (!replacement) continue;
    if (old) {
      old.clubId = null;
      old.contract = null;
    }
    replacement.clubId = club.id;
    replacement.contract = { wage: niceMoney(300 + replacement.attributes.coaching ** 2 * 100), startDate: world.meta.currentDate, endDate: `${Number(world.meta.currentDate.slice(0, 4)) + 2}-06-30` };
    club.managerId = replacement.id;
    club.boardConfidence = 60;
    club.tactics = [aiTacticFor(world, club, replacement.preferredFormation, rng)];
    club.selection = null;
    addNews(world, { category: "staff", title: `${club.shortName} sack ${old ? `${old.firstName} ${old.lastName}` : "their manager"}`, body: `${club.name} have appointed ${replacement.firstName} ${replacement.lastName} as their new manager.`, clubIds: [club.id], important: club.reputation >= 70 });
  }
}

/** AI clubs that are deep in the red cut budgets; healthy clubs release a little more. */
export function aiFinancialReview(world: World): void {
  for (const club of Object.values(world.clubs)) {
    if (club.isUser) continue;
    if (club.finance.balance < -club.finance.overdraftLimit * 0.5) {
      club.finance.transferBudget = 0;
      club.strategy = club.strategy === "title_contender" ? club.strategy : "financially_constrained";
    } else if (club.finance.balance > 0 && club.finance.transferBudget < club.finance.balance * 0.2) {
      club.finance.transferBudget = Math.round(club.finance.balance * 0.25);
    }
  }
}

export function expireStaleNegotiations(world: World): void {
  for (const n of Object.values(world.negotiations)) {
    if (["completed", "rejected", "withdrawn", "expired"].includes(n.status)) {
      if (diffDays(world.meta.currentDate, n.updatedDate) > 60) delete world.negotiations[n.id];
      continue;
    }
    if (diffDays(world.meta.currentDate, n.updatedDate) > 21) {
      n.status = "expired";
      n.updatedDate = world.meta.currentDate;
    }
  }
}

