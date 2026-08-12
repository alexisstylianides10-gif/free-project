import { CalendarEvent } from "./types";

export interface FreeSlot {
  start: string;
  end: string;
  minutes: number;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

const DAY_START = toMinutes("07:00");
const DAY_END = toMinutes("22:00");

/** Free gaps of at least `minMinutes` between DAY_START and DAY_END on a given day's events. */
export function findFreeSlots(dayEvents: CalendarEvent[], minMinutes = 30, fromNowMinutes?: number): FreeSlot[] {
  const sorted = [...dayEvents].sort((a, b) => a.startTime.localeCompare(b.startTime)).map((e) => [toMinutes(e.startTime), toMinutes(e.endTime)] as [number, number]);

  const slots: FreeSlot[] = [];
  let cursor = Math.max(DAY_START, fromNowMinutes ?? DAY_START);
  for (const [start, end] of sorted) {
    if (start - cursor >= minMinutes) slots.push({ start: toHHMM(cursor), end: toHHMM(start), minutes: start - cursor });
    cursor = Math.max(cursor, end);
  }
  if (DAY_END - cursor >= minMinutes) slots.push({ start: toHHMM(cursor), end: toHHMM(DAY_END), minutes: DAY_END - cursor });
  return slots;
}

export function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}
