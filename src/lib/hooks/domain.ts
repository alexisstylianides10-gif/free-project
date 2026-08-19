"use client";

import { useTableRows } from "@/lib/hooks/useTableRows";
import type {
  Homework,
  Exam,
  TimetableEntry,
  StudySession,
  CareerPath,
  UserSkill,
  UserAchievement,
  UserMission,
  RoadmapProgress,
  ChatMessage,
} from "@/lib/types";

export function useHomework(userId?: string) {
  return useTableRows<Homework>("homework", userId, { orderBy: { column: "due_date", ascending: true } });
}

export function useExams(userId?: string) {
  return useTableRows<Exam>("exams", userId, { orderBy: { column: "exam_date", ascending: true } });
}

export function useTimetable(userId?: string) {
  return useTableRows<TimetableEntry>("timetable_entries", userId, { orderBy: { column: "start_time", ascending: true } });
}

export function useStudySessions(userId?: string, weekStart?: string) {
  return useTableRows<StudySession>("study_sessions", userId, {
    orderBy: { column: "day_of_week", ascending: true },
    eq: weekStart ? { week_start: weekStart } : undefined,
  });
}

export function useCareerPaths(userId?: string) {
  return useTableRows<CareerPath>("career_paths", userId, { orderBy: { column: "added_at", ascending: false } });
}

export function useUserSkills(userId?: string) {
  return useTableRows<UserSkill>("user_skills", userId);
}

export function useUserAchievements(userId?: string) {
  return useTableRows<UserAchievement>("user_achievements", userId, { orderBy: { column: "earned_at", ascending: false } });
}

export function useUserMissions(userId?: string) {
  return useTableRows<UserMission>("user_missions", userId, { orderBy: { column: "created_at", ascending: false } });
}

export function useRoadmapProgress(userId?: string) {
  return useTableRows<RoadmapProgress>("roadmap_progress", userId, { orderBy: { column: "level_number", ascending: true } });
}

export function useChatHistory(userId?: string) {
  return useTableRows<ChatMessage>("chat_messages", userId, { orderBy: { column: "created_at", ascending: true } });
}
