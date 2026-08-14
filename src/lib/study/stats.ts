import { startOfWeek, subWeeks, isWithinInterval, endOfWeek, startOfDay } from "date-fns";
import { FocusSession, Subject } from "@/lib/types";

function completedSessions(sessions: FocusSession[]): FocusSession[] {
  return sessions.filter((s) => s.completedAt);
}

export function minutesInWeek(sessions: FocusSession[], weekStart: Date): number {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  return completedSessions(sessions)
    .filter((s) => isWithinInterval(new Date(s.startedAt), { start: weekStart, end: weekEnd }))
    .reduce((sum, s) => sum + s.actualMinutes, 0);
}

export function weekOverWeekChangePct(sessions: FocusSession[], now = new Date()): { thisWeek: number; lastWeek: number; changePct: number | null } {
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = subWeeks(thisWeekStart, 1);
  const thisWeek = minutesInWeek(sessions, thisWeekStart);
  const lastWeek = minutesInWeek(sessions, lastWeekStart);
  const changePct = lastWeek === 0 ? null : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  return { thisWeek, lastWeek, changePct };
}

/** Consecutive days up to and including today with at least one completed session. */
export function dayStreak(sessions: FocusSession[], now = new Date()): number {
  const daysWithSessions = new Set(completedSessions(sessions).map((s) => startOfDay(new Date(s.startedAt)).getTime()));
  let streak = 0;
  let cursor = startOfDay(now);
  // Today doesn't break the streak if it has no session yet — start counting from
  // today if it has one, otherwise from yesterday.
  if (!daysWithSessions.has(cursor.getTime())) {
    cursor = new Date(cursor.getTime() - 86400000);
  }
  while (daysWithSessions.has(cursor.getTime())) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
}

export interface SubjectSlice {
  subjectId: string | "none";
  name: string;
  color: string;
  minutes: number;
  pct: number;
}

export function subjectDistribution(sessions: FocusSession[], subjects: Subject[], weekStart: Date): SubjectSlice[] {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const inWeek = completedSessions(sessions).filter((s) => isWithinInterval(new Date(s.startedAt), { start: weekStart, end: weekEnd }));
  const total = inWeek.reduce((sum, s) => sum + s.actualMinutes, 0);
  const bySubject = new Map<string, number>();
  for (const s of inWeek) {
    const key = s.subjectId ?? "none";
    bySubject.set(key, (bySubject.get(key) ?? 0) + s.actualMinutes);
  }
  return Array.from(bySubject.entries())
    .map(([subjectId, minutes]) => {
      const subject = subjects.find((sub) => sub.id === subjectId);
      return {
        subjectId,
        name: subject?.name ?? "Unassigned",
        color: subject?.color ?? "violet",
        minutes,
        pct: total === 0 ? 0 : Math.round((minutes / total) * 100),
      };
    })
    .sort((a, b) => b.minutes - a.minutes);
}

export function weeklyDailyMinutes(sessions: FocusSession[], weekStart: Date): number[] {
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => new Date(weekStart.getTime() + i * 86400000));
  return days.map((day) => {
    const dayEnd = new Date(day.getTime() + 86400000);
    return completedSessions(sessions)
      .filter((s) => {
        const t = new Date(s.startedAt).getTime();
        return t >= day.getTime() && t < dayEnd.getTime();
      })
      .reduce((sum, s) => sum + s.actualMinutes, 0);
  });
}
