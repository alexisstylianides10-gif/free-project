import { CalendarEventRow } from "./calendarEvents";

export interface FreeGap {
  start: Date;
  end: Date;
}

export interface DailyBriefing {
  greeting: string;
  todayAll: CalendarEventRow[];
  todayCompleted: CalendarEventRow[];
  todayRemaining: CalendarEventRow[];
  tomorrow: CalendarEventRow[];
  freeGaps: FreeGap[];
  isClear: boolean;
}

/** Minimum gap worth mentioning — a 5-minute breather between events isn't
 * useful information, it's noise. */
const MIN_USEFUL_GAP_MS = 20 * 60 * 1000;

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function endOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}
function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
function within(iso: string, start: Date, end: Date) {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function greetingFor(now: Date) {
  const h = now.getHours();
  if (h < 12) return "Good morning.";
  if (h < 18) return "Good afternoon.";
  return "Good evening.";
}

/**
 * Deterministic — no AI call. Every fact here comes straight from the
 * caller's own event rows; nothing is invented, nothing is summarized by a
 * model. Claude is reserved for turning this into looser prose later if
 * that ever adds real value — the structured version below is already what
 * the UI renders directly.
 */
export function buildDailyBriefing(events: CalendarEventRow[], now: Date): DailyBriefing {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const tomorrowStart = startOfDay(addDays(now, 1));
  const tomorrowEnd = endOfDay(tomorrowStart);

  const todayAll = events
    .filter((e) => within(e.start_time, todayStart, todayEnd))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const tomorrow = events
    .filter((e) => within(e.start_time, tomorrowStart, tomorrowEnd))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const todayCompleted = todayAll.filter((e) => new Date(e.end_time) <= now);
  const todayRemaining = todayAll.filter((e) => new Date(e.end_time) > now);

  const freeGaps: FreeGap[] = [];
  let cursor = now;
  for (const ev of todayRemaining) {
    const evStart = new Date(ev.start_time);
    if (evStart.getTime() - cursor.getTime() >= MIN_USEFUL_GAP_MS) {
      freeGaps.push({ start: cursor, end: evStart });
    }
    const evEnd = new Date(ev.end_time);
    if (evEnd.getTime() > cursor.getTime()) cursor = evEnd;
  }

  return {
    greeting: greetingFor(now),
    todayAll,
    todayCompleted,
    todayRemaining,
    tomorrow,
    freeGaps,
    isClear: todayAll.length === 0 && tomorrow.length === 0,
  };
}
