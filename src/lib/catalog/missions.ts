export type MissionCategory = "school" | "skill" | "career" | "business" | "creative";
export type MissionDifficulty = "easy" | "medium" | "hard";

export interface Mission {
  id: string;
  category: MissionCategory;
  title: string;
  description: string;
  difficulty: MissionDifficulty;
  minutes: number;
  xp: number;
  /** Skill key(s) (from onboarding-options STRENGTH_OPTIONS) this mission builds. */
  skillKeys?: string[];
}

export const MISSIONS: Mission[] = [
  // School missions — real study accomplishments, not app-usage streaks.
  {
    id: "school-30min-revision",
    category: "school",
    title: "Complete 30 minutes of focused revision",
    description: "Pick your weakest topic from School and revise it with no distractions for 30 minutes.",
    difficulty: "easy",
    minutes: 30,
    xp: 50,
    skillKeys: ["organisation"],
  },
  {
    id: "school-past-paper",
    category: "school",
    title: "Complete one past-paper question set",
    description: "Find a past paper or practice set for an upcoming exam and complete it under timed conditions.",
    difficulty: "medium",
    minutes: 45,
    xp: 80,
    skillKeys: ["problem_solving"],
  },
  {
    id: "school-summarise-topic",
    category: "school",
    title: "Summarise a topic in your own words",
    description: "Turn one lesson's notes into a one-page summary you could teach to a friend.",
    difficulty: "easy",
    minutes: 20,
    xp: 40,
    skillKeys: ["writing"],
  },

  // Skill missions
  {
    id: "skill-coding-concept",
    category: "skill",
    title: "Learn a new coding concept",
    description: "Watch or read one short lesson on a coding concept you don't know yet, then write 5 lines using it.",
    difficulty: "easy",
    minutes: 25,
    xp: 75,
    skillKeys: ["coding"],
  },
  {
    id: "skill-public-speaking",
    category: "skill",
    title: "Practice explaining an idea out loud",
    description: "Record a 60-second voice memo explaining something you learned this week, as if teaching someone else.",
    difficulty: "easy",
    minutes: 15,
    xp: 50,
    skillKeys: ["communication"],
  },
  {
    id: "skill-design-basics",
    category: "skill",
    title: "Learn one design principle",
    description: "Look up one design principle (e.g. contrast, hierarchy) and find 3 examples of it in apps you use.",
    difficulty: "easy",
    minutes: 20,
    xp: 60,
    skillKeys: ["creativity"],
  },

  // Career missions
  {
    id: "career-research",
    category: "career",
    title: "Research a career in depth",
    description: "Pick one career match and research a typical day, salary range, and required education.",
    difficulty: "easy",
    minutes: 20,
    xp: 50,
    skillKeys: ["organisation"],
  },
  {
    id: "career-shadow-conversation",
    category: "career",
    title: "Talk to someone in a career you're curious about",
    description: "Ask a parent, teacher, or family friend about their job: what they actually do day to day.",
    difficulty: "medium",
    minutes: 20,
    xp: 70,
    skillKeys: ["communication", "working_with_people"],
  },
  {
    id: "career-linkedin-explore",
    category: "career",
    title: "Explore 3 real job postings",
    description: "Look up 3 real job listings in a field you're interested in and note the skills they ask for.",
    difficulty: "easy",
    minutes: 15,
    xp: 45,
  },

  // Business missions
  {
    id: "business-find-problems",
    category: "business",
    title: "Find 5 problems customers have",
    description: "Talk to or observe people around you and write down 5 real problems they complain about.",
    difficulty: "medium",
    minutes: 30,
    xp: 100,
    skillKeys: ["problem_solving", "communication"],
  },
  {
    id: "business-one-pager",
    category: "business",
    title: "Write a one-page business idea",
    description: "Pick one problem you found and write a one-page plan: who has it, and how you'd solve it.",
    difficulty: "medium",
    minutes: 30,
    xp: 90,
    skillKeys: ["writing", "organisation"],
  },
  {
    id: "business-pitch-practice",
    category: "business",
    title: "Pitch your idea to someone",
    description: "Explain your idea out loud to a friend or family member in under 2 minutes and get their honest reaction.",
    difficulty: "hard",
    minutes: 20,
    xp: 90,
    skillKeys: ["selling", "communication"],
  },

  // Creative missions
  {
    id: "creative-portfolio-piece",
    category: "creative",
    title: "Create your first portfolio piece",
    description: "Make one small creative piece (design, video, writing, or code) you'd be proud to show someone.",
    difficulty: "hard",
    minutes: 60,
    xp: 100,
    skillKeys: ["creativity", "building_things"],
  },
  {
    id: "creative-short-video",
    category: "creative",
    title: "Film and edit a short video",
    description: "Plan, film, and edit a video under 60 seconds on a topic you care about.",
    difficulty: "medium",
    minutes: 45,
    xp: 85,
    skillKeys: ["video_editing", "creativity"],
  },
  {
    id: "creative-study-inspiration",
    category: "creative",
    title: "Study 3 creators or designers you admire",
    description: "Break down what makes 3 pieces of creative work (channels, designs, brands) effective.",
    difficulty: "easy",
    minutes: 20,
    xp: 55,
    skillKeys: ["creativity"],
  },
];

export function getMission(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}

export function missionsByCategory(category: MissionCategory): Mission[] {
  return MISSIONS.filter((m) => m.category === category);
}
