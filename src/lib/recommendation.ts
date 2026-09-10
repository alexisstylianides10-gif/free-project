import { BookOpen, Rocket, Brain, Compass, type LucideIcon } from "lucide-react";
import type { Exam, Homework } from "@/lib/types";
import { daysBetween, todayISO } from "@/lib/utils";

/** Discriminated result instead of a pre-built English string — the caller
 * (StudentHome) resolves the final sentence via useTranslations("Home"),
 * since the translated career name (from the "Careers" i18n namespace) and
 * ICU day-count pluralization both need a real translator, which this pure
 * data-shaping function intentionally doesn't depend on. */
export type AIRecommendation =
  | { kind: "examSoon"; subject: string; days: number; careerLabel?: string }
  | { kind: "highPriorityHomework"; subject: string; title: string }
  | { kind: "pushCareer"; careerLabel: string }
  | { kind: "exploreCareer" };

/**
 * The one-line "AI recommendation" shown on Home — deliberately school-first:
 * an exam or high-priority homework within the next 7 days always outranks
 * career/business suggestions, mirroring the AI Coach's own prioritization
 * rule ("the exam comes first, then 20-30 minutes for your other goal").
 */
export function buildAIRecommendation(input: { exams: Exam[]; homework: Homework[]; primaryCareerLabel?: string }): AIRecommendation {
  const today = todayISO();
  const soonExam = input.exams
    .filter((e) => daysBetween(today, e.exam_date) >= 0 && daysBetween(today, e.exam_date) <= 7)
    .sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0];

  if (soonExam) {
    const days = daysBetween(today, soonExam.exam_date);
    return { kind: "examSoon", subject: soonExam.subject, days, careerLabel: input.primaryCareerLabel };
  }

  const highPriority = input.homework.find((h) => h.status === "pending" && h.priority === "high");
  if (highPriority) {
    return { kind: "highPriorityHomework", subject: highPriority.subject, title: highPriority.title };
  }

  if (input.primaryCareerLabel) {
    return { kind: "pushCareer", careerLabel: input.primaryCareerLabel };
  }

  return { kind: "exploreCareer" };
}

export interface RecommendationChip {
  icon: LucideIcon;
  label: string;
  minutes: number;
}

export interface RecommendationChipLabels {
  skillBuilding: string;
  exploreCareer: string;
}

/** The two-chip "Today's Recommendation" split shown on the AI Coach tab —
 * a school block and a future/career block, sized so school always gets
 * the bigger (or only) share of time when a deadline is close.
 * `primaryCareerLabel`/`primaryCareerFirstWord` are pre-resolved by the
 * caller from the translated "Careers" namespace, same reasoning as
 * buildAIRecommendation above. */
export function buildRecommendationChips(input: {
  exams: Exam[];
  homework: Homework[];
  primaryCareerLabel?: string;
  primaryCareerFirstWord?: string;
  labels: RecommendationChipLabels;
}): RecommendationChip[] {
  const today = todayISO();
  const soonExam = input.exams
    .filter((e) => daysBetween(today, e.exam_date) >= 0 && daysBetween(today, e.exam_date) <= 7)
    .sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0];
  const highPriorityHomework = input.homework.find((h) => h.status === "pending" && h.priority === "high");

  const chips: RecommendationChip[] = [];

  if (soonExam) {
    chips.push({ icon: BookOpen, label: soonExam.subject, minutes: 45 });
    if (input.primaryCareerFirstWord) chips.push({ icon: Rocket, label: input.primaryCareerFirstWord, minutes: 20 });
  } else if (highPriorityHomework) {
    chips.push({ icon: BookOpen, label: highPriorityHomework.subject, minutes: 30 });
    if (input.primaryCareerFirstWord) chips.push({ icon: Rocket, label: input.primaryCareerFirstWord, minutes: 30 });
  } else if (input.primaryCareerLabel) {
    chips.push({ icon: Rocket, label: input.primaryCareerLabel, minutes: 30 });
    chips.push({ icon: Brain, label: input.labels.skillBuilding, minutes: 20 });
  } else {
    chips.push({ icon: Compass, label: input.labels.exploreCareer, minutes: 20 });
  }

  return chips;
}
