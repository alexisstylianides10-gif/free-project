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
  /** Set when this task was created from a goal's Quick Actions (Add task). */
  goalId?: string;
  /** Set when this task was created from a document's extracted requirements. */
  documentId?: string;
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
  /** Whether this row originated in Alxioum or was pulled in from Google Calendar. */
  source: "alxioum" | "google";
  /** Set when this event is linked to a Google Calendar event (either pulled in, or pushed out from Alxioum). */
  googleEventId?: string;
  /** Set when this event was scheduled from a goal's Quick Actions (Schedule time). */
  linkedGoalId?: string;
  /** Set when this event was created from a document's extracted dates. */
  linkedDocumentId?: string;
}

export interface CalendarConnection {
  connected: true;
  googleCalendarId: string;
  connectedAt: string;
  lastSyncedAt?: string;
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
  status: "pending" | "confirmed" | "cancelled" | "expired" | "failed" | "superseded";
}

export interface ResolvedActionCard extends PendingActionCard {
  resultSummary: string;
  /** The tool's raw execute() result — only kept server-side/round-tripped for Undo to locate the created entity's id; not required for display. */
  result?: unknown;
  /** The created entity rendered the same way a normal response card would be, e.g. the new event/task. */
  cards?: import("./ai/cards").ResponseCard[];
  /** True once the user has pressed Undo on this resolved action. */
  undone?: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  toolCalls: { tool: string; status: "success" | "failed" }[];
  pendingAction?: PendingActionCard | null;
  resolvedAction?: ResolvedActionCard | null;
  /** Structured rendering data (event/task/goal/document/shopping cards) alongside the prose reply. */
  cards?: import("./ai/cards").ResponseCard[];
  /** Clickable disambiguation options from chat_present_choices — clicking one sends its value as the next user message. Not persisted; only present on the just-returned turn. */
  choices?: { label: string; value: string }[] | null;
  createdAt: string;
  /** Client-only, not persisted: local preview of an image attached to this message. */
  imagePreviewUrl?: string;
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

export type Plan = "Free" | "Student" | "Pro" | "Max";

export interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
}

export interface FocusSession {
  id: string;
  subjectId?: string;
  taskId?: string;
  plannedMinutes: number;
  actualMinutes: number;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

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
  creditsInterestAt?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionStatus?: string | null;
  creditsBalance: number;
}

export type ShoppingListKind = "grocery" | "general" | "wishlist";

export interface ShoppingList {
  id: string;
  name: string;
  kind: ShoppingListKind;
  createdAt: string;
}

export interface ShoppingItem {
  id: string;
  listId: string;
  name: string;
  quantity?: string;
  category?: string;
  done: boolean;
  createdAt: string;
}

export type GoalPriority = "low" | "medium" | "high";
export type GoalDifficulty = "easy" | "moderate" | "challenging" | "ambitious";
export type GoalMeasurementType = "numeric" | "distance" | "count" | "streak" | "time" | "checklist";
/** Always computed (src/lib/goals/status.ts), never stored as truth — see Goal.paused for the one persisted state. */
export type GoalStatus = "on_track" | "at_risk" | "behind" | "completed" | "paused";

export interface Goal {
  id: string;
  name: string;
  description: string;
  targetDate?: string;
  progress: number;
  completed: boolean;
  createdAt: string;
  icon: string;
  category?: string;
  priority: GoalPriority;
  difficulty: GoalDifficulty;
  paused: boolean;
  measurementType: GoalMeasurementType;
  measurementUnit: string;
  measurementTarget?: number;
  measurementCurrent: number;
}

export interface GoalMilestone {
  id: string;
  goalId: string;
  title: string;
  done: boolean;
  sortOrder: number;
  createdAt: string;
  description: string;
  targetDate?: string;
  measurementTarget?: number;
  measurementCurrent?: number;
}

export interface GoalAction {
  id: string;
  goalId: string;
  title: string;
  frequencyPerWeek: number;
  durationMinutes?: number;
  createdAt: string;
}

export interface GoalActionLog {
  id: string;
  goalActionId: string;
  logDate: string;
  createdAt: string;
}

export interface GoalActivityEntry {
  id: string;
  goalId: string;
  kind: string;
  description: string;
  createdAt: string;
}

export interface GoalCoachMessage {
  id: string;
  goalId: string;
  role: "user" | "assistant";
  content: string;
  proposedAdjustment?: Record<string, unknown> | null;
  createdAt: string;
}

export interface Routine {
  id: string;
  name: string;
  frequency: string;
  createdAt: string;
}

export interface RoutineStep {
  id: string;
  routineId: string;
  title: string;
  timeLabel?: string;
  done: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface WeeklyReview {
  id: string;
  weekStart: string;
  stats: Record<string, unknown>;
  createdAt: string;
}

export type DocumentProcessingStatus = "uploading" | "processing" | "analyzing" | "ready" | "needs_review" | "error";

export interface Document {
  id: string;
  name: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  summary: string;
  createdAt: string;
  category?: string;
  tags: string[];
  starred: boolean;
  collectionId?: string;
  processingStatus: DocumentProcessingStatus;
  processingError?: string;
  extractedText?: string;
  linkedGoalId?: string;
  lastOpenedAt?: string;
  /** Structured fields from AI analysis — only populated when genuinely present in the document. */
  documentType?: string;
  people: string[];
  organizations: string[];
  amounts: { label: string; value: string; currency?: string }[];
  locations: string[];
  keyTopics: string[];
  suggestedCategory?: string;
}

export interface DocumentCollection {
  id: string;
  name: string;
  createdAt: string;
}

export type DocumentDateKind = "deadline" | "event" | "other";

export interface DocumentDate {
  id: string;
  documentId: string;
  label: string;
  date: string;
  kind: DocumentDateKind;
  description: string;
  addedToCalendarEventId?: string;
  createdAt: string;
}

export interface DocumentTask {
  id: string;
  documentId: string;
  title: string;
  description: string;
  createdTaskId?: string;
  createdAt: string;
}

export interface DocumentActivityEntry {
  id: string;
  documentId: string;
  kind: string;
  description: string;
  createdAt: string;
}

export interface DocumentChatMessage {
  id: string;
  documentId: string;
  role: "user" | "assistant";
  content: string;
  sourcePage?: number;
  createdAt: string;
}

export interface StudyNote {
  id: string;
  subjectId?: string;
  title: string;
  content: string;
  sourceInput: string;
  createdAt: string;
}

export interface StudentProfile {
  schoolName: string;
  country: string;
  educationLevel: string;
  termStartDate?: string;
  researchSummary?: string;
  researchedAt?: string;
}
