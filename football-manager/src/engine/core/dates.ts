import type { ISODate } from "./types";

const MS_DAY = 86_400_000;

export function toDate(d: ISODate): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

export function fromDate(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: ISODate, n: number): ISODate {
  return fromDate(new Date(toDate(d).getTime() + n * MS_DAY));
}

export function addMonths(d: ISODate, n: number): ISODate {
  const dt = toDate(d);
  const target = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + n, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(dt.getUTCDate(), lastDay));
  return fromDate(target);
}

export function addYears(d: ISODate, n: number): ISODate {
  return addMonths(d, n * 12);
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toDate(a).getTime() - toDate(b).getTime()) / MS_DAY);
}

export function weekday(d: ISODate): number {
  return toDate(d).getUTCDay();
}

export function ageOn(dob: ISODate, on: ISODate): number {
  const b = toDate(dob);
  const o = toDate(on);
  let age = o.getUTCFullYear() - b.getUTCFullYear();
  const m = o.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && o.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

export function yearsBetween(a: ISODate, b: ISODate): number {
  return diffDays(b, a) / 365.25;
}

export function isBetween(d: ISODate, start: ISODate, end: ISODate): boolean {
  return d >= start && d <= end;
}

export function monthDay(d: ISODate): string {
  return d.slice(5);
}

export function formatDate(d: ISODate, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  return toDate(d).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
}

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return fromDate(toDate(s)) === s;
}
