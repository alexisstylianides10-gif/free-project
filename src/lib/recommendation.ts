import type { Exam, Homework } from "@/lib/types";
import { daysBetween, todayISO } from "@/lib/utils";
import type { Career } from "@/lib/catalog/careers";

/**
 * The one-line "AI recommendation" shown on Home — deliberately school-first:
 * an exam or high-priority homework within the next 7 days always outranks
 * career/business suggestions, mirroring the AI Coach's own prioritization
 * rule ("the exam comes first, then 20-30 minutes for your other goal").
 */
export function buildAIRecommendation(input: { exams: Exam[]; homework: Homework[]; primaryCareer?: Career }): string {
  const today = todayISO();
  const soonExam = input.exams
    .filter((e) => daysBetween(today, e.exam_date) >= 0 && daysBetween(today, e.exam_date) <= 7)
    .sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0];

  if (soonExam) {
    const days = daysBetween(today, soonExam.exam_date);
    return `Your ${soonExam.subject} exam is in ${days} day${days === 1 ? "" : "s"} — protect that first, then keep a light ${
      input.primaryCareer ? input.primaryCareer.name.toLowerCase() : "career"
    } habit going.`;
  }

  const highPriority = input.homework.find((h) => h.status === "pending" && h.priority === "high");
  if (highPriority) {
    return `${highPriority.subject} (${highPriority.title}) is high priority — clear that today, then spend your extra time on your future.`;
  }

  if (input.primaryCareer) {
    return `School's under control right now — good time to push further on ${input.primaryCareer.name}. Try today's Future Mission.`;
  }

  return "School's under control right now — a great time to explore a career direction with today's Future Mission.";
}

export interface RecommendationChip {
  icon: string;
  label: string;
  minutes: number;
}

/** The two-chip "Today's Recommendation" split shown on the AI Coach tab —
 * a school block and a future/career block, sized so school always gets
 * the bigger (or only) share of time when a deadline is close. */
export function buildRecommendationChips(input: {
  exams: Exam[];
  homework: Homework[];
  primaryCareer?: Career;
}): RecommendationChip[] {
  const today = todayISO();
  const soonExam = input.exams
    .filter((e) => daysBetween(today, e.exam_date) >= 0 && daysBetween(today, e.exam_date) <= 7)
    .sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0];
  const highPriorityHomework = input.homework.find((h) => h.status === "pending" && h.priority === "high");

  const chips: RecommendationChip[] = [];

  if (soonExam) {
    chips.push({ icon: "📚", label: soonExam.subject, minutes: 45 });
    if (input.primaryCareer) chips.push({ icon: "🚀", label: input.primaryCareer.name.split(" ")[0], minutes: 20 });
  } else if (highPriorityHomework) {
    chips.push({ icon: "📚", label: highPriorityHomework.subject, minutes: 30 });
    if (input.primaryCareer) chips.push({ icon: "🚀", label: input.primaryCareer.name.split(" ")[0], minutes: 30 });
  } else if (input.primaryCareer) {
    chips.push({ icon: "🚀", label: input.primaryCareer.name, minutes: 30 });
    chips.push({ icon: "🧠", label: "Skill building", minutes: 20 });
  } else {
    chips.push({ icon: "🧭", label: "Explore a career", minutes: 20 });
  }

  return chips;
}
