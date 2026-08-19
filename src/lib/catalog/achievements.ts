export interface AchievementDef {
  key: string;
  icon: string;
  title: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first_study_session", icon: "🏅", title: "First Study Session", description: "Completed your first study session." },
  { key: "first_career_mission", icon: "🚀", title: "First Career Mission", description: "Completed your first career mission." },
  { key: "first_project", icon: "💻", title: "First Project", description: "Built your first real project." },
  { key: "career_path_chosen", icon: "🎯", title: "Career Path Chosen", description: "Added a career to your path." },
  { key: "streak_7", icon: "🔥", title: "7 Day Streak", description: "Stayed consistent for 7 days in a row." },
  { key: "study_sessions_10", icon: "📚", title: "10 Study Sessions", description: "Completed 10 study sessions." },
];

export function getAchievement(key: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.key === key);
}
