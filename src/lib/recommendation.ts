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
