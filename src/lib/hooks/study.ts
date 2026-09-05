"use client";

import { useTableRows } from "@/lib/hooks/useTableRows";
import type {
  StudySubject,
  StudyMaterial,
  StudyTopic,
  StudyPlan,
  StudyPlanItem,
  StudyFocusSession,
  StudyQuiz,
  StudyQuizAttempt,
  StudyFlashcard,
  StudyTutorMessage,
} from "@/lib/study/types";

export function useStudySubjects(userId?: string) {
  return useTableRows<StudySubject>("study_subjects", userId, { orderBy: { column: "created_at", ascending: true } });
}

export function useStudyMaterials(userId?: string, subjectId?: string) {
  return useTableRows<StudyMaterial>("study_materials", userId, {
    orderBy: { column: "created_at", ascending: false },
    eq: subjectId ? { subject_id: subjectId } : undefined,
  });
}

export function useStudyTopics(userId?: string, subjectId?: string) {
  return useTableRows<StudyTopic>("study_topics", userId, {
    orderBy: { column: "mastery", ascending: true },
    eq: subjectId ? { subject_id: subjectId } : undefined,
  });
}

export function useStudyPlans(userId?: string, subjectId?: string) {
  return useTableRows<StudyPlan>("study_plans", userId, {
    orderBy: { column: "created_at", ascending: false },
    eq: subjectId ? { subject_id: subjectId } : undefined,
  });
}

export function useStudyPlanItems(userId?: string, planId?: string) {
  return useTableRows<StudyPlanItem>("study_plan_items", userId, {
    orderBy: { column: "day_index", ascending: true },
    eq: planId ? { plan_id: planId } : undefined,
  });
}

export function useStudyFocusSessions(userId?: string) {
  return useTableRows<StudyFocusSession>("study_focus_sessions", userId, { orderBy: { column: "created_at", ascending: false } });
}

export function useStudyQuizzes(userId?: string, subjectId?: string) {
  return useTableRows<StudyQuiz>("study_quizzes", userId, {
    orderBy: { column: "created_at", ascending: false },
    eq: subjectId ? { subject_id: subjectId } : undefined,
  });
}

export function useStudyQuizAttempts(userId?: string) {
  return useTableRows<StudyQuizAttempt>("study_quiz_attempts", userId, { orderBy: { column: "created_at", ascending: false } });
}

export function useStudyFlashcards(userId?: string, subjectId?: string) {
  return useTableRows<StudyFlashcard>("study_flashcards", userId, {
    orderBy: { column: "due_date", ascending: true },
    eq: subjectId ? { subject_id: subjectId } : undefined,
  });
}

export function useStudyTutorMessages(userId?: string, subjectId?: string) {
  return useTableRows<StudyTutorMessage>("study_tutor_messages", userId, {
    orderBy: { column: "created_at", ascending: true },
    eq: subjectId ? { subject_id: subjectId } : undefined,
  });
}
