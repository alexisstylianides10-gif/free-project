export type Priority = "critical" | "high" | "medium" | "low";

export type LifeArea =
  | "school"
  | "home"
  | "work"
  | "health"
  | "finance"
  | "social"
  | "travel"
  | "personal";

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
  goalId?: string;
  recurring?: "daily" | "weekly" | "none";
  subtasks: Subtask[];
  aiContext?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date (yyyy-MM-dd)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  type: "school" | "health" | "social" | "study" | "work" | "personal" | "travel";
  location?: string;
  linkedTaskId?: string;
  linkedGoalId?: string;
  aiGenerated?: boolean;
  movable?: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
}

export interface Goal {
  id: string;
  name: string;
  why: string;
  progress: number; // 0-100
  deadline?: string;
  category: LifeArea;
  milestones: Milestone[];
  linkedTaskIds: string[];
  linkedHabitIds: string[];
  aiPlan: string;
  archived?: boolean;
}

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  targetPerWeek: number;
  history: Record<string, boolean>; // ISO date -> completed
  bestStreak: number;
  aiNote?: string;
}

export type TxCategory =
  | "Food"
  | "Transport"
  | "Shopping"
  | "Entertainment"
  | "Subscriptions"
  | "School"
  | "Other";

export interface Transaction {
  id: string;
  merchant: string;
  amount: number; // negative = expense, positive = income
  date: string;
  category: TxCategory;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  renewsOn: string;
  category: TxCategory;
}

export interface Budget {
  category: TxCategory;
  limit: number;
}

export interface DocumentTag {
  id: string;
  label: string;
}

export interface LifeDocument {
  id: string;
  name: string;
  kind: "pdf" | "docx" | "image" | "text";
  folder: string;
  tags: string[];
  sizeKb: number;
  uploadedAt: string;
  aiSummary?: string;
  extractedDates?: { label: string; date: string }[];
}

export interface ListItem {
  id: string;
  label: string;
  done: boolean;
}

export interface LifeList {
  id: string;
  name: string;
  emoji: string;
  items: ListItem[];
  kind: "shopping" | "packing" | "wishlist" | "custom";
}

export type MemoryCategory =
  | "Personal"
  | "Preferences"
  | "Goals"
  | "People"
  | "Projects"
  | "Important dates"
  | "Routines"
  | "Past decisions";

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  content: string;
  reason: string;
  source: string;
  createdAt: string;
  active: boolean;
}

export type AgentCategory =
  | "Productivity"
  | "Finance"
  | "School"
  | "Travel"
  | "Communication"
  | "Shopping"
  | "Business"
  | "Personal";

export interface AgentRun {
  id: string;
  ranAt: string;
  summary: string;
  status: "success" | "needs_approval" | "failed";
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
  capabilities: string[];
  permissions: string[];
  connectedServices: string[];
  installed: boolean;
  active: boolean;
  runHistory: AgentRun[];
  icon: string;
}

export type ActionKind =
  | "create_event"
  | "create_task"
  | "add_list_item"
  | "create_reminder"
  | "create_goal"
  | "add_expense";

export interface PendingAction {
  id: string;
  kind: ActionKind;
  title: string;
  detail: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  createdAt: string;
  actions?: PendingAction[];
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  kind: "deadline" | "finance" | "schedule" | "goal" | "system";
}

export type ProactivityLevel = "low" | "balanced" | "high";

export interface NotificationPrefs {
  deadlines: boolean;
  financeAlerts: boolean;
  scheduleGaps: boolean;
  goalNudges: boolean;
}

export interface Profile {
  name: string;
  email: string;
  timezone: string;
  location: string;
  avatarInitials: string;
  plan: "Free" | "Pro" | "Ultra";
  proactivity: ProactivityLevel;
  theme: "light" | "dark" | "system";
  memoryEnabled: boolean;
  notificationPrefs: NotificationPrefs;
}
