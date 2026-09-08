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

/** Every English literal below has a translated default so this stays
 * usable without a caller threading `labels` through, but StudentHome and
 * the Coach tab both pass a real translator (useTranslations("Planner")) so
 * the plan reads in the student's chosen language. */
export interface PlannerLabels {
  school: string;
  homework: (subject: string) => string;
  minutes: (n: number) => string;
  freeTime: string;
  revision: (subject: string) => string;
  futureMission: string;
}

const DEFAULT_LABELS: PlannerLabels = {
  school: "School",
  homework: (subject) => `${subject} homework`,
  minutes: (n) => `${n} min`,
  freeTime: "Activity / free time",
  revision: (subject) => `${subject} revision`,
  futureMission: "Future Mission",
};

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
  labels?: PlannerLabels;
}): PlanItem[] {
  const items: PlanItem[] = [];
  const labels = input.labels ?? DEFAULT_LABELS;

  if (input.todayTimetable.length > 0) {
    const first = [...input.todayTimetable].sort((a, b) => a.start_time.localeCompare(b.start_time))[0];
    items.push({ time: first.start_time, icon: School, label: labels.school, kind: "school" });
  }

  const homework = input.todayHomework.filter((h) => h.status === "pending")[0];
  if (homework) {
    items.push({
      time: "15:30",
      icon: BookOpen,
      label: labels.homework(homework.subject),
      meta: labels.minutes(PRIORITY_MINUTES[homework.priority]),
      kind: "homework",
    });
  }

  items.push({ time: "17:00", icon: Coffee, label: labels.freeTime, kind: "free" });

  for (const session of input.todayStudySessions) {
    items.push({
      time: "18:30",
      icon: Brain,
      label: labels.revision(session.subject),
      meta: labels.minutes(session.duration_min),
      kind: "study",
    });
  }

  if (input.mission) {
    items.push({
      time: "19:15",
      icon: Rocket,
      label: labels.futureMission,
      meta: labels.minutes(input.mission.minutes),
      kind: "mission",
    });
  }

  return items.sort((a, b) => a.time.localeCompare(b.time));
}

export function formatPlanTime(time: string): string {
  return formatTime12(time);
}
