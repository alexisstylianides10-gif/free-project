import { Award, Rocket, Laptop, Target, Flame, BookOpen, PenLine, GraduationCap, Brain, type LucideIcon } from "lucide-react";

// Icons are lucide-react components, not emoji (spec §9: one icon system
// app-wide). These are a fixed, non-user-chosen catalog of 9 badges — unlike
// `study_subjects.icon`, which IS a real user-picked emoji and stays that
// way (see src/app/app/school/subjects/page.tsx).
export interface AchievementDef {
  key: string;
  icon: LucideIcon;
  title: string;
  description: string;
  track?: "student"; // absent = shown on both tracks; only ever set to "student" today (no business-only achievement exists yet)
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first_study_session", icon: Award, title: "First Study Session", description: "Completed your first study session.", track: "student" },
  { key: "first_career_mission", icon: Rocket, title: "First Career Mission", description: "Completed your first career mission." },
  { key: "first_project", icon: Laptop, title: "First Project", description: "Built your first real project." },
  { key: "career_path_chosen", icon: Target, title: "Career Path Chosen", description: "Added a career to your path." },
  { key: "streak_7", icon: Flame, title: "7 Day Streak", description: "Stayed consistent for 7 days in a row." },
  { key: "study_sessions_10", icon: BookOpen, title: "10 Study Sessions", description: "Completed 10 study sessions.", track: "student" },
  { key: "first_quiz", icon: PenLine, title: "First Quiz", description: "Completed your first AI-generated quiz.", track: "student" },
  { key: "first_mock_exam", icon: GraduationCap, title: "First Mock Exam", description: "Completed your first full mock exam.", track: "student" },
  { key: "flashcards_mastered_20", icon: Brain, title: "Flashcard Master", description: "Mastered 20 flashcards through spaced repetition.", track: "student" },
];

export function getAchievement(key: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.key === key);
}
