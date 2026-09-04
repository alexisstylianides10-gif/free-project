import { School, BookOpen, Coffee, Brain, Rocket, type LucideIcon } from "lucide-react";
import type { Homework, TimetableEntry, StudySession, Priority } from "@/lib/types";
import type { Mission } from "@/lib/catalog/missions";
import { formatTime12 } from "@/lib/utils";

export interface PlanItem {
  time: string; // "HH:MM" 24h, for sorting
  icon: LucideIcon;
  label: string;
  meta?: string;
  kind: "school" | "homework" | "free" | "study" | "mission";
}

const PRIORITY_MINUTES: Record<Priority, number> = { high: 45, medium: 30, low: 20 };

/** Builds "Today's Plan" by merging today's timetable, one due homework
 * item, a fixed free-time slot, this week's study-plan sessions for today,
 * and the day's Future Mission — the same real data every other screen
 * reads, just laid out on a timeline. Pure function so it's easy to test
 * and reuse between Home and School. */
export function buildTodaysPlan(input: {
  todayTimetable: TimetableEntry[];
  todayHomework: Homework[];
  todayStudySessions: StudySession[];
  mission?: Mission;
}): PlanItem[] {
  const items: PlanItem[] = [];

  if (input.todayTimetable.length > 0) {
    const first = [...input.todayTimetable].sort((a, b) => a.start_time.localeCompare(b.start_time))[0];
    items.push({ time: first.start_time, icon: School, label: "School", kind: "school" });
  }

  const homework = input.todayHomework.filter((h) => h.status === "pending")[0];
  if (homework) {
    items.push({
      time: "15:30",
      icon: BookOpen,
      label: `${homework.subject} homework`,
      meta: `${PRIORITY_MINUTES[homework.priority]} min`,
      kind: "homework",
    });
  }

  items.push({ time: "17:00", icon: Coffee, label: "Activity / free time", kind: "free" });

  for (const session of input.todayStudySessions) {
    items.push({
      time: "18:30",
      icon: Brain,
      label: `${session.subject} revision`,
      meta: `${session.duration_min} min`,
      kind: "study",
    });
  }

  if (input.mission) {
    items.push({
      time: "19:15",
      icon: Rocket,
      label: "Future Mission",
      meta: `${input.mission.minutes} min`,
      kind: "mission",
    });
  }

  return items.sort((a, b) => a.time.localeCompare(b.time));
}

export function formatPlanTime(time: string): string {
  return formatTime12(time);
}
