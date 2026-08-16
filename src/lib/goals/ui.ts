import { CheckCircle2, LucideIcon, Pause, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { GoalStatus, GoalMeasurementType } from "@/lib/types";

export interface GoalStatusMeta {
  label: string;
  tone: "success" | "warning" | "danger" | "accent" | "neutral";
  icon: LucideIcon;
}

export const GOAL_STATUS_META: Record<GoalStatus, GoalStatusMeta> = {
  on_track: { label: "On track", tone: "success", icon: TrendingUp },
  at_risk: { label: "At risk", tone: "warning", icon: AlertTriangle },
  behind: { label: "Behind", tone: "danger", icon: TrendingDown },
  completed: { label: "Completed", tone: "accent", icon: CheckCircle2 },
  paused: { label: "Paused", tone: "neutral", icon: Pause },
};

export const GOAL_CATEGORY_SUGGESTIONS = ["Health", "Career", "Learning", "Finance", "Creative", "Relationships", "Personal"];

const CATEGORY_COLOR_KEYS = ["violet", "blue", "emerald", "amber", "rose", "fuchsia"] as const;
export function categoryColorKey(category: string | undefined): (typeof CATEGORY_COLOR_KEYS)[number] {
  if (!category) return CATEGORY_COLOR_KEYS[0];
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  return CATEGORY_COLOR_KEYS[hash % CATEGORY_COLOR_KEYS.length];
}

export interface GoalTemplate {
  id: string;
  icon: string;
  name: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high";
  difficulty: "easy" | "moderate" | "challenging" | "ambitious";
  measurementType: GoalMeasurementType;
  measurementUnit: string;
  measurementTarget?: number;
  milestones: { title: string; description?: string }[];
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: "run-5k",
    icon: "🏃",
    name: "Run a 5K",
    description: "Build up to running 5 kilometers without stopping.",
    category: "Health",
    priority: "medium",
    difficulty: "moderate",
    measurementType: "distance",
    measurementUnit: "km",
    measurementTarget: 5,
    milestones: [
      { title: "Run 1km without stopping" },
      { title: "Run 2.5km without stopping" },
      { title: "Complete a full 5km run" },
    ],
  },
  {
    id: "learn-language",
    icon: "🗣️",
    name: "Learn a new language",
    description: "Reach a conversational level in a new language.",
    category: "Learning",
    priority: "medium",
    difficulty: "challenging",
    measurementType: "streak",
    measurementUnit: "days practiced",
    measurementTarget: 30,
    milestones: [
      { title: "Learn 100 core words" },
      { title: "Hold a basic 2-minute conversation" },
      { title: "Watch a show without subtitles" },
    ],
  },
  {
    id: "save-money",
    icon: "💰",
    name: "Save money",
    description: "Build up savings toward a target amount.",
    category: "Finance",
    priority: "high",
    difficulty: "moderate",
    measurementType: "numeric",
    measurementUnit: "€",
    measurementTarget: 1000,
    milestones: [{ title: "Set a monthly savings amount" }, { title: "Reach the halfway point" }, { title: "Hit the full target" }],
  },
  {
    id: "read-books",
    icon: "📚",
    name: "Read more books",
    description: "Read a set number of books this year.",
    category: "Learning",
    priority: "low",
    difficulty: "easy",
    measurementType: "count",
    measurementUnit: "books",
    measurementTarget: 12,
    milestones: [{ title: "Finish the first book" }, { title: "Reach 6 books" }, { title: "Reach 12 books" }],
  },
  {
    id: "get-fit",
    icon: "💪",
    name: "Get stronger",
    description: "Build a consistent strength training habit.",
    category: "Health",
    priority: "medium",
    difficulty: "moderate",
    measurementType: "streak",
    measurementUnit: "workouts",
    measurementTarget: 20,
    milestones: [{ title: "Complete first week of training" }, { title: "Increase your main lifts" }, { title: "Reach 20 workouts total" }],
  },
  {
    id: "side-project",
    icon: "🚀",
    name: "Ship a side project",
    description: "Go from idea to a finished, shipped project.",
    category: "Career",
    priority: "high",
    difficulty: "ambitious",
    measurementType: "checklist",
    measurementUnit: "",
    milestones: [
      { title: "Define the scope" },
      { title: "Build the core feature" },
      { title: "Test with a few real users" },
      { title: "Launch it publicly" },
    ],
  },
  {
    id: "meditate",
    icon: "🧘",
    name: "Build a meditation habit",
    description: "Meditate consistently to build a daily habit.",
    category: "Health",
    priority: "low",
    difficulty: "easy",
    measurementType: "streak",
    measurementUnit: "days",
    measurementTarget: 21,
    milestones: [{ title: "Meditate 3 days in a row" }, { title: "Meditate 10 days in a row" }, { title: "Meditate 21 days in a row" }],
  },
  {
    id: "declutter",
    icon: "🏠",
    name: "Declutter your home",
    description: "Go room by room and clear out what you don't need.",
    category: "Personal",
    priority: "low",
    difficulty: "easy",
    measurementType: "checklist",
    measurementUnit: "",
    milestones: [{ title: "Declutter the bedroom" }, { title: "Declutter the living room" }, { title: "Declutter the kitchen" }, { title: "Donate or sell what's left over" }],
  },
  {
    id: "new-skill",
    icon: "🎯",
    name: "Learn a new skill",
    description: "Pick up a skill you've always wanted to learn.",
    category: "Learning",
    priority: "medium",
    difficulty: "moderate",
    measurementType: "time",
    measurementUnit: "hours practiced",
    measurementTarget: 50,
    milestones: [{ title: "Learn the fundamentals" }, { title: "Complete a real practice project" }, { title: "Reach a level you're proud of" }],
  },
];
