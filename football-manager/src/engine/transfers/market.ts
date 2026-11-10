import type { Club, ContractOffer, ID, Negotiation, NegotiationRound, Player, TransferOffer, TransferRecord, World } from "../core/types";
import { newId } from "../core/ids";
import { addYears, diffDays } from "../core/dates";
import { expectedWage, overall } from "../core/ratings";
import { clamp, niceMoney, niceMoneyUp } from "../core/util";
import { isTransferWindowOpen } from "../competition/season";
import { checkTransferSpend, postTransaction, weeklyWageBill, weeklyPlayerWages } from "../finance/ledger";
import { assignSquadRoles, fullName, playerAge } from "../world/players";
import { addNews } from "../world/news";
import { clubPlayers, invalidateSquadIndex } from "../world/index";

export const MIN_SQUAD = 16;
export const MAX_SQUAD = 34;

export function defaultTransferOffer(fee = 0): TransferOffer {
  return { fee, upfrontPct: 100, addOnAppearances: 0, addOnGoals: 0, sellOnPct: 0, exchangePlayerIds: [], type: "permanent", loanFee: 0, loanWageSharePct: 100, optionToBuyFee: 0, loanEndDate: null };
}

export function squadCount(world: World, clubId: ID): { total: number; gk: number } {
  let total = 0, gk = 0;
  for (const p of clubPlayers(world, clubId)) {
    total++;
    if (p.position === "GK") gk++;
  }
  return { total, gk };
}

/** Importance of a player to his club (multiplier on market value for the asking price). */
export function importanceToClub(world: World, p: Player): number {
  if (!p.clubId) return 1;
  const squad = clubPlayers(world, p.clubId);
  const rank = squad.map((x) => overall(x)).sort((a, b) => b - a).indexOf(overall(p));
  let f = rank < 4 ? 1.6 : rank < 11 ? 1.3 : rank < 17 ? 1.05 : 0.85;
  const samePos = squad.filter((x) => x.position === p.position && x.id !== p.id);
  if (samePos.length === 0) f *= 1.25;
  if (p.squadStatus === "listed") f *= 0.8;
  if (p.squadStatus === "loan_listed") f *= 0.95;
  if (p.contract) {
    const left = diffDays(p.contract.endDate, world.meta.currentDate) / 365;
    if (left < 1) f *= 0.7;
    else if (left < 1.5) f *= 0.85;
  }
  const club = world.clubs[p.clubId];
  if (club.finance.balance < 0) f *= 0.85;
  if (playerAge(world, p) >= 31) f *= 0.9;
  return f;
}

/** Monetary worth of an offer to the seller (deferred payments discounted, conditional add-ons weighted by likelihood). */
export function offerWorth(world: World, o: TransferOffer, p: Player): number {
  if (o.type !== "permanent") return o.loanFee + (o.type === "loan_with_option" ? o.optionToBuyFee * 0.5 : 0);
  const upfront = o.fee * (o.upfrontPct / 100);
  const deferred = (o.fee - upfront) * 0.92;
  const addOns = o.addOnAppearances * 0.55 + o.addOnGoals * (["ST", "LW", "RW", "AM"].includes(p.position) ? 0.4 : 0.1);
  const sellOn = (o.sellOnPct / 100) * p.value * 0.35;
  const exchange = o.exchangePlayerIds.reduce((s, id) => s + (world.players[id]?.value ?? 0) * 0.7, 0);
  return upfront + deferred + addOns + sellOn + exchange;
}

export interface EvalResult {
  decision: "accepted" | "rejected" | "countered";
  counter?: TransferOffer;
  message: string;
}

/** AI selling club's response to a bid. */
export function evaluateBid(world: World, p: Player, buyer: Club, o: TransferOffer, patience: number): EvalResult {
  const seller = p.clubId ? world.clubs[p.clubId] : null;
  if (!seller) return { decision: "accepted", message: "Free agent – no fee required." };
  if (p.loanParentClubId) return { decision: "rejected", message: `${fullName(p)} is on loan and cannot be sold by ${seller.shortName}.` };
  const counts = squadCount(world, seller.id);
  if (o.type === "permanent" && (counts.total - 1 + o.exchangePlayerIds.length < MIN_SQUAD || (p.position === "GK" && counts.gk <= 2))) {
    return { decision: "rejected", message: `${seller.shortName} cannot sell: their squad would be too small.` };
  }
  if (o.type !== "permanent") {
    const role = p.contract?.squadRole ?? "rotation";
    if (role === "key" || role === "first_team") return { decision: "rejected", message: `${seller.shortName} will not loan out a first-team player.` };
    if (o.loanWageSharePct < 50) return { decision: "countered", counter: { ...o, loanWageSharePct: 75 }, message: `${seller.shortName} want you to cover at least 75% of the wages.` };
    if (o.type === "loan_with_option" && o.optionToBuyFee < p.value * 1.1) return { decision: "countered", counter: { ...o, optionToBuyFee: niceMoney(p.value * 1.25) }, message: `${seller.shortName} want the option fee set at ${niceMoney(p.value * 1.25).toLocaleString()}.` };
    return { decision: "accepted", message: `${seller.shortName} accept the loan terms.` };
  }
  if (p.contract?.releaseClause && o.fee >= p.contract.releaseClause && o.upfrontPct >= 100) {
    return { decision: "accepted", message: `The release clause has been met; ${seller.shortName} must accept.` };
  }
  if (p.squadStatus === "untouchable") {
    const min = p.value * 2.5;
    if (offerWorth(world, o, p) >= min) return { decision: "accepted", message: `${seller.shortName} reluctantly accept an offer they could not refuse.` };
    return { decision: "rejected", message: `${seller.shortName} consider ${fullName(p)} untouchable.` };
  }
  let minimum = p.value * importanceToClub(world, p);
  if (buyer.leagueId && buyer.leagueId === seller.leagueId) minimum *= 1.1; // selling to a direct rival
  minimum = Math.max(minimum, 10_000);
  const worth = offerWorth(world, o, p);
  if (worth >= minimum) return { decision: "accepted", message: `${seller.shortName} accept your offer.` };
  if (worth >= minimum * 0.7 && patience > 0) {
    const ask = niceMoneyUp(o.fee + (minimum - worth) / Math.max(0.5, o.upfrontPct / 100 * 0.08 + 0.92));
    return { decision: "countered", counter: { ...o, fee: ask }, message: `${seller.shortName} would accept a fee of ${ask.toLocaleString()}.` };
  }
  return { decision: "rejected", message: worth < minimum * 0.5 ? `${seller.shortName} found the offer insulting.` : `${seller.shortName} reject the offer.` };
}

/** What the player wants from a contract with a given club. */
export function contractDemand(world: World, p: Player, club: Club, renewal: boolean): ContractOffer {
  const age = playerAge(world, p);
  let wage = expectedWage(p, club.reputation, world.meta.currentDate);
  if (p.contract && !renewal) wage = Math.max(wage, p.contract.wage * 1.1);
  if (p.contract && renewal) wage = Math.max(wage, p.contract.wage * (overall(p) >= 70 ? 1.08 : 1.0));
  wage *= 0.9 + p.personality.ambition / 100;
  const squad = clubPlayers(world, club.id).filter((x) => x.id !== p.id);
  const better = squad.filter((x) => overall(x) > overall(p)).length;
  const role = better < 4 ? "key" : better < 11 ? "first_team" : better < 17 ? "rotation" : age <= 20 ? "prospect" : "backup";
  return {
    wage: niceMoney(wage),
    years: age >= 32 ? 1 : age >= 29 ? 2 : age <= 21 ? 4 : 3,
    signingBonus: niceMoney(wage * (renewal ? 2 : 6)),
    appearanceBonus: 0,
    goalBonus: 0,
    releaseClause: null,
    squadRole: role,
  };
}

const ROLE_ORDER = ["backup", "prospect", "rotation", "first_team", "key"] as const;

/** Player's response to a contract offer. */
export function evaluateContract(world: World, p: Player, club: Club, o: ContractOffer, renewal: boolean, patience: number): { decision: "accepted" | "rejected" | "countered"; counter?: ContractOffer; message: string } {
  const demand = contractDemand(world, p, club, renewal);
  const age = playerAge(world, p);
  // reputation gap: established players refuse a big step down
  const currentRep = p.clubId ? world.clubs[p.clubId]?.reputation ?? 30 : 20;
  if (!renewal && currentRep - club.reputation > 25 && p.clubId) return { decision: "rejected", message: `${fullName(p)} is not interested in joining a club of ${club.shortName}'s stature.` };
  if (o.years < 1 || o.years > 5) return { decision: "rejected", message: "Contracts must run between 1 and 5 years." };
  if (o.wage < 0 || o.signingBonus < 0) return { decision: "rejected", message: "Invalid contract terms." };
  let required = demand.wage * 52 + demand.signingBonus / demand.years;
  const roleGap = ROLE_ORDER.indexOf(demand.squadRole) - ROLE_ORDER.indexOf(o.squadRole);
  if (roleGap > 0) required *= 1 + roleGap * 0.15; // wants more playing time than promised
  if (Math.abs(o.years - demand.years) >= 2) required *= 1.08;
  if (o.releaseClause !== null && o.releaseClause <= p.value * 1.5) required *= 0.95;
  if (age >= 31 && o.years < demand.years) required *= 1.1;
  const expectedGoals = ["ST", "LW", "RW"].includes(p.position) ? 10 : ["AM", "LM", "RM"].includes(p.position) ? 5 : 1;
  const offered = o.wage * 52 + o.signingBonus / o.years + o.appearanceBonus * 25 + o.goalBonus * expectedGoals;
  if (offered >= required) return { decision: "accepted", message: `${fullName(p)} accepts the contract.` };
  if (offered >= required * 0.78 && patience > 0) {
    const counter: ContractOffer = { ...o, wage: niceMoneyUp(Math.max(o.wage, (required - o.signingBonus / o.years - o.appearanceBonus * 25 - o.goalBonus * expectedGoals) / 52)), squadRole: roleGap > 1 ? demand.squadRole : o.squadRole };
    return { decision: "countered", counter, message: `${fullName(p)}'s agent asks for ${counter.wage.toLocaleString()} per week${counter.squadRole !== o.squadRole ? ` and a ${counter.squadRole.replace("_", " ")} role` : ""}.` };
  }
  return { decision: "rejected", message: `${fullName(p)} rejects the contract offer.` };
}

function round(world: World, by: "user" | "ai", kind: "transfer" | "contract", payload: { transfer?: TransferOffer; contract?: ContractOffer }, response: NegotiationRound["response"], message: string): NegotiationRound {
  return { date: world.meta.currentDate, by, kind, ...payload, response, message };
}

export function openNegotiation(world: World, playerId: ID, buyingClubId: ID, kind: Negotiation["kind"], incoming = false): Negotiation {
  const p = world.players[playerId];
  const existing = Object.values(world.negotiations).find((n) => n.playerId === playerId && n.buyingClubId === buyingClubId && ["open", "club_agreed", "contract_stage"].includes(n.status));
  if (existing) return existing;
  const n: Negotiation = {
    id: newId(world, "neg"), playerId, buyingClubId, sellingClubId: kind === "renewal" ? null : p.clubId, kind, staffId: null, status: kind === "free_agent" || kind === "renewal" ? "contract_stage" : "open",
    rounds: [], agreedTransfer: null, agreedContract: null, counterTransfer: null, counterContract: null, createdDate: world.meta.currentDate, updatedDate: world.meta.currentDate, incoming, patience: 3,
  };
  world.negotiations[n.id] = n;
  return n;
}

/** User submits a transfer bid (step 1: club-to-club). */
export function submitBid(world: World, negotiationId: ID, offer: TransferOffer): EvalResult & { negotiation: Negotiation } {
  const n = world.negotiations[negotiationId];
  const p = world.players[n.playerId];
  const buyer = world.clubs[n.buyingClubId];
  if (n.status !== "open") return { decision: "rejected", message: "These talks are not open.", negotiation: n };
  if (p.clubId === buyer.id) return { decision: "rejected", message: "The player already plays for your club.", negotiation: n };
  const err = validateOffer(world, buyer, p, offer);
  if (err) return { decision: "rejected", message: err, negotiation: n };
  const res = evaluateBid(world, p, buyer, offer, n.patience);
  n.rounds.push(round(world, "user", "transfer", { transfer: offer }, res.decision, res.message));
  n.updatedDate = world.meta.currentDate;
  if (res.decision === "accepted") {
    n.agreedTransfer = offer;
    n.status = "contract_stage";
  } else if (res.decision === "countered") {
    n.counterTransfer = res.counter ?? null;
    n.patience--;
  } else {
    n.patience--;
    if (n.patience <= 0 || res.message.includes("cannot") || res.message.includes("untouchable") || res.message.includes("will not")) n.status = "rejected";
  }
  return { ...res, negotiation: n };
}

export function validateOffer(world: World, buyer: Club, p: Player, o: TransferOffer): string | null {
  if (o.fee < 0 || o.loanFee < 0 || o.addOnAppearances < 0 || o.addOnGoals < 0 || o.optionToBuyFee < 0) return "Amounts cannot be negative.";
  if (o.upfrontPct < 0 || o.upfrontPct > 100) return "Upfront percentage must be between 0 and 100.";
  if (o.sellOnPct < 0 || o.sellOnPct > 50) return "Sell-on clause must be between 0% and 50%.";
  if (o.loanWageSharePct < 0 || o.loanWageSharePct > 100) return "Wage share must be between 0% and 100%.";
  for (const id of o.exchangePlayerIds) {
    const x = world.players[id];
    if (!x || x.clubId !== buyer.id) return "Exchange players must belong to your club.";
    if (x.loanParentClubId) return "Loaned-in players cannot be offered in exchange.";
  }
  if (new Set(o.exchangePlayerIds).size !== o.exchangePlayerIds.length) return "Duplicate exchange player.";
  if (o.type === "permanent") {
    const spendErr = checkTransferSpend(buyer, o.fee * (o.upfrontPct / 100), o.fee);
    if (spendErr) return spendErr;
  } else {
    if (!o.loanEndDate || o.loanEndDate <= world.meta.currentDate) return "A loan needs an end date in the future.";
    if (o.loanFee > buyer.finance.transferBudget) return "Loan fee exceeds the transfer budget.";
  }
  if (o.type !== "permanent" && p.loanParentClubId) return "The player is already out on loan.";
  return null;
}

export function acceptCounterBid(world: World, negotiationId: ID): EvalResult & { negotiation: Negotiation } {
  const n = world.negotiations[negotiationId];
  if (!n.counterTransfer) return { decision: "rejected", message: "There is no counter-offer to accept.", negotiation: n };
  const offer = n.counterTransfer;
  n.counterTransfer = null;
  n.patience = Math.max(n.patience, 1);
  return submitBid(world, negotiationId, offer);
}

/** Step 2: personal terms with the player. Completes the move on acceptance. */
export function submitContractOffer(world: World, negotiationId: ID, offer: ContractOffer): { decision: "accepted" | "rejected" | "countered"; message: string; negotiation: Negotiation; completed?: boolean } {
  const n = world.negotiations[negotiationId];
  const p = world.players[n.playerId];
  const club = world.clubs[n.buyingClubId];
  if (n.status !== "contract_stage") return { decision: "rejected", message: "Agree a fee with the club first.", negotiation: n };
  const isLoan = n.agreedTransfer && n.agreedTransfer.type !== "permanent";
  if (isLoan) {
    const done = completeLoan(world, n);
    return { decision: done.ok ? "accepted" : "rejected", message: done.message, negotiation: n, completed: done.ok };
  }
  // wage budget check (renewals measure the increase only)
  const bill = weeklyPlayerWages(world, club.id);
  const delta = offer.wage - (n.kind === "renewal" && p.contract ? p.contract.wage : 0);
  if (club.isUser && bill + delta > club.finance.wageBudget * 1.05) return { decision: "rejected", message: `This wage would take the bill to ${(bill + delta).toLocaleString()}/wk, above the board's limit of ${club.finance.wageBudget.toLocaleString()}/wk.`, negotiation: n };
  const res = evaluateContract(world, p, club, offer, n.kind === "renewal", n.patience);
  n.rounds.push(round(world, "user", "contract", { contract: offer }, res.decision, res.message));
  n.updatedDate = world.meta.currentDate;
  if (res.decision === "accepted") {
    n.agreedContract = offer;
    if (n.kind === "renewal") {
      renewContract(world, p, offer);
      n.status = "completed";
      return { decision: "accepted", message: `${fullName(p)} signs a new contract until ${p.contract!.endDate}.`, negotiation: n, completed: true };
    }
    const done = completeTransfer(world, n);
    return { decision: done.ok ? "accepted" : "rejected", message: done.message, negotiation: n, completed: done.ok };
  }
  if (res.decision === "countered") {
    n.counterContract = res.counter ?? null;
    n.patience--;
  } else {
    n.patience--;
    if (n.patience <= 0 || res.message.includes("not interested")) n.status = "rejected";
  }
  return { ...res, negotiation: n };
}

export function renewContract(world: World, p: Player, o: ContractOffer): void {
  const start = world.meta.currentDate;
  const endYear = Number(start.slice(0, 4)) + o.years + (Number(start.slice(5, 7)) >= 7 ? 1 : 0);
  p.contract = { wage: o.wage, startDate: start, endDate: `${endYear}-06-30`, releaseClause: o.releaseClause, squadRole: o.squadRole, appearanceBonus: o.appearanceBonus, goalBonus: o.goalBonus, youth: false };
  if (o.signingBonus > 0 && p.clubId) postTransaction(world, p.clubId, -o.signingBonus, "signing_bonus", `Signing bonus: ${fullName(p)}`, `signbonus:${p.id}:${start}:${o.wage}`);
  p.happiness = clamp(p.happiness + 10, 0, 100);
  p.morale = clamp(p.morale + 5, 0, 100);
}

function removeFromSelections(world: World, playerId: ID): void {
  invalidateSquadIndex(world);
  for (const c of Object.values(world.clubs)) {
    const s = c.selection;
    if (!s) continue;
    for (const k of Object.keys(s.starters)) if (s.starters[k] === playerId) delete s.starters[k];
    s.bench = s.bench.filter((id) => id !== playerId);
    if (s.captainId === playerId) s.captainId = null;
    if (s.penaltyTakerId === playerId) s.penaltyTakerId = null;
    if (s.freeKickTakerId === playerId) s.freeKickTakerId = null;
    if (s.cornerTakerId === playerId) s.cornerTakerId = null;
  }
}

/** Move a player between clubs (no money). Single source of truth for registrations. */
export function registerPlayer(world: World, p: Player, toClubId: ID | null): void {
  removeFromSelections(world, p.id);
  p.clubId = toClubId;
  p.squadStatus = "none";
  p.askingPrice = null;
  p.tacticalFamiliarity = toClubId ? 30 : p.tacticalFamiliarity;
  p.yellowAccumulation = {};
  for (const n of Object.values(world.negotiations)) {
    if (n.playerId === p.id && ["open", "club_agreed", "contract_stage"].includes(n.status)) {
      n.status = "expired";
      n.updatedDate = world.meta.currentDate;
    }
  }
}

export function completeTransfer(world: World, n: Negotiation): { ok: boolean; message: string } {
  const p = world.players[n.playerId];
  const buyer = world.clubs[n.buyingClubId];
  const o = n.agreedTransfer ?? defaultTransferOffer(0);
  const c = n.agreedContract;
  if (!c) return { ok: false, message: "No contract agreed." };
  const isFree = !p.clubId;
  if (!isFree && !isTransferWindowOpen(world, world.meta.currentDate)) {
    n.status = "club_agreed";
    return { ok: false, message: "The transfer window is closed. The deal will complete when it reopens." };
  }
  if (p.clubId === buyer.id) return { ok: false, message: "Player already registered with your club." };
  const counts = squadCount(world, buyer.id);
  if (counts.total + 1 - o.exchangePlayerIds.length > MAX_SQUAD) return { ok: false, message: `Squad limit of ${MAX_SQUAD} players would be exceeded.` };
  const seller = p.clubId ? world.clubs[p.clubId] : null;
  const upfront = Math.round(o.fee * (o.upfrontPct / 100));
  if (seller) {
    const err = checkTransferSpend(buyer, upfront, o.fee);
    if (err) {
      n.status = "rejected";
      return { ok: false, message: err };
    }
    const sellerCounts = squadCount(world, seller.id);
    if (sellerCounts.total - 1 + o.exchangePlayerIds.length < MIN_SQUAD - 2) return { ok: false, message: `${seller.shortName}'s squad would fall below the minimum size.` };
  }
  const key = `transfer:${n.id}`;
  const record: TransferRecord = {
    id: newId(world, "tr"), playerId: p.id, fromClubId: seller?.id ?? null, toClubId: buyer.id, date: world.meta.currentDate, fee: o.fee, type: seller ? "permanent" : "free",
    seasonId: world.meta.currentSeasonId, sellOnPct: o.sellOnPct, sellOnBeneficiaryClubId: o.sellOnPct > 0 ? seller?.id ?? null : null, addOns: [], appsSince: 0, goalsSince: 0,
  };
  if (seller && o.fee > 0) {
    postTransaction(world, buyer.id, -upfront, "transfer_fee_out", `Transfer: ${fullName(p)} from ${seller.shortName}`, `${key}:out`);
    // sell-on clause owed by the seller to an earlier club
    const prior = world.transfers.filter((t) => t.playerId === p.id && t.toClubId === seller.id && t.sellOnPct > 0 && t.sellOnBeneficiaryClubId).slice(-1)[0];
    let sellOnPaid = 0;
    if (prior && world.clubs[prior.sellOnBeneficiaryClubId!]) {
      sellOnPaid = Math.round(upfront * (prior.sellOnPct / 100));
      postTransaction(world, prior.sellOnBeneficiaryClubId!, sellOnPaid, "sell_on", `Sell-on clause: ${fullName(p)}`, `${key}:sellon:in`);
    }
    postTransaction(world, seller.id, upfront - sellOnPaid, "transfer_fee_in", `Transfer: ${fullName(p)} to ${buyer.shortName}`, `${key}:in`);
    const deferred = o.fee - upfront;
    if (deferred > 0) record.addOns.push({ kind: "installment", threshold: 0, amount: deferred, paid: false, dueDate: addYears(world.meta.currentDate, 1), payerClubId: buyer.id, payeeClubId: seller.id });
    if (o.addOnAppearances > 0) record.addOns.push({ kind: "appearances", threshold: 25, amount: o.addOnAppearances, paid: false, payerClubId: buyer.id, payeeClubId: seller.id });
    if (o.addOnGoals > 0) record.addOns.push({ kind: "goals", threshold: 10, amount: o.addOnGoals, paid: false, payerClubId: buyer.id, payeeClubId: seller.id });
    buyer.finance.transferBudget = Math.max(0, buyer.finance.transferBudget - o.fee);
    seller.finance.transferBudget += Math.round(upfront * 0.5);
  }
  // exchange players move to the seller
  for (const id of o.exchangePlayerIds) {
    const x = world.players[id];
    if (!x || !seller) continue;
    registerPlayer(world, x, seller.id);
    world.transfers.push({ id: newId(world, "tr"), playerId: x.id, fromClubId: buyer.id, toClubId: seller.id, date: world.meta.currentDate, fee: 0, type: "permanent", seasonId: world.meta.currentSeasonId, sellOnPct: 0, sellOnBeneficiaryClubId: null, addOns: [] });
  }
  if (c.signingBonus > 0) postTransaction(world, buyer.id, -c.signingBonus, "signing_bonus", `Signing bonus: ${fullName(p)}`, `${key}:bonus`);
  registerPlayer(world, p, buyer.id);
  const endYear = Number(world.meta.currentDate.slice(0, 4)) + c.years + (Number(world.meta.currentDate.slice(5, 7)) >= 7 ? 1 : 0);
  p.contract = { wage: c.wage, startDate: world.meta.currentDate, endDate: `${endYear}-06-30`, releaseClause: c.releaseClause, squadRole: c.squadRole, appearanceBonus: c.appearanceBonus, goalBonus: c.goalBonus, youth: false };
  p.morale = clamp(p.morale + 10, 0, 100);
  p.happiness = 75;
  world.transfers.push(record);
  n.status = "completed";
  n.updatedDate = world.meta.currentDate;
  assignSquadRoles(world, buyer.id);
  if (seller) assignSquadRoles(world, seller.id);
  if (buyer.isUser || seller?.isUser || o.fee >= 15_000_000) {
    addNews(world, {
      category: "transfer",
      title: seller ? `${fullName(p)} joins ${buyer.shortName} from ${seller.shortName}` : `${buyer.shortName} sign free agent ${fullName(p)}`,
      body: seller ? `${buyer.name} have completed the signing of ${fullName(p)} for ${o.fee.toLocaleString()}${o.upfrontPct < 100 ? ` (${o.upfrontPct}% upfront)` : ""}.` : `${fullName(p)} has signed a ${c.years}-year contract.`,
      clubIds: [buyer.id, ...(seller ? [seller.id] : [])], playerIds: [p.id], important: o.fee >= 30_000_000,
    });
  }
  return { ok: true, message: `${fullName(p)} has signed for ${buyer.shortName}!` };
}

export function completeLoan(world: World, n: Negotiation): { ok: boolean; message: string } {
  const p = world.players[n.playerId];
  const borrower = world.clubs[n.buyingClubId];
  const o = n.agreedTransfer!;
  const parent = p.clubId ? world.clubs[p.clubId] : null;
  if (!parent) return { ok: false, message: "Free agents cannot be loaned." };
  if (!isTransferWindowOpen(world, world.meta.currentDate)) return { ok: false, message: "Loans can only be agreed while the transfer window is open." };
  if (squadCount(world, borrower.id).total + 1 > MAX_SQUAD) return { ok: false, message: "Your squad is full." };
  if (o.loanFee > 0) {
    postTransaction(world, borrower.id, -o.loanFee, "loan_fee_out", `Loan fee: ${fullName(p)}`, `loan:${n.id}:out`);
    postTransaction(world, parent.id, o.loanFee, "loan_fee_in", `Loan fee: ${fullName(p)}`, `loan:${n.id}:in`);
    borrower.finance.transferBudget = Math.max(0, borrower.finance.transferBudget - o.loanFee);
  }
  const loanId = newId(world, "ln");
  world.loans[loanId] = { id: loanId, playerId: p.id, parentClubId: parent.id, loanClubId: borrower.id, startDate: world.meta.currentDate, endDate: o.loanEndDate!, wageSharePct: o.loanWageSharePct, optionToBuyFee: o.type === "loan_with_option" ? o.optionToBuyFee : null, fee: o.loanFee, active: true };
  registerPlayer(world, p, borrower.id);
  p.loanParentClubId = parent.id;
  world.transfers.push({ id: newId(world, "tr"), playerId: p.id, fromClubId: parent.id, toClubId: borrower.id, date: world.meta.currentDate, fee: o.loanFee, type: "loan", seasonId: world.meta.currentSeasonId, sellOnPct: 0, sellOnBeneficiaryClubId: null, addOns: [] });
  n.status = "completed";
  if (borrower.isUser || parent.isUser) addNews(world, { category: "transfer", title: `${fullName(p)} loaned to ${borrower.shortName}`, body: `${fullName(p)} joins ${borrower.name} on loan from ${parent.name} until ${o.loanEndDate}.`, clubIds: [borrower.id, parent.id], playerIds: [p.id] });
  return { ok: true, message: `${fullName(p)} joins on loan until ${o.loanEndDate}.` };
}

export function endLoan(world: World, loanId: ID, reason: "expired" | "recalled" | "bought"): void {
  const l = world.loans[loanId];
  if (!l || !l.active) return;
  const p = world.players[l.playerId];
  l.active = false;
  if (reason === "bought") return;
  if (p && !p.retired) {
    registerPlayer(world, p, l.parentClubId);
    p.loanParentClubId = null;
    world.transfers.push({ id: newId(world, "tr"), playerId: p.id, fromClubId: l.loanClubId, toClubId: l.parentClubId, date: world.meta.currentDate, fee: 0, type: "loan_return", seasonId: world.meta.currentSeasonId, sellOnPct: 0, sellOnBeneficiaryClubId: null, addOns: [] });
  }
}

export function exerciseLoanOption(world: World, loanId: ID): { ok: boolean; message: string } {
  const l = world.loans[loanId];
  if (!l || !l.active || l.optionToBuyFee === null) return { ok: false, message: "No purchase option on this loan." };
  const buyer = world.clubs[l.loanClubId];
  const p = world.players[l.playerId];
  const err = checkTransferSpend(buyer, l.optionToBuyFee, l.optionToBuyFee);
  if (err) return { ok: false, message: err };
  postTransaction(world, buyer.id, -l.optionToBuyFee, "transfer_fee_out", `Option exercised: ${fullName(p)}`, `loanopt:${l.id}:out`);
  postTransaction(world, l.parentClubId, l.optionToBuyFee, "transfer_fee_in", `Option exercised: ${fullName(p)}`, `loanopt:${l.id}:in`);
  buyer.finance.transferBudget = Math.max(0, buyer.finance.transferBudget - l.optionToBuyFee);
  endLoan(world, loanId, "bought");
  p.loanParentClubId = null;
  world.transfers.push({ id: newId(world, "tr"), playerId: p.id, fromClubId: l.parentClubId, toClubId: buyer.id, date: world.meta.currentDate, fee: l.optionToBuyFee, type: "loan_option_exercised", seasonId: world.meta.currentSeasonId, sellOnPct: 0, sellOnBeneficiaryClubId: null, addOns: [] });
  assignSquadRoles(world, buyer.id);
  return { ok: true, message: `${fullName(p)} has joined permanently.` };
}

/** Release a player: pays up to one year of remaining wages as compensation. */
export function releasePlayer(world: World, playerId: ID): { ok: boolean; message: string } {
  const p = world.players[playerId];
  if (!p.clubId || !p.contract) return { ok: false, message: "Player is not under contract." };
  if (p.loanParentClubId) return { ok: false, message: "Loaned players cannot be released." };
  const club = world.clubs[p.clubId];
  if (squadCount(world, club.id).total - 1 < MIN_SQUAD) return { ok: false, message: `Squads must keep at least ${MIN_SQUAD} players.` };
  const weeks = Math.max(0, Math.min(52, diffDays(p.contract.endDate, world.meta.currentDate) / 7));
  const payout = Math.round(weeks * p.contract.wage);
  postTransaction(world, club.id, -payout, "compensation", `Contract termination: ${fullName(p)}`, `release:${p.id}:${world.meta.currentDate}`);
  world.transfers.push({ id: newId(world, "tr"), playerId: p.id, fromClubId: club.id, toClubId: null, date: world.meta.currentDate, fee: 0, type: "release", seasonId: world.meta.currentSeasonId, sellOnPct: 0, sellOnBeneficiaryClubId: null, addOns: [] });
  registerPlayer(world, p, null);
  p.contract = null;
  assignSquadRoles(world, club.id);
  return { ok: true, message: `${fullName(p)} released (compensation ${payout.toLocaleString()}).` };
}

/** Pay due installments and conditional add-ons. */
export function processTransferPayments(world: World): void {
  const today = world.meta.currentDate;
  for (const t of world.transfers) {
    if (!t.addOns.length) continue;
    const p = world.players[t.playerId];
    t.addOns.forEach((a, i) => {
      if (a.paid || !a.payerClubId || !a.payeeClubId) return;
      let due = false;
      if (a.kind === "installment") due = !!a.dueDate && a.dueDate <= today;
      else if (p && p.clubId === t.toClubId) {
        let apps = 0, goals = 0;
        for (const s of Object.values(p.seasonStats)) {
          apps += s.apps;
          goals += s.goals;
        }
        // Season stats reset each summer; accumulate into the record.
        if (a.kind === "appearances") due = (t.appsSince ?? 0) + apps >= a.threshold;
        if (a.kind === "goals") due = (t.goalsSince ?? 0) + goals >= a.threshold;
      }
      if (!due) return;
      if (!world.clubs[a.payerClubId] || !world.clubs[a.payeeClubId]) return;
      a.paid = true;
      postTransaction(world, a.payerClubId, -a.amount, a.kind === "installment" ? "transfer_fee_out" : "add_on", `${a.kind === "installment" ? "Transfer installment" : "Add-on"}: ${p ? fullName(p) : "player"}`, `addon:${t.id}:${i}:out`);
      postTransaction(world, a.payeeClubId, a.amount, a.kind === "installment" ? "transfer_fee_in" : "add_on", `${a.kind === "installment" ? "Transfer installment" : "Add-on"}: ${p ? fullName(p) : "player"}`, `addon:${t.id}:${i}:in`);
    });
  }
}

/** At season end: carry appearance/goal counts into pending add-on records before stats reset. */
export function rollAddOnCounters(world: World): void {
  for (const t of world.transfers) {
    if (!t.addOns.some((a) => !a.paid && a.kind !== "installment")) continue;
    const p = world.players[t.playerId];
    if (!p || p.clubId !== t.toClubId) continue;
    for (const s of Object.values(p.seasonStats)) {
      t.appsSince = (t.appsSince ?? 0) + s.apps;
      t.goalsSince = (t.goalsSince ?? 0) + s.goals;
    }
  }
}

export function daysLeftInWindow(world: World): number | null {
  const s = world.seasons[world.meta.currentSeasonId];
  const w = s?.transferWindows.find((x) => world.meta.currentDate >= x.start && world.meta.currentDate <= x.end);
  return w ? diffDays(w.end, world.meta.currentDate) : null;
}

