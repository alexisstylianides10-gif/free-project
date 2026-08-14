export type Priority = "critical" | "high" | "medium" | "low";

export type LifeArea = "school" | "home" | "work" | "health" | "social" | "travel" | "personal";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  done: boolean;
  dueDate?: string; // ISO date
  priority: Priority;
  estimatedMinutes?: number;
  category: LifeArea;
  project?: string;
  recurring: "daily" | "weekly" | "none";
  subtasks: Subtask[];
  aiContext?: string;
  createdAt: string;
  completedAt?: string;
}

export type EventType = "school" | "health" | "social" | "study" | "work" | "personal" | "travel";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date (yyyy-MM-dd)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  type: EventType;
  location?: string;
  notes?: string;
  timezone: string;
  recurrence: "none" | "daily" | "weekly";
  recurrenceUntil?: string;
  linkedTaskId?: string;
  aiGenerated?: boolean;
  movable: boolean;
}

export type MemoryCategory =
  | "Preferences"
  | "Important dates"
  | "People"
  | "Routines"
  | "Facts";

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  content: string;
  reason: string;
  source: "user" | "ai";
  createdAt: string;
  active: boolean;
}

export type AgentStatus = "active" | "coming_soon";

export interface AgentCatalogEntry {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  icon: string;
  tools: string[];
}

export type ToolAction = "create" | "update" | "delete" | "complete";

export interface PendingActionCard {
  id: string;
  tool: string;
  action: ToolAction;
  summary: string;
  args: Record<string, unknown>;
  status: "pending" | "confirmed" | "cancelled" | "expired" | "failed";
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  toolCalls: { tool: string; status: "success" | "failed" }[];
  pendingAction?: PendingActionCard | null;
  resolvedAction?: (PendingActionCard & { resultSummary: string }) | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  kind: "deadline" | "schedule" | "system";
}

export type ActivityStatus = "SUCCESS" | "FAILED" | "CANCELLED";

export interface ActivityEntry {
  id: string;
  tool: string;
  action: string;
  status: ActivityStatus;
  metadata: Record<string, unknown>;
  eventId?: string;
  createdAt: string;
}

export type Plan = "Free" | "Pro" | "Max";

export interface NotificationPrefs {
  deadlines: boolean;
  scheduleGaps: boolean;
  dailyBriefing: boolean;
}

export interface Profile {
  name: string;
  email: string;
  timezone: string;
  location: string;
  avatarInitials: string;
  plan: Plan;
  theme: "light" | "dark" | "system";
  memoryEnabled: boolean;
  notificationPrefs: NotificationPrefs;
  onboarded: boolean;
  aiMessagesUsed: number;
  aiTokensUsed: number;
  usagePeriodStart: string;
  proInterestAt?: string | null;
}
