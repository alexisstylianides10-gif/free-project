import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

/** A real UUID, for rows that get persisted to Postgres (which needs valid uuid columns). */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function formatMoney(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}€${Math.abs(n).toFixed(2)}`;
}

/** Today's date in the *local* timezone (never UTC — toISOString() would be
 * wrong for roughly half the day in most timezones). */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Today's date in an arbitrary IANA timezone — for server code, which has
 * no "local" timezone of its own and must use the user's stored one. */
export function todayISOInTimezone(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return todayISO();
  }
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + "T00:00:00").getTime();
  const b = new Date(toISO + "T00:00:00").getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/**
 * `referenceTodayISO` defaults to the browser's own local date, which is
 * correct for every client-rendered call site (the browser's local time IS
 * the user's local time). Server code has no such luck — the Node process
 * runs in its own timezone (UTC on Railway), which can be a different
 * calendar day than the user's right now — so every AI-tool call site
 * (calendar/business/study/tasks descriptions the model reads or shows the
 * user) MUST pass ctx.today explicitly rather than relying on the default.
 */
export function formatDayLabel(iso: string, referenceTodayISO: string = todayISO()): string {
  const diff = daysBetween(referenceTodayISO, iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  const d = new Date(iso + "T00:00:00");
  if (diff > 1 && diff < 7) {
    return d.toLocaleDateString("en-US", { weekday: "long" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${period}` : `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export function priorityWeight(p: "critical" | "high" | "medium" | "low"): number {
  return { critical: 3, high: 2, medium: 1, low: 0 }[p];
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function nextWeekday(fromISO: string, targetDay: number, includeToday = false): string {
  const d = new Date(fromISO + "T00:00:00");
  const current = d.getDay();
  let delta = (targetDay - current + 7) % 7;
  if (delta === 0 && !includeToday) delta = 7;
  return addDaysISO(fromISO, delta);
}

/**
 * Whether a (possibly recurring) event occurs on the given date — the seed
 * date itself, or a matching daily/weekly repeat within recurrenceUntil.
 * Views that list events for a specific date must use this instead of a
 * literal `date === ` check, or recurring events only ever show up on the
 * one day they were created on.
 */
export function eventOccursOn(event: { date: string; recurrence: "none" | "daily" | "weekly"; recurrenceUntil?: string }, dateISO: string): boolean {
  if (event.date === dateISO) return true;
  if (event.recurrence === "none") return false;
  if (dateISO < event.date) return false;
  if (event.recurrenceUntil && dateISO > event.recurrenceUntil) return false;
  if (event.recurrence === "daily") return true;
  return new Date(dateISO + "T00:00:00").getDay() === new Date(event.date + "T00:00:00").getDay();
}

export function timeOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * A routine step reads as "done" only for the day it was actually
 * completed — otherwise it would stay checked forever. There's no reset
 * job; this is purely computed from the persisted done + lastCompletedDate.
 */
export function isStepDoneToday(step: { done: boolean; lastCompletedDate?: string }, today: string): boolean {
  return step.done && step.lastCompletedDate === today;
}
