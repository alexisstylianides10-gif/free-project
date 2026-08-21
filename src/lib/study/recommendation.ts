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
}): StudyRecommendation {
  const today = todayISO();
  const soonExam = input.upcomingExams
    .filter((e) => daysBetween(today, e.exam_date) >= 0 && daysBetween(today, e.exam_date) <= 10)
    .sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0];

  if (soonExam && input.allWeakestTopic) {
    return {
      text: `Practice ${input.allWeakestTopic.name} for 30 minutes — it's your weakest topic with the ${soonExam.subject} exam coming up.`,
      subjectId: input.allWeakestTopic.subject_id,
      topicId: input.allWeakestTopic.id,
    };
  }

  if (input.allWeakestTopic) {
    return {
      text: `Practice ${input.allWeakestTopic.name} for 30 minutes — your recent results show this is currently your weakest topic.`,
      subjectId: input.allWeakestTopic.subject_id,
      topicId: input.allWeakestTopic.id,
    };
  }

  if (!input.hasAnySubjects) {
    return { text: "Add a subject and upload your first material to get a personalized study plan.", subjectId: null, topicId: null };
  }

  return { text: "Upload some material for one of your subjects so your AI coach can find what to focus on.", subjectId: null, topicId: null };
}
