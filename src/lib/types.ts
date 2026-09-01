// Shared domain types for FutureOS. Kept in one file so every screen and
// API route agrees on the same shapes as the Supabase schema evolves.

export type Priority = "high" | "medium" | "low";
export type HomeworkStatus = "pending" | "completed";

export interface Profile {
  id: string;
  full_name: string;
  year_group: string;
  country: string;
  // Informational/analytics only — collected at onboarding, never used to
  // gate or change any feature/flow. See PROJECT_STATE.md Wave 4a for the
  // open CEO question on whether it should ever gate something.
  age: number | null;
  avatar_emoji: string;
  xp_school: number;
  xp_career: number;
  xp_skill: number;
  xp_project: number;
  streak_count: number;
  longest_streak: number;
  last_active_date: string | null;
  onboarding_completed: boolean;
  track: "student" | "business";
  billing_interval: "monthly" | "yearly" | null;
  plan: "free" | "plus";
  plan_status: "trialing" | "active" | "canceled" | "past_due";
  trial_ends_at: string;
  created_at: string;
}

export interface OnboardingResponse {
  user_id: string;
  year_group: string;
  country: string;
  school_name: string;
  curriculum_summary: string | null;
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

export interface ChatThread {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  last_message_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  thread_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export type BusinessStage = "idea" | "validating" | "building" | "launched";

export interface BusinessProfile {
  user_id: string;
  business_idea: string;
  stage: BusinessStage;
  target_customer: string;
  ai_snapshot: string | null;
  created_at: string;
}

export type MilestoneStatus = "todo" | "in_progress" | "done";

export interface BusinessMilestone {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  due_date: string | null;
  order_index: number;
  created_at: string;
}

export interface BusinessMetric {
  id: string;
  user_id: string;
  metric_key: string;
  value: number;
  logged_date: string;
  created_at: string;
}

export interface BusinessContentIdea {
  id: string;
  user_id: string;
  platform: string;
  topic: string;
  generated_content: string | null;
  status: "draft" | "used";
  created_at: string;
}

export interface BusinessCompetitor {
  id: string;
  user_id: string;
  name: string;
  url: string | null;
  notes: string | null;
  created_at: string;
}

export interface BusinessExpense {
  id: string;
  user_id: string;
  category: string;
  description: string | null;
  amount: number;
  logged_date: string;
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
