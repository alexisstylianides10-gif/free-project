import type { GoalStatus } from "@/lib/types";

export interface EventCardData {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string | null;
}

export interface TaskCardData {
  id: string;
  title: string;
  dueDate?: string | null;
  priority?: string;
  done: boolean;
}

export interface GoalProgressCardData {
  id: string;
  name: string;
  icon: string;
  progressPct: number;
  status: GoalStatus;
  nextMilestone?: string | null;
  targetDate?: string | null;
}

export interface DocumentCardData {
  id: string;
  name: string;
  mimeType: string;
  summary: string;
  category?: string | null;
  nearestDeadline?: { label: string; date: string } | null;
}

export interface ShoppingItemCardData {
  id: string;
  name: string;
  quantity?: string | null;
  done: boolean;
}

export interface DailyBriefingCardData {
  eventsCount: number;
  tasksRemaining: number;
  goalsPriorityCount: number;
  deadlinesUpcoming: number;
  recommendedFocus: string | null;
}

export type ResponseCard =
  | { type: "event"; heading?: string; events: EventCardData[] }
  | { type: "taskList"; heading?: string; tasks: TaskCardData[] }
  | { type: "goalProgress"; goals: GoalProgressCardData[] }
  | { type: "document"; documents: DocumentCardData[] }
  | { type: "shoppingList"; heading?: string; items: ShoppingItemCardData[] }
  | { type: "dailyBriefing"; briefing: DailyBriefingCardData };
