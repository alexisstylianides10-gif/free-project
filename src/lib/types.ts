// Shared domain types for FutureOS. Kept in one file so every screen and
// API route agrees on the same shapes as the Supabase schema evolves.

export type Priority = "high" | "medium" | "low";
export type HomeworkStatus = "pending" | "completed";

export interface Profile {
  id: string;
  full_name: string;
  year_group: string;
  country: string;
  avatar_emoji: string;
  xp_school: number;
  xp_career: number;
  xp_skill: number;
  xp_project: number;
  streak_count: number;
  longest_streak: number;
  last_active_date: string | null;
  onboarding_completed: boolean;
  created_at: string;
}

export interface OnboardingResponse {
  user_id: string;
  year_group: string;
  country: string;
  subjects: string[];
  interests: string[];
  strengths: string[];
  explore_goals: string[];
  free_time: string;
  biggest_goal: string;
  biggest_problem: string;
  top_matches: CareerMatchResult[];
  created_at: string;
}

export interface CareerMatchResult {
  slug: string;
  percent: number;
}

export interface Homework {
  id: string;
  user_id: string;
  subject: string;
  title: string;
  due_date: string;
  priority: Priority;
  status: HomeworkStatus;
  created_at: string;
}

export interface Exam {
  id: string;
  user_id: string;
  subject: string;
  title: string;
  exam_date: string;
  study_subject_id: string | null;
  created_at: string;
}

export interface TimetableEntry {
  id: string;
  user_id: string;
  day_of_week: number; // 0 = Sunday .. 6 = Saturday
  start_time: string; // "HH:MM"
  end_time: string;
  subject: string;
  room: string | null;
}

export interface StudySession {
  id: string;
  user_id: string;
  week_start: string;
  day_of_week: number;
  subject: string;
  duration_min: number;
  completed: boolean;
}

export interface CareerPath {
  id: string;
  user_id: string;
  career_slug: string;
  match_percent: number;
  is_primary: boolean;
  added_at: string;
}

export interface RoadmapProgress {
  user_id: string;
  level_number: number;
  unlocked: boolean;
  completed_at: string | null;
}

export type MissionCategory = "school" | "skill" | "career" | "business" | "creative";
export type MissionStatus = "available" | "active" | "completed";

export interface UserMission {
  id: string;
  user_id: string;
  mission_id: string;
  status: MissionStatus;
  xp_awarded: number;
  completed_at: string | null;
  created_at: string;
}

export interface UserSkill {
  user_id: string;
  skill_key: string;
  proficiency: number; // 0-100
  updated_at: string;
}

export interface UserAchievement {
  user_id: string;
  achievement_key: string;
  earned_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface WeeklyReview {
  id: string;
  user_id: string;
  week_start: string;
  assignments_completed: number;
  study_minutes: number;
  missions_completed: number;
  consistency_days: number;
  skill_deltas: Record<string, number>;
  next_focus: string[];
  created_at: string;
}
