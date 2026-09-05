import type { StudyTopic, StudyFocusSession } from "@/lib/study/types";
import type { Exam } from "@/lib/types";
import { todayISO, daysBetween } from "@/lib/utils";

export function weakestTopic(topics: StudyTopic[]): StudyTopic | null {
  if (topics.length === 0) return null;
  return [...topics].sort((a, b) => a.mastery - b.mastery)[0];
}

export function todaysStudyMinutes(sessions: StudyFocusSession[]): number {
  const today = todayISO();
  return sessions.filter((s) => s.created_at.slice(0, 10) === today).reduce((sum, s) => sum + s.duration_min, 0);
}

/** Average mastery across a subject's topics — used as an exam's
 * "readiness" indicator when the exam is linked to a Study subject. */
export function subjectReadiness(topics: StudyTopic[]): number | null {
  if (topics.length === 0) return null;
  return Math.round(topics.reduce((sum, t) => sum + t.mastery, 0) / topics.length);
}

export interface StudyRecommendation {
  text: string;
  subjectId: string | null;
  topicId: string | null;
  /** Where "Start Study" should go. Defaults to "topic" behavior (a
   * subject/topic session) when omitted — added so the flashcards-due
   * case can point at a review session instead without every existing
   * caller needing to branch on a new required field. */
  action?: "topic" | "flashcards" | "explore";
}

/**
 * The Study tab's "one clear next action" — deliberately singular per the
 * spec ("Do not overwhelm the student with 20 recommendations"). An exam
 * within 10 days always wins; otherwise the weakest topic across every
 * subject; otherwise a gentle nudge to add material.
 */
export function buildStudyRecommendation(input: {
  upcomingExams: (Exam & { readiness: number | null })[];
  allWeakestTopic: (StudyTopic & { subjectName: string }) | null;
  hasAnySubjects: boolean;
  /** Count of due-today flashcards, across every subject. Optional so
   * existing callers (and older tests) don't need to change — when
   * omitted, the recommendation behaves exactly as before flashcards
   * existed as a real destination. */
  flashcardsDueCount?: number;
}): StudyRecommendation {
  const today = todayISO();
  const soonExam = input.upcomingExams
    .filter((e) => daysBetween(today, e.exam_date) >= 0 && daysBetween(today, e.exam_date) <= 10)
    .sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0];

  if (soonExam && input.allWeakestTopic) {
    return {
      text: `Practice ${input.allWeakestTopic.name} for 30 minutes: it's your weakest topic with the ${soonExam.subject} exam coming up.`,
      subjectId: input.allWeakestTopic.subject_id,
      topicId: input.allWeakestTopic.id,
    };
  }

  if (input.allWeakestTopic) {
    return {
      text: `Practice ${input.allWeakestTopic.name} for 30 minutes: your recent results show this is currently your weakest topic.`,
      subjectId: input.allWeakestTopic.subject_id,
      topicId: input.allWeakestTopic.id,
    };
  }

  // No exam pressure and no weak topic signal yet (e.g. a subject with
  // material but no quiz/session history) — due flashcards are still a
  // legitimate, low-friction "one clear next action" in that gap.
  if ((input.flashcardsDueCount ?? 0) > 0) {
    const n = input.flashcardsDueCount as number;
    return {
      text: `You have ${n} flashcard${n === 1 ? "" : "s"} due for review today, a quick way to keep what you've learned fresh.`,
      subjectId: null,
      topicId: null,
      action: "flashcards",
    };
  }

  if (!input.hasAnySubjects) {
    return { text: "Add a subject and upload your first material to get a personalized study plan.", subjectId: null, topicId: null };
  }

  return { text: "Upload some material for one of your subjects so your AI coach can find what to focus on.", subjectId: null, topicId: null };
}
