"use client";

import { useEffect, useState } from "react";
import { useTableRows } from "@/lib/hooks/useTableRows";
import { supabase } from "@/lib/supabase/client";
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
  ChatThread,
  BusinessProfile,
  BusinessMilestone,
  BusinessMetric,
  BusinessContentIdea,
  BusinessCompetitor,
  BusinessExpense,
  OnboardingResponse,
} from "@/lib/types";

export function useHomework(userId?: string) {
  return useTableRows<Homework>("homework", userId, { orderBy: { column: "due_date", ascending: true } });
}

/** One row per user — used to surface the AI-researched curriculum summary
 * from onboarding (School tab), which was previously written but never
 * displayed anywhere. */
export function useOnboardingResponse(userId?: string) {
  const { data, ...rest } = useTableRows<OnboardingResponse>("onboarding_responses", userId);
  return { data: data[0] ?? null, ...rest };
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

export function useChatThreads(userId?: string) {
  return useTableRows<ChatThread>("chat_threads", userId, { orderBy: { column: "last_message_at", ascending: false } });
}

export function useChatHistory(userId?: string, threadId?: string) {
  return useTableRows<ChatMessage>("chat_messages", userId, {
    orderBy: { column: "created_at", ascending: true },
    eq: threadId ? { thread_id: threadId } : undefined,
  });
}

/** Fetches the founder's single business_profiles row, if any — same
 * single-row-fetch pattern as useOnboardingResponse. */
export function useBusinessProfile(userId?: string) {
  const [data, setData] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !userId) {
        if (active) {
          setData(null);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      const { data: row } = await supabase.from("business_profiles").select("*").eq("user_id", userId).maybeSingle();
      if (active) {
        setData((row as BusinessProfile | null) ?? null);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [userId]);

  return { data, loading };
}

export function useBusinessMilestones(userId?: string) {
  return useTableRows<BusinessMilestone>("business_milestones", userId, { orderBy: { column: "order_index", ascending: true } });
}

export function useBusinessMetrics(userId?: string) {
  // Secondary `created_at` tiebreaker: `logged_date` is day-granularity, so
  // two entries of the same metric_key logged the same day would otherwise
  // sort in an unspecified/unstable order, breaking BusinessGrowHome's
  // "latest vs prior" trend badge for that metric.
  return useTableRows<BusinessMetric>("business_metrics", userId, {
    orderBy: [
      { column: "logged_date", ascending: false },
      { column: "created_at", ascending: false },
    ],
  });
}

export function useBusinessContentIdeas(userId?: string) {
  return useTableRows<BusinessContentIdea>("business_content_ideas", userId, { orderBy: { column: "created_at", ascending: false } });
}

export function useBusinessCompetitors(userId?: string) {
  return useTableRows<BusinessCompetitor>("business_competitors", userId, { orderBy: { column: "created_at", ascending: false } });
}

export function useBusinessExpenses(userId?: string) {
  return useTableRows<BusinessExpense>("business_expenses", userId, { orderBy: { column: "logged_date", ascending: false } });
}
