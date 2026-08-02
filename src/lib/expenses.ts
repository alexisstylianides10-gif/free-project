import { Expense, TripMember } from "./types";

/** The amount a given member owes for a single expense (equal split unless a custom split is set). */
export function shareOwed(expense: Expense, memberId: string): number {
  if (!expense.participantIds.includes(memberId)) return 0;
  if (expense.customSplit && expense.customSplit[memberId] !== undefined) return expense.customSplit[memberId];
  return expense.amount / expense.participantIds.length;
}

export interface Balance {
  member: TripMember;
  amount: number; // positive = they owe the current user, negative = current user owes them
}

/** Net balances between the current user and every other trip member, across all expenses. */
export function computeBalances(expenses: Expense[], members: TripMember[], currentMemberId: string | undefined): Balance[] {
  if (!currentMemberId) return [];
  const net = new Map<string, number>();

  for (const expense of expenses) {
    for (const participantId of expense.participantIds) {
      if (participantId === expense.paidBy) continue;
      const owed = shareOwed(expense, participantId);
      if (participantId === currentMemberId) {
        // current user owes the payer their share
        net.set(expense.paidBy, (net.get(expense.paidBy) ?? 0) - owed);
      } else if (expense.paidBy === currentMemberId) {
        // the other participant owes the current user their share
        net.set(participantId, (net.get(participantId) ?? 0) + owed);
      }
    }
  }

  return members
    .filter((m) => m.id !== currentMemberId && net.has(m.id))
    .map((m) => ({ member: m, amount: Math.round((net.get(m.id) ?? 0) * 100) / 100 }))
    .filter((b) => Math.abs(b.amount) >= 0.01);
}

export function totalByCategory(expenses: Expense[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const e of expenses) totals[e.category] = (totals[e.category] ?? 0) + e.amount;
  return totals;
}

export function totalSpent(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + e.amount, 0);
}
