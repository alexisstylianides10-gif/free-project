import type { ID, ISODate } from "../core/types";
import { addDays, diffDays, weekday } from "../core/dates";

/**
 * Round-robin pairings using the circle method.
 * Returns `rounds` arrays of [home, away] pairs. For `legs` > 1 the
 * subsequent cycles mirror home/away so every pair meets home and away.
 */
export function roundRobin(clubIds: ID[], legs: number): [ID, ID][][] {
  const teams = clubIds.slice();
  if (teams.length < 2) return [];
  const BYE = "__bye__";
  if (teams.length % 2 === 1) teams.push(BYE);
  const n = teams.length;
  const half = n / 2;
  const single: [ID, ID][][] = [];
  const arr = teams.slice();
  for (let r = 0; r < n - 1; r++) {
    const round: [ID, ID][] = [];
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a === BYE || b === BYE) continue;
      // alternate home advantage so each club gets a balanced home/away pattern
      if ((r + i) % 2 === 0) round.push([a, b]);
      else round.push([b, a]);
    }
    single.push(round);
    // rotate all but the first
    arr.splice(1, 0, arr.pop() as string);
  }
  const out: [ID, ID][][] = [];
  for (let leg = 0; leg < legs; leg++) {
    for (const round of single) out.push(round.map(([h, a]) => (leg % 2 === 0 ? [h, a] : [a, h]) as [ID, ID]));
  }
  return out;
}

/** All dates in [start, end] that fall on the given weekday. */
export function datesOnWeekday(start: ISODate, end: ISODate, wd: number): ISODate[] {
  const out: ISODate[] = [];
  let d = start;
  const shift = (wd - weekday(d) + 7) % 7;
  d = addDays(d, shift);
  while (d <= end) {
    out.push(d);
    d = addDays(d, 7);
  }
  return out;
}

/** Pick `count` dates spread evenly through the candidate list (skipping blocked dates). */
export function spreadDates(candidates: ISODate[], count: number, blocked: Set<ISODate> = new Set()): ISODate[] {
  const free = candidates.filter((d) => !blocked.has(d));
  if (count <= 0) return [];
  if (free.length < count) {
    throw new Error(`Not enough match dates: need ${count}, have ${free.length}`);
  }
  if (count === 1) return [free[free.length - 1]];
  const out: ISODate[] = [];
  const step = (free.length - 1) / (count - 1);
  let lastIdx = -1;
  for (let i = 0; i < count; i++) {
    let idx = Math.round(i * step);
    if (idx <= lastIdx) idx = lastIdx + 1;
    out.push(free[idx]);
    lastIdx = idx;
  }
  return out;
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.abs(diffDays(a, b));
}
