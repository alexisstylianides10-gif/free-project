import type { Club, FinancialTransaction, ID, ISODate, TransactionCategory, World } from "../core/types";
import { newId } from "../core/ids";
import { addMonths } from "../core/dates";
import { activeLoans, clubPlayers } from "../world/index";

export class FinanceError extends Error {}

const INCOME_KEYS: Record<string, string> = {
  transfer_fee_in: "Transfers", loan_fee_in: "Transfers", ticket_sales: "Matchday", hospitality: "Matchday", tv_revenue: "TV", prize_money: "Prize money",
  sponsorship: "Commercial", merchandise: "Commercial", loan_received: "Loans", sell_on: "Transfers", add_on: "Transfers", compensation: "Other", other: "Other",
};

/**
 * The ONLY function allowed to change a club balance. Every movement produces
 * a transaction record; the idempotency key prevents double application
 * (e.g. if a day were processed twice or a button double-clicked).
 */
export function postTransaction(world: World, clubId: ID, amount: number, category: TransactionCategory, description: string, idempotencyKey: string, date: ISODate = world.meta.currentDate): FinancialTransaction | null {
  if (!Number.isFinite(amount)) throw new FinanceError(`Invalid amount for ${description}`);
  if (world.appliedTransactionKeys[idempotencyKey]) return null;
  const club = world.clubs[clubId];
  if (!club) throw new FinanceError(`Unknown club ${clubId}`);
  const amt = Math.round(amount);
  club.finance.balance += amt;
  const bucket = amt >= 0 ? club.finance.revenueSeason : club.finance.expenseSeason;
  bucket[category] = (bucket[category] ?? 0) + Math.abs(amt);
  world.appliedTransactionKeys[idempotencyKey] = true;
  const tx: FinancialTransaction = { id: newId(world, "tx"), clubId, date, amount: amt, category, description, balanceAfter: club.finance.balance, idempotencyKey };
  // Full ledger for the user's club; AI clubs keep only significant items to bound save size.
  if (club.isUser || Math.abs(amt) >= 250_000 || category.startsWith("transfer")) world.transactions.push(tx);
  return tx;
}

export function canAfford(club: Club, amount: number): boolean {
  return club.finance.balance + club.finance.overdraftLimit >= amount;
}

/** Spending authorisation for transfers: within transfer budget and cash (plus overdraft). */
export function checkTransferSpend(club: Club, upfront: number, total: number): string | null {
  if (total > club.finance.transferBudget) return `Exceeds the remaining transfer budget (${Math.round(club.finance.transferBudget).toLocaleString()}).`;
  if (!canAfford(club, upfront)) return "The club cannot afford the upfront payment.";
  return null;
}

/** Player wage bill only (cheap; used by AI decisions). */
export function weeklyPlayerWages(world: World, clubId: ID): number {
  return weeklyWageBill(world, clubId, false).players;
}

export function weeklyWageBill(world: World, clubId: ID, includeStaff = true): { players: number; staff: number } {
  let players = 0;
  let staff = 0;
  const loans = activeLoans(world);
  for (const p of clubPlayers(world, clubId)) {
    if (!p.contract) continue;
    if (!p.loanParentClubId) players += p.contract.wage;
    else players += p.contract.wage * ((loans.byPlayer.get(p.id)?.wageSharePct ?? 100) / 100);
  }
  for (const l of loans.byParent.get(clubId) ?? []) {
    const p = world.players[l.playerId];
    if (p?.contract) players += p.contract.wage * (1 - l.wageSharePct / 100);
  }
  if (includeStaff) for (const id in world.staff) {
    const s = world.staff[id];
    if (s.clubId === clubId && s.contract) staff += s.contract.wage;
  }
  return { players: Math.round(players), staff: Math.round(staff) };
}

export function takeBankLoan(world: World, clubId: ID, principal: number, years: number): { ok: boolean; message: string } {
  const club = world.clubs[clubId];
  if (principal <= 0 || years < 1 || years > 10) return { ok: false, message: "Invalid loan terms." };
  const existing = club.finance.loans.reduce((s, l) => s + l.remaining, 0);
  const capacity = Math.max(0, club.reputation * 2_000_000 - existing);
  if (principal > capacity) return { ok: false, message: `The bank will lend at most ${Math.round(capacity).toLocaleString()} more.` };
  const rate = 0.045 + Math.max(0, (60 - club.reputation)) * 0.0008;
  const months = years * 12;
  const r = rate / 12;
  const payment = Math.round((principal * r) / (1 - Math.pow(1 + r, -months)));
  const loan = { id: newId(world, "loan"), principal, remaining: principal, interestRate: rate, monthlyPayment: payment, startDate: world.meta.currentDate, endDate: addMonths(world.meta.currentDate, months) };
  club.finance.loans.push(loan);
  club.finance.debt += principal;
  postTransaction(world, clubId, principal, "loan_received", `Bank loan (${years} years at ${(rate * 100).toFixed(1)}%)`, `bankloan:${loan.id}`);
  return { ok: true, message: `Loan approved: ${principal.toLocaleString()} repaid at ${payment.toLocaleString()} per month.` };
}

export function incomeGroup(category: string): string {
  return INCOME_KEYS[category] ?? "Other";
}

/** Simple 12-month cash-flow forecast from recurring items. */
export function forecast(world: World, clubId: ID): { month: string; balance: number; income: number; expense: number }[] {
  const club = world.clubs[clubId];
  const wages = weeklyWageBill(world, clubId);
  const monthlyWages = ((wages.players + wages.staff) * 52) / 12;
  const sponsor = Object.values(world.sponsorDeals).filter((d) => d.clubId === clubId && d.endDate >= world.meta.currentDate).reduce((s, d) => s + d.annualValue / 12, 0);
  const league = world.competitions[club.leagueId ?? ""];
  const tv = (league?.league?.tvMoneyPerClub ?? 0) / 10; // paid Aug-May
  const stadium = world.stadiums[club.stadiumId];
  const homeGamesPerMonth = 2;
  const gate = stadium ? stadium.capacity * 0.8 * club.finance.ticketPrice * homeGamesPerMonth : 0;
  const maintenance = stadium ? stadium.capacity * 1.2 * stadium.maintenanceLevel * 4.3 : 0;
  const loanPayments = club.finance.loans.reduce((s, l) => s + (l.remaining > 0 ? l.monthlyPayment : 0), 0);
  const out: { month: string; balance: number; income: number; expense: number }[] = [];
  let bal = club.finance.balance;
  for (let i = 1; i <= 12; i++) {
    const d = addMonths(world.meta.currentDate, i);
    const m = Number(d.slice(5, 7));
    const inSeason = m >= 8 || m <= 5;
    const income = sponsor + (inSeason ? tv + gate : 0);
    const expense = monthlyWages + maintenance + loanPayments;
    bal += income - expense;
    out.push({ month: d.slice(0, 7), balance: Math.round(bal), income: Math.round(income), expense: Math.round(expense) });
  }
  return out;
}

export function financialAlerts(world: World, clubId: ID): string[] {
  const club = world.clubs[clubId];
  const out: string[] = [];
  const wages = weeklyWageBill(world, clubId);
  if (club.finance.balance < 0) out.push("The club is in overdraft. The board expects the balance to be restored.");
  if (wages.players > club.finance.wageBudget) out.push(`Player wages (${wages.players.toLocaleString()}/wk) exceed the wage budget (${club.finance.wageBudget.toLocaleString()}/wk).`);
  const fc = forecast(world, clubId);
  const neg = fc.find((f) => f.balance < -club.finance.overdraftLimit);
  if (neg) out.push(`Forecast: the balance may exceed the overdraft limit by ${neg.month}.`);
  return out;
}
