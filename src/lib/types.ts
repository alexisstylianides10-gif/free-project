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
  /** Set when this conversation is a Business Coach chat scoped to one business. */
  businessId?: string;
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
  trialStart?: string | null;
  trialEnd?: string | null;
  trialStatus: "none" | "active" | "converted" | "expired" | "canceled";
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd?: string | null;
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

export type GoalKind = "personal" | "business";

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
  kind: GoalKind;
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

// ---------------------------------------------------------------------------
// Business Builder — specialized data for goals with kind: "business"
// ---------------------------------------------------------------------------

export type BusinessStage = "idea" | "validation" | "business_model" | "build" | "launch" | "first_customers" | "grow" | "scale";
export type BusinessStatus = "building" | "paused" | "archived";
export type BusinessRevenueModel = "one_time" | "subscription" | "usage" | "commission" | "marketplace" | "freemium" | "service" | "other";

export interface Business {
  id: string;
  goalId: string;
  name: string;
  ideaSummary: string;
  problem: string;
  solution: string;
  targetCustomer: string;
  valueProposition: string;
  pricingNotes: string;
  distributionNotes: string;
  marketingNotes: string;
  operationsNotes: string;
  costsNotes: string;
  stage: BusinessStage;
  status: BusinessStatus;
  revenueModel?: BusinessRevenueModel;
  price?: number;
  pricePeriod?: string;
  targetCustomerCount?: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessMilestone {
  id: string;
  businessId: string;
  stage: BusinessStage;
  title: string;
  description: string;
  done: boolean;
  sortOrder: number;
  targetDate?: string;
  createdAt: string;
  completedAt?: string;
}

export interface BusinessMetricEntry {
  id: string;
  businessId: string;
  recordedAt: string;
  revenue?: number;
  expenses?: number;
  customers?: number;
  mrr?: number;
  orders?: number;
  conversionRate?: number;
  visitors?: number;
  leads?: number;
  trials?: number;
  note: string;
  createdAt: string;
}

export type BusinessExperimentStatus = "planned" | "running" | "completed";

export interface BusinessExperiment {
  id: string;
  businessId: string;
  question: string;
  hypothesis: string;
  testDescription: string;
  status: BusinessExperimentStatus;
  result: string;
  conclusion: string;
  createdAt: string;
  completedAt?: string;
}

export type BusinessCustomerStage = "lead" | "interviewed" | "trial" | "customer" | "churned";

export interface BusinessCustomer {
  id: string;
  businessId: string;
  name: string;
  stage: BusinessCustomerStage;
  notes: string;
  createdAt: string;
}

export type BusinessFeedbackKind = "pain_point" | "feature_request" | "objection" | "praise" | "other";

export interface BusinessFeedback {
  id: string;
  businessId: string;
  customerId?: string;
  kind: BusinessFeedbackKind;
  content: string;
  createdAt: string;
}

export type BusinessInsightKind = "decision" | "risk" | "opportunity";
export type BusinessInsightStatus = "open" | "accepted" | "ignored" | "resolved";

export interface BusinessInsight {
  id: string;
  businessId: string;
  kind: BusinessInsightKind;
  title: string;
  rationale: string;
  evidence: string;
  suggestedAction: string;
  status: BusinessInsightStatus;
  createdAt: string;
  resolvedAt?: string;
}

export type BusinessMissionStatus = "pending" | "started" | "completed" | "skipped";

export interface BusinessMission {
  id: string;
  businessId: string;
  title: string;
  missionDate: string;
  status: BusinessMissionStatus;
  linkedTaskId?: string;
  createdAt: string;
  completedAt?: string;
}

export type BusinessContentStatus = "idea" | "draft" | "published";

export interface BusinessContentIdea {
  id: string;
  businessId: string;
  idea: string;
  platform: string;
  status: BusinessContentStatus;
  result: string;
  createdAt: string;
}

export interface BusinessCompetitor {
  id: string;
  businessId: string;
  name: string;
  product: string;
  targetCustomer: string;
  pricing: string;
  strengths: string;
  weaknesses: string;
  positioning: string;
  source: "ai_research" | "manual";
  createdAt: string;
}

export interface BusinessActivityEntry {
  id: string;
  businessId: string;
  kind: string;
  description: string;
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
  /** The date `done` was last set true — a step only reads as "done today" when this equals today. */
  lastCompletedDate?: string;
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

export interface Flashcard {
  front: string;
  back: string;
}

export interface FlashcardDeck {
  id: string;
  subjectId?: string;
  sourceNoteId?: string;
  title: string;
  cards: Flashcard[];
  createdAt: string;
}

export interface QuizQuestion {
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  topic?: string;
}

export interface StudyQuiz {
  id: string;
  subjectId?: string;
  sourceNoteId?: string;
  title: string;
  questions: QuizQuestion[];
  createdAt: string;
}

export interface QuizAnswer {
  question: string;
  givenAnswer: string;
  correct: boolean;
  topic?: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  answers: QuizAnswer[];
  score: number;
  weakTopics: string[];
  completedAt: string;
}

export interface StudentProfile {
  schoolName: string;
  country: string;
  educationLevel: string;
  termStartDate?: string;
  researchSummary?: string;
  researchedAt?: string;
}
