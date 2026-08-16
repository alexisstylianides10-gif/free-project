import { supabase } from "./supabase/client";
import {
  ActivityEntry,
  AppNotification,
  CalendarEvent,
  Conversation,
  FocusSession,
  Document,
  DocumentCollection,
  DocumentDate,
  DocumentDateKind,
  DocumentTask,
  DocumentActivityEntry,
  DocumentChatMessage,
  Goal,
  GoalMilestone,
  GoalAction,
  GoalActionLog,
  GoalActivityEntry,
  GoalCoachMessage,
  MemoryItem,
  Profile,
  Routine,
  RoutineStep,
  ShoppingItem,
  ShoppingList,
  StudentProfile,
  StudyNote,
  Subject,
  Task,
  WeeklyReview,
} from "./types";

function client() {
  if (!supabase) throw new Error("Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).");
  return supabase;
}

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------

interface ProfileRow {
  name: string;
  email: string;
  timezone: string;
  location: string;
  avatar_initials: string;
  plan: Profile["plan"];
  theme: Profile["theme"];
  memory_enabled: boolean;
  notification_prefs: Profile["notificationPrefs"];
  onboarded: boolean;
  ai_messages_used: number;
  ai_tokens_used: number;
  usage_period_start: string;
  pro_interest_at: string | null;
  credits_interest_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_status: string | null;
  credits_balance: number;
}

function profileFromRow(r: ProfileRow): Profile {
  return {
    name: r.name,
    email: r.email,
    timezone: r.timezone,
    location: r.location,
    avatarInitials: r.avatar_initials,
    plan: r.plan,
    theme: r.theme,
    memoryEnabled: r.memory_enabled,
    notificationPrefs: {
      deadlines: r.notification_prefs?.deadlines ?? true,
      scheduleGaps: r.notification_prefs?.scheduleGaps ?? true,
      dailyBriefing: r.notification_prefs?.dailyBriefing ?? true,
    },
    onboarded: r.onboarded,
    aiMessagesUsed: r.ai_messages_used,
    aiTokensUsed: r.ai_tokens_used,
    usagePeriodStart: r.usage_period_start,
    proInterestAt: r.pro_interest_at,
    creditsInterestAt: r.credits_interest_at,
    stripeCustomerId: r.stripe_customer_id,
    stripeSubscriptionStatus: r.stripe_subscription_status,
    creditsBalance: r.credits_balance,
  };
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await client().from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data ? profileFromRow(data as ProfileRow) : null;
}

export async function updateProfileRow(userId: string, patch: Partial<Profile>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.timezone !== undefined) row.timezone = patch.timezone;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.avatarInitials !== undefined) row.avatar_initials = patch.avatarInitials;
  if (patch.theme !== undefined) row.theme = patch.theme;
  if (patch.memoryEnabled !== undefined) row.memory_enabled = patch.memoryEnabled;
  if (patch.notificationPrefs !== undefined) row.notification_prefs = patch.notificationPrefs;
  if (patch.onboarded !== undefined) row.onboarded = patch.onboarded;
  if (patch.proInterestAt !== undefined) row.pro_interest_at = patch.proInterestAt;
  if (patch.creditsInterestAt !== undefined) row.credits_interest_at = patch.creditsInterestAt;
  if (patch.plan !== undefined) row.plan = patch.plan;
  const { error } = await client().from("profiles").update(row).eq("id", userId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// tasks
// ---------------------------------------------------------------------------

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  done: boolean;
  due_date: string | null;
  priority: Task["priority"];
  estimated_minutes: number | null;
  category: Task["category"];
  project: string | null;
  recurring: Task["recurring"];
  subtasks: Task["subtasks"];
  ai_context: string | null;
  created_at: string;
  completed_at: string | null;
  goal_id: string | null;
}

function taskFromRow(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    done: r.done,
    dueDate: r.due_date ?? undefined,
    priority: r.priority,
    estimatedMinutes: r.estimated_minutes ?? undefined,
    category: r.category,
    project: r.project ?? undefined,
    recurring: r.recurring ?? "none",
    subtasks: r.subtasks ?? [],
    aiContext: r.ai_context ?? undefined,
    createdAt: r.created_at,
    completedAt: r.completed_at ?? undefined,
    goalId: r.goal_id ?? undefined,
  };
}

function taskToRow(userId: string, t: Partial<Task> & { title: string }): Record<string, unknown> {
  return {
    user_id: userId,
    title: t.title,
    description: t.description ?? null,
    done: t.done ?? false,
    due_date: t.dueDate ?? null,
    priority: t.priority ?? "medium",
    estimated_minutes: t.estimatedMinutes ?? null,
    category: t.category ?? "personal",
    project: t.project ?? null,
    recurring: t.recurring ?? "none",
    subtasks: t.subtasks ?? [],
    ai_context: t.aiContext ?? null,
    goal_id: t.goalId ?? null,
  };
}

export async function fetchTasks(userId: string): Promise<Task[]> {
  const { data, error } = await client().from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data as TaskRow[]).map(taskFromRow);
}

export async function insertTask(userId: string, task: Partial<Task> & { title: string }): Promise<Task> {
  const { data, error } = await client().from("tasks").insert(taskToRow(userId, task)).select("*").single();
  if (error) throw error;
  return taskFromRow(data as TaskRow);
}

export async function updateTaskRow(taskId: string, patch: Partial<Task>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.done !== undefined) row.done = patch.done;
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate;
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (patch.estimatedMinutes !== undefined) row.estimated_minutes = patch.estimatedMinutes;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.project !== undefined) row.project = patch.project;
  if (patch.recurring !== undefined) row.recurring = patch.recurring;
  if (patch.subtasks !== undefined) row.subtasks = patch.subtasks;
  if (patch.completedAt !== undefined) row.completed_at = patch.completedAt;
  if (patch.goalId !== undefined) row.goal_id = patch.goalId;
  const { error } = await client().from("tasks").update(row).eq("id", taskId);
  if (error) throw error;
}

export async function deleteTaskRow(taskId: string): Promise<void> {
  const { error } = await client().from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// events
// ---------------------------------------------------------------------------

interface EventRow {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  type: CalendarEvent["type"];
  location: string | null;
  notes: string | null;
  timezone: string;
  recurrence: CalendarEvent["recurrence"];
  recurrence_until: string | null;
  linked_task_id: string | null;
  ai_generated: boolean;
  movable: boolean;
  source: CalendarEvent["source"];
  google_event_id: string | null;
  linked_goal_id: string | null;
}

function eventFromRow(r: EventRow): CalendarEvent {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    type: r.type,
    location: r.location ?? undefined,
    notes: r.notes ?? undefined,
    timezone: r.timezone,
    recurrence: r.recurrence ?? "none",
    recurrenceUntil: r.recurrence_until ?? undefined,
    linkedTaskId: r.linked_task_id ?? undefined,
    aiGenerated: r.ai_generated,
    movable: r.movable,
    source: r.source ?? "alxioum",
    googleEventId: r.google_event_id ?? undefined,
    linkedGoalId: r.linked_goal_id ?? undefined,
  };
}

function eventToRow(userId: string, e: Partial<CalendarEvent> & { title: string; date: string; startTime: string; endTime: string }): Record<string, unknown> {
  return {
    user_id: userId,
    title: e.title,
    date: e.date,
    start_time: e.startTime,
    end_time: e.endTime,
    type: e.type ?? "personal",
    location: e.location ?? null,
    notes: e.notes ?? null,
    timezone: e.timezone ?? "UTC",
    recurrence: e.recurrence ?? "none",
    recurrence_until: e.recurrenceUntil ?? null,
    linked_task_id: e.linkedTaskId ?? null,
    ai_generated: e.aiGenerated ?? false,
    movable: e.movable ?? true,
    linked_goal_id: e.linkedGoalId ?? null,
  };
}

export async function fetchEvents(userId: string): Promise<CalendarEvent[]> {
  const { data, error } = await client().from("events").select("*").eq("user_id", userId).order("date", { ascending: true });
  if (error) throw error;
  return (data as EventRow[]).map(eventFromRow);
}

export async function insertEvent(userId: string, event: Partial<CalendarEvent> & { title: string; date: string; startTime: string; endTime: string }): Promise<CalendarEvent> {
  const { data, error } = await client().from("events").insert(eventToRow(userId, event)).select("*").single();
  if (error) throw error;
  return eventFromRow(data as EventRow);
}

export async function updateEventRow(eventId: string, patch: Partial<CalendarEvent>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.date !== undefined) row.date = patch.date;
  if (patch.startTime !== undefined) row.start_time = patch.startTime;
  if (patch.endTime !== undefined) row.end_time = patch.endTime;
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.recurrence !== undefined) row.recurrence = patch.recurrence;
  if (patch.recurrenceUntil !== undefined) row.recurrence_until = patch.recurrenceUntil;
  if (patch.movable !== undefined) row.movable = patch.movable;
  const { error } = await client().from("events").update(row).eq("id", eventId);
  if (error) throw error;
}

export async function deleteEventRow(eventId: string): Promise<void> {
  const { error } = await client().from("events").delete().eq("id", eventId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// memory
// ---------------------------------------------------------------------------

interface MemoryRow {
  id: string;
  category: MemoryItem["category"];
  content: string;
  reason: string;
  source: MemoryItem["source"];
  created_at: string;
  active: boolean;
}

function memoryFromRow(r: MemoryRow): MemoryItem {
  return {
    id: r.id,
    category: r.category,
    content: r.content,
    reason: r.reason,
    source: r.source,
    createdAt: r.created_at,
    active: r.active,
  };
}

export async function fetchMemory(userId: string): Promise<MemoryItem[]> {
  const { data, error } = await client().from("memory").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data as MemoryRow[]).map(memoryFromRow);
}

export async function insertMemoryRow(userId: string, item: Omit<MemoryItem, "id" | "createdAt">): Promise<MemoryItem> {
  const { data, error } = await client()
    .from("memory")
    .insert({ user_id: userId, category: item.category, content: item.content, reason: item.reason, source: item.source, active: item.active })
    .select("*")
    .single();
  if (error) throw error;
  return memoryFromRow(data as MemoryRow);
}

export async function deleteMemoryRow(id: string): Promise<void> {
  const { error } = await client().from("memory").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteAllMemoryRows(userId: string): Promise<void> {
  const { error } = await client().from("memory").delete().eq("user_id", userId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  kind: AppNotification["kind"];
  read: boolean;
  created_at: string;
}

function notificationFromRow(r: NotificationRow): AppNotification {
  return { id: r.id, title: r.title, body: r.body, kind: r.kind, read: r.read, createdAt: r.created_at };
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await client().from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
  if (error) throw error;
  return (data as NotificationRow[]).map(notificationFromRow);
}

export async function markNotificationReadRow(id: string): Promise<void> {
  const { error } = await client().from("notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// conversations + messages (chat)
// ---------------------------------------------------------------------------

interface ConversationRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

function conversationFromRow(r: ConversationRow): Conversation {
  return { id: r.id, title: r.title, createdAt: r.created_at, updatedAt: r.updated_at };
}

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await client().from("conversations").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as ConversationRow[]).map(conversationFromRow);
}

export async function createConversation(userId: string, title = "New chat"): Promise<Conversation> {
  const { data, error } = await client().from("conversations").insert({ user_id: userId, title }).select("*").single();
  if (error) throw error;
  return conversationFromRow(data as ConversationRow);
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const { error } = await client().from("conversations").update({ title, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await client().from("conversations").delete().eq("id", id);
  if (error) throw error;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  tool_calls: { tool: string; status: "success" | "failed" }[];
  pending_action: import("./types").PendingActionCard | null;
  resolved_action: (import("./types").PendingActionCard & { resultSummary: string }) | null;
  created_at: string;
}

function messageFromRow(r: MessageRow): import("./types").ChatMessage {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    role: r.role,
    content: r.content,
    toolCalls: r.tool_calls ?? [],
    pendingAction: r.pending_action ?? null,
    resolvedAction: r.resolved_action ?? null,
    createdAt: r.created_at,
  };
}

export async function fetchMessages(conversationId: string): Promise<import("./types").ChatMessage[]> {
  const { data, error } = await client().from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data as MessageRow[]).map(messageFromRow);
}

// ---------------------------------------------------------------------------
// student profile (Study section)
// ---------------------------------------------------------------------------

interface StudentProfileRow {
  school_name: string | null;
  country: string | null;
  education_level: string | null;
  term_start_date: string | null;
  research_summary: string | null;
  researched_at: string | null;
}

function studentProfileFromRow(r: StudentProfileRow): StudentProfile {
  return {
    schoolName: r.school_name ?? "",
    country: r.country ?? "",
    educationLevel: r.education_level ?? "",
    termStartDate: r.term_start_date ?? undefined,
    researchSummary: r.research_summary ?? undefined,
    researchedAt: r.researched_at ?? undefined,
  };
}

export async function fetchStudentProfile(userId: string): Promise<StudentProfile | null> {
  const { data, error } = await client().from("student_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ? studentProfileFromRow(data as StudentProfileRow) : null;
}

export async function upsertStudentProfile(userId: string, patch: Partial<StudentProfile>): Promise<StudentProfile> {
  const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  if (patch.schoolName !== undefined) row.school_name = patch.schoolName;
  if (patch.country !== undefined) row.country = patch.country;
  if (patch.educationLevel !== undefined) row.education_level = patch.educationLevel;
  if (patch.termStartDate !== undefined) row.term_start_date = patch.termStartDate;
  if (patch.researchSummary !== undefined) row.research_summary = patch.researchSummary;
  if (patch.researchedAt !== undefined) row.researched_at = patch.researchedAt;
  const { data, error } = await client().from("student_profiles").upsert(row).select("*").single();
  if (error) throw error;
  return studentProfileFromRow(data as StudentProfileRow);
}

// ---------------------------------------------------------------------------
// subjects (Study section)
// ---------------------------------------------------------------------------

interface SubjectRow {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

function subjectFromRow(r: SubjectRow): Subject {
  return { id: r.id, name: r.name, color: r.color, icon: r.icon, createdAt: r.created_at };
}

export async function fetchSubjects(userId: string): Promise<Subject[]> {
  const { data, error } = await client().from("subjects").select("*").eq("user_id", userId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data as SubjectRow[]).map(subjectFromRow);
}

export async function insertSubject(userId: string, subject: { name: string; color: string; icon: string }): Promise<Subject> {
  const { data, error } = await client().from("subjects").insert({ user_id: userId, ...subject }).select("*").single();
  if (error) throw error;
  return subjectFromRow(data as SubjectRow);
}

export async function updateSubjectRow(id: string, patch: Partial<Subject>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.icon !== undefined) row.icon = patch.icon;
  const { error } = await client().from("subjects").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteSubjectRow(id: string): Promise<void> {
  const { error } = await client().from("subjects").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// focus sessions (Study section)
// ---------------------------------------------------------------------------

interface FocusSessionRow {
  id: string;
  subject_id: string | null;
  task_id: string | null;
  planned_minutes: number;
  actual_minutes: number;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

function focusSessionFromRow(r: FocusSessionRow): FocusSession {
  return {
    id: r.id,
    subjectId: r.subject_id ?? undefined,
    taskId: r.task_id ?? undefined,
    plannedMinutes: r.planned_minutes,
    actualMinutes: r.actual_minutes,
    startedAt: r.started_at,
    completedAt: r.completed_at ?? undefined,
    createdAt: r.created_at,
  };
}

export async function fetchFocusSessions(userId: string): Promise<FocusSession[]> {
  const { data, error } = await client().from("focus_sessions").select("*").eq("user_id", userId).order("started_at", { ascending: false }).limit(500);
  if (error) throw error;
  return (data as FocusSessionRow[]).map(focusSessionFromRow);
}

export async function insertFocusSession(userId: string, session: { subjectId?: string; taskId?: string; plannedMinutes: number }): Promise<FocusSession> {
  const { data, error } = await client()
    .from("focus_sessions")
    .insert({ user_id: userId, subject_id: session.subjectId ?? null, task_id: session.taskId ?? null, planned_minutes: session.plannedMinutes, actual_minutes: 0 })
    .select("*")
    .single();
  if (error) throw error;
  return focusSessionFromRow(data as FocusSessionRow);
}

export async function updateFocusSessionRow(id: string, patch: { actualMinutes?: number; completedAt?: string }): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.actualMinutes !== undefined) row.actual_minutes = patch.actualMinutes;
  if (patch.completedAt !== undefined) row.completed_at = patch.completedAt;
  const { error } = await client().from("focus_sessions").update(row).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// shopping lists / items
// ---------------------------------------------------------------------------

interface ShoppingListRow {
  id: string;
  name: string;
  kind: ShoppingList["kind"];
  created_at: string;
}

function shoppingListFromRow(r: ShoppingListRow): ShoppingList {
  return { id: r.id, name: r.name, kind: r.kind, createdAt: r.created_at };
}

export async function fetchShoppingLists(userId: string): Promise<ShoppingList[]> {
  const { data, error } = await client().from("shopping_lists").select("*").eq("user_id", userId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data as ShoppingListRow[]).map(shoppingListFromRow);
}

export async function insertShoppingList(userId: string, list: { name: string; kind?: ShoppingList["kind"] }): Promise<ShoppingList> {
  const { data, error } = await client()
    .from("shopping_lists")
    .insert({ user_id: userId, name: list.name, kind: list.kind ?? "general" })
    .select("*")
    .single();
  if (error) throw error;
  return shoppingListFromRow(data as ShoppingListRow);
}

export async function deleteShoppingListRow(id: string): Promise<void> {
  const { error } = await client().from("shopping_lists").delete().eq("id", id);
  if (error) throw error;
}

interface ShoppingItemRow {
  id: string;
  list_id: string;
  name: string;
  quantity: string;
  category: string;
  done: boolean;
  created_at: string;
}

function shoppingItemFromRow(r: ShoppingItemRow): ShoppingItem {
  return { id: r.id, listId: r.list_id, name: r.name, quantity: r.quantity || undefined, category: r.category || undefined, done: r.done, createdAt: r.created_at };
}

export async function fetchShoppingItems(userId: string): Promise<ShoppingItem[]> {
  const { data, error } = await client().from("shopping_items").select("*").eq("user_id", userId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data as ShoppingItemRow[]).map(shoppingItemFromRow);
}

export async function insertShoppingItem(
  userId: string,
  item: { listId: string; name: string; quantity?: string; category?: string }
): Promise<ShoppingItem> {
  const { data, error } = await client()
    .from("shopping_items")
    .insert({ user_id: userId, list_id: item.listId, name: item.name, quantity: item.quantity ?? "", category: item.category ?? "" })
    .select("*")
    .single();
  if (error) throw error;
  return shoppingItemFromRow(data as ShoppingItemRow);
}

export async function updateShoppingItemRow(id: string, patch: Partial<ShoppingItem>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.done !== undefined) row.done = patch.done;
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.quantity !== undefined) row.quantity = patch.quantity;
  if (patch.category !== undefined) row.category = patch.category;
  const { error } = await client().from("shopping_items").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteShoppingItemRow(id: string): Promise<void> {
  const { error } = await client().from("shopping_items").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// goals / goal milestones
// ---------------------------------------------------------------------------

interface GoalRow {
  id: string;
  name: string;
  description: string;
  target_date: string | null;
  progress: number;
  completed: boolean;
  created_at: string;
  icon: string;
  category: string | null;
  priority: Goal["priority"];
  difficulty: Goal["difficulty"];
  paused: boolean;
  measurement_type: Goal["measurementType"];
  measurement_unit: string;
  measurement_target: number | null;
  measurement_current: number;
}

function goalFromRow(r: GoalRow): Goal {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    targetDate: r.target_date ?? undefined,
    progress: r.progress,
    completed: r.completed,
    createdAt: r.created_at,
    icon: r.icon || "🎯",
    category: r.category ?? undefined,
    priority: r.priority ?? "medium",
    difficulty: r.difficulty ?? "moderate",
    paused: r.paused ?? false,
    measurementType: r.measurement_type ?? "checklist",
    measurementUnit: r.measurement_unit ?? "",
    measurementTarget: r.measurement_target ?? undefined,
    measurementCurrent: r.measurement_current ?? 0,
  };
}

export interface NewGoalInput {
  name: string;
  description?: string;
  targetDate?: string;
  icon?: string;
  category?: string;
  priority?: Goal["priority"];
  difficulty?: Goal["difficulty"];
  measurementType?: Goal["measurementType"];
  measurementUnit?: string;
  measurementTarget?: number;
}

export async function fetchGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await client().from("goals").select("*").eq("user_id", userId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data as GoalRow[]).map(goalFromRow);
}

export async function insertGoal(userId: string, goal: NewGoalInput): Promise<Goal> {
  const { data, error } = await client()
    .from("goals")
    .insert({
      user_id: userId,
      name: goal.name,
      description: goal.description ?? "",
      target_date: goal.targetDate ?? null,
      icon: goal.icon ?? "🎯",
      category: goal.category ?? null,
      priority: goal.priority ?? "medium",
      difficulty: goal.difficulty ?? "moderate",
      measurement_type: goal.measurementType ?? "checklist",
      measurement_unit: goal.measurementUnit ?? "",
      measurement_target: goal.measurementTarget ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return goalFromRow(data as GoalRow);
}

export async function updateGoalRow(id: string, patch: Partial<Goal>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.targetDate !== undefined) row.target_date = patch.targetDate;
  if (patch.progress !== undefined) row.progress = patch.progress;
  if (patch.completed !== undefined) row.completed = patch.completed;
  if (patch.icon !== undefined) row.icon = patch.icon;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (patch.difficulty !== undefined) row.difficulty = patch.difficulty;
  if (patch.paused !== undefined) row.paused = patch.paused;
  if (patch.measurementType !== undefined) row.measurement_type = patch.measurementType;
  if (patch.measurementUnit !== undefined) row.measurement_unit = patch.measurementUnit;
  if (patch.measurementTarget !== undefined) row.measurement_target = patch.measurementTarget;
  if (patch.measurementCurrent !== undefined) row.measurement_current = patch.measurementCurrent;
  const { error } = await client().from("goals").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteGoalRow(id: string): Promise<void> {
  const { error } = await client().from("goals").delete().eq("id", id);
  if (error) throw error;
}

interface GoalMilestoneRow {
  id: string;
  goal_id: string;
  title: string;
  done: boolean;
  sort_order: number;
  created_at: string;
  description: string;
  target_date: string | null;
  measurement_target: number | null;
  measurement_current: number | null;
}

function goalMilestoneFromRow(r: GoalMilestoneRow): GoalMilestone {
  return {
    id: r.id,
    goalId: r.goal_id,
    title: r.title,
    done: r.done,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    description: r.description ?? "",
    targetDate: r.target_date ?? undefined,
    measurementTarget: r.measurement_target ?? undefined,
    measurementCurrent: r.measurement_current ?? undefined,
  };
}

export async function fetchGoalMilestones(userId: string): Promise<GoalMilestone[]> {
  const { data, error } = await client().from("goal_milestones").select("*").eq("user_id", userId).order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as GoalMilestoneRow[]).map(goalMilestoneFromRow);
}

export async function insertGoalMilestone(
  userId: string,
  milestone: { goalId: string; title: string; sortOrder?: number; description?: string; targetDate?: string; measurementTarget?: number }
): Promise<GoalMilestone> {
  const { data, error } = await client()
    .from("goal_milestones")
    .insert({
      user_id: userId,
      goal_id: milestone.goalId,
      title: milestone.title,
      sort_order: milestone.sortOrder ?? 0,
      description: milestone.description ?? "",
      target_date: milestone.targetDate ?? null,
      measurement_target: milestone.measurementTarget ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return goalMilestoneFromRow(data as GoalMilestoneRow);
}

export async function updateGoalMilestoneRow(id: string, patch: Partial<GoalMilestone>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.done !== undefined) row.done = patch.done;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.targetDate !== undefined) row.target_date = patch.targetDate;
  if (patch.measurementTarget !== undefined) row.measurement_target = patch.measurementTarget;
  if (patch.measurementCurrent !== undefined) row.measurement_current = patch.measurementCurrent;
  const { error } = await client().from("goal_milestones").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteGoalMilestoneRow(id: string): Promise<void> {
  const { error } = await client().from("goal_milestones").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// goal actions (recurring weekly commitments) + logs
// ---------------------------------------------------------------------------

interface GoalActionRow {
  id: string;
  goal_id: string;
  title: string;
  frequency_per_week: number;
  duration_minutes: number | null;
  created_at: string;
}

function goalActionFromRow(r: GoalActionRow): GoalAction {
  return { id: r.id, goalId: r.goal_id, title: r.title, frequencyPerWeek: r.frequency_per_week, durationMinutes: r.duration_minutes ?? undefined, createdAt: r.created_at };
}

export async function fetchGoalActions(userId: string): Promise<GoalAction[]> {
  const { data, error } = await client().from("goal_actions").select("*").eq("user_id", userId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data as GoalActionRow[]).map(goalActionFromRow);
}

export async function insertGoalAction(userId: string, action: { goalId: string; title: string; frequencyPerWeek?: number; durationMinutes?: number }): Promise<GoalAction> {
  const { data, error } = await client()
    .from("goal_actions")
    .insert({ user_id: userId, goal_id: action.goalId, title: action.title, frequency_per_week: action.frequencyPerWeek ?? 3, duration_minutes: action.durationMinutes ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return goalActionFromRow(data as GoalActionRow);
}

export async function deleteGoalActionRow(id: string): Promise<void> {
  const { error } = await client().from("goal_actions").delete().eq("id", id);
  if (error) throw error;
}

interface GoalActionLogRow {
  id: string;
  goal_action_id: string;
  log_date: string;
  created_at: string;
}

function goalActionLogFromRow(r: GoalActionLogRow): GoalActionLog {
  return { id: r.id, goalActionId: r.goal_action_id, logDate: r.log_date, createdAt: r.created_at };
}

export async function fetchGoalActionLogs(userId: string): Promise<GoalActionLog[]> {
  const { data, error } = await client().from("goal_action_logs").select("*").eq("user_id", userId).order("log_date", { ascending: false }).limit(500);
  if (error) throw error;
  return (data as GoalActionLogRow[]).map(goalActionLogFromRow);
}

export async function addGoalActionLogRow(userId: string, goalActionId: string, logDate: string): Promise<GoalActionLog> {
  const { data, error } = await client()
    .from("goal_action_logs")
    .upsert({ user_id: userId, goal_action_id: goalActionId, log_date: logDate }, { onConflict: "goal_action_id,log_date" })
    .select("*")
    .single();
  if (error) throw error;
  return goalActionLogFromRow(data as GoalActionLogRow);
}

export async function removeGoalActionLogRow(goalActionId: string, logDate: string): Promise<void> {
  const { error } = await client().from("goal_action_logs").delete().eq("goal_action_id", goalActionId).eq("log_date", logDate);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// goal activity (purpose-built feed — captures UI actions too, not just AI tool calls)
// ---------------------------------------------------------------------------

interface GoalActivityRow {
  id: string;
  goal_id: string;
  kind: string;
  description: string;
  created_at: string;
}

function goalActivityFromRow(r: GoalActivityRow): GoalActivityEntry {
  return { id: r.id, goalId: r.goal_id, kind: r.kind, description: r.description, createdAt: r.created_at };
}

export async function fetchGoalActivity(userId: string, goalId: string, limitCount = 30): Promise<GoalActivityEntry[]> {
  const { data, error } = await client()
    .from("goal_activity")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .order("created_at", { ascending: false })
    .limit(limitCount);
  if (error) throw error;
  return (data as GoalActivityRow[]).map(goalActivityFromRow);
}

export async function insertGoalActivityRow(userId: string, goalId: string, kind: string, description: string): Promise<void> {
  const { error } = await client().from("goal_activity").insert({ user_id: userId, goal_id: goalId, kind, description });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// goal coach messages
// ---------------------------------------------------------------------------

interface GoalCoachMessageRow {
  id: string;
  goal_id: string;
  role: GoalCoachMessage["role"];
  content: string;
  proposed_adjustment: Record<string, unknown> | null;
  created_at: string;
}

function goalCoachMessageFromRow(r: GoalCoachMessageRow): GoalCoachMessage {
  return { id: r.id, goalId: r.goal_id, role: r.role, content: r.content, proposedAdjustment: r.proposed_adjustment, createdAt: r.created_at };
}

export async function fetchGoalCoachMessages(userId: string, goalId: string): Promise<GoalCoachMessage[]> {
  const { data, error } = await client()
    .from("goal_coach_messages")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data as GoalCoachMessageRow[]).map(goalCoachMessageFromRow);
}

// ---------------------------------------------------------------------------
// routines / routine steps
// ---------------------------------------------------------------------------

interface RoutineRow {
  id: string;
  name: string;
  frequency: string;
  created_at: string;
}

function routineFromRow(r: RoutineRow): Routine {
  return { id: r.id, name: r.name, frequency: r.frequency, createdAt: r.created_at };
}

export async function fetchRoutines(userId: string): Promise<Routine[]> {
  const { data, error } = await client().from("routines").select("*").eq("user_id", userId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data as RoutineRow[]).map(routineFromRow);
}

export async function insertRoutine(userId: string, routine: { name: string; frequency?: string }): Promise<Routine> {
  const { data, error } = await client()
    .from("routines")
    .insert({ user_id: userId, name: routine.name, frequency: routine.frequency ?? "daily" })
    .select("*")
    .single();
  if (error) throw error;
  return routineFromRow(data as RoutineRow);
}

export async function deleteRoutineRow(id: string): Promise<void> {
  const { error } = await client().from("routines").delete().eq("id", id);
  if (error) throw error;
}

interface RoutineStepRow {
  id: string;
  routine_id: string;
  title: string;
  time_label: string;
  done: boolean;
  sort_order: number;
  created_at: string;
}

function routineStepFromRow(r: RoutineStepRow): RoutineStep {
  return { id: r.id, routineId: r.routine_id, title: r.title, timeLabel: r.time_label || undefined, done: r.done, sortOrder: r.sort_order, createdAt: r.created_at };
}

export async function fetchRoutineSteps(userId: string): Promise<RoutineStep[]> {
  const { data, error } = await client().from("routine_steps").select("*").eq("user_id", userId).order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as RoutineStepRow[]).map(routineStepFromRow);
}

export async function insertRoutineStep(userId: string, step: { routineId: string; title: string; timeLabel?: string; sortOrder?: number }): Promise<RoutineStep> {
  const { data, error } = await client()
    .from("routine_steps")
    .insert({ user_id: userId, routine_id: step.routineId, title: step.title, time_label: step.timeLabel ?? "", sort_order: step.sortOrder ?? 0 })
    .select("*")
    .single();
  if (error) throw error;
  return routineStepFromRow(data as RoutineStepRow);
}

export async function updateRoutineStepRow(id: string, patch: Partial<RoutineStep>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.done !== undefined) row.done = patch.done;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.timeLabel !== undefined) row.time_label = patch.timeLabel;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  const { error } = await client().from("routine_steps").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteRoutineStepRow(id: string): Promise<void> {
  const { error } = await client().from("routine_steps").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// weekly reviews (persisted snapshots)
// ---------------------------------------------------------------------------

interface WeeklyReviewRow {
  id: string;
  week_start: string;
  stats: Record<string, unknown>;
  created_at: string;
}

function weeklyReviewFromRow(r: WeeklyReviewRow): WeeklyReview {
  return { id: r.id, weekStart: r.week_start, stats: r.stats, createdAt: r.created_at };
}

export async function fetchLatestWeeklyReview(userId: string): Promise<WeeklyReview | null> {
  const { data, error } = await client()
    .from("weekly_reviews")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? weeklyReviewFromRow(data as WeeklyReviewRow) : null;
}

export async function insertWeeklyReview(userId: string, review: { weekStart: string; stats: Record<string, unknown> }): Promise<WeeklyReview> {
  const { data, error } = await client()
    .from("weekly_reviews")
    .insert({ user_id: userId, week_start: review.weekStart, stats: review.stats })
    .select("*")
    .single();
  if (error) throw error;
  return weeklyReviewFromRow(data as WeeklyReviewRow);
}

// ---------------------------------------------------------------------------
// documents
// ---------------------------------------------------------------------------

interface DocumentRow {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  summary: string;
  created_at: string;
  category: string | null;
  tags: string[];
  starred: boolean;
  collection_id: string | null;
  processing_status: Document["processingStatus"];
  processing_error: string | null;
  extracted_text: string | null;
  linked_goal_id: string | null;
  last_opened_at: string | null;
  document_type: string | null;
  people: string[] | null;
  organizations: string[] | null;
  amounts: { label: string; value: string; currency?: string }[] | null;
  locations: string[] | null;
  key_topics: string[] | null;
  suggested_category: string | null;
}

function documentFromRow(r: DocumentRow): Document {
  return {
    id: r.id,
    name: r.name,
    storagePath: r.storage_path,
    mimeType: r.mime_type,
    sizeBytes: r.size_bytes,
    summary: r.summary,
    createdAt: r.created_at,
    category: r.category ?? undefined,
    tags: r.tags ?? [],
    starred: r.starred ?? false,
    collectionId: r.collection_id ?? undefined,
    processingStatus: r.processing_status ?? "ready",
    processingError: r.processing_error ?? undefined,
    extractedText: r.extracted_text ?? undefined,
    linkedGoalId: r.linked_goal_id ?? undefined,
    lastOpenedAt: r.last_opened_at ?? undefined,
    documentType: r.document_type ?? undefined,
    people: r.people ?? [],
    organizations: r.organizations ?? [],
    amounts: r.amounts ?? [],
    locations: r.locations ?? [],
    keyTopics: r.key_topics ?? [],
    suggestedCategory: r.suggested_category ?? undefined,
  };
}

export interface NewDocumentInput {
  name: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  processingStatus?: Document["processingStatus"];
}

export async function fetchDocuments(userId: string): Promise<Document[]> {
  const { data, error } = await client().from("documents").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data as DocumentRow[]).map(documentFromRow);
}

export async function fetchDocument(userId: string, id: string): Promise<Document | null> {
  const { data, error } = await client().from("documents").select("*").eq("user_id", userId).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? documentFromRow(data as DocumentRow) : null;
}

/**
 * Real Postgres full-text search (ts_rank-ordered) — the single ranking
 * source shared by the Head Agent's documents_search tool, the Command
 * Palette's document search, and cross-document Q&A retrieval. No
 * embeddings/pgvector; see search_documents() in the DB for the query.
 */
export async function searchDocuments(userId: string, query: string, limitCount = 20): Promise<Document[]> {
  const safeQuery = query.trim();
  if (!safeQuery) return [];
  const { data, error } = await client().rpc("search_documents", { p_user_id: userId, p_query: safeQuery, p_limit: limitCount });
  if (error) throw error;
  return (data as DocumentRow[]).map(documentFromRow);
}

export async function insertDocumentRow(userId: string, doc: NewDocumentInput): Promise<Document> {
  const { data, error } = await client()
    .from("documents")
    .insert({
      user_id: userId,
      name: doc.name,
      storage_path: doc.storagePath,
      mime_type: doc.mimeType,
      size_bytes: doc.sizeBytes,
      processing_status: doc.processingStatus ?? "analyzing",
    })
    .select("*")
    .single();
  if (error) throw error;
  return documentFromRow(data as DocumentRow);
}

export async function updateDocumentRow(id: string, patch: Partial<Document>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.summary !== undefined) row.summary = patch.summary;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.starred !== undefined) row.starred = patch.starred;
  if (patch.collectionId !== undefined) row.collection_id = patch.collectionId;
  if (patch.processingStatus !== undefined) row.processing_status = patch.processingStatus;
  if (patch.processingError !== undefined) row.processing_error = patch.processingError;
  if (patch.extractedText !== undefined) row.extracted_text = patch.extractedText;
  if (patch.linkedGoalId !== undefined) row.linked_goal_id = patch.linkedGoalId;
  if (patch.lastOpenedAt !== undefined) row.last_opened_at = patch.lastOpenedAt;
  if (patch.documentType !== undefined) row.document_type = patch.documentType;
  if (patch.people !== undefined) row.people = patch.people;
  if (patch.organizations !== undefined) row.organizations = patch.organizations;
  if (patch.amounts !== undefined) row.amounts = patch.amounts;
  if (patch.locations !== undefined) row.locations = patch.locations;
  if (patch.keyTopics !== undefined) row.key_topics = patch.keyTopics;
  if (patch.suggestedCategory !== undefined) row.suggested_category = patch.suggestedCategory;
  const { error } = await client().from("documents").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteDocumentRow(id: string, storagePath: string): Promise<void> {
  await client().storage.from("documents").remove([storagePath]);
  const { error } = await client().from("documents").delete().eq("id", id);
  if (error) throw error;
}

/** Short-lived signed URL for previewing/downloading a stored document — fetch per page-view, never persist. */
export async function getDocumentSignedUrl(storagePath: string, expiresInSeconds = 3 * 60 * 60): Promise<string | null> {
  const { data, error } = await client().storage.from("documents").createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

// ---------------------------------------------------------------------------
// document collections (flat — no nested folders)
// ---------------------------------------------------------------------------

interface DocumentCollectionRow {
  id: string;
  name: string;
  created_at: string;
}

function documentCollectionFromRow(r: DocumentCollectionRow): DocumentCollection {
  return { id: r.id, name: r.name, createdAt: r.created_at };
}

export async function fetchDocumentCollections(userId: string): Promise<DocumentCollection[]> {
  const { data, error } = await client().from("document_collections").select("*").eq("user_id", userId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data as DocumentCollectionRow[]).map(documentCollectionFromRow);
}

export async function insertDocumentCollection(userId: string, name: string): Promise<DocumentCollection> {
  const { data, error } = await client().from("document_collections").insert({ user_id: userId, name }).select("*").single();
  if (error) throw error;
  return documentCollectionFromRow(data as DocumentCollectionRow);
}

export async function deleteDocumentCollectionRow(id: string): Promise<void> {
  const { error } = await client().from("document_collections").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// document dates / document tasks (extracted at analysis time — real child
// rows so each item can later get its own mutable back-reference)
// ---------------------------------------------------------------------------

interface DocumentDateRow {
  id: string;
  document_id: string;
  label: string;
  date: string;
  kind: DocumentDateKind;
  description: string;
  added_to_calendar_event_id: string | null;
  created_at: string;
}

function documentDateFromRow(r: DocumentDateRow): DocumentDate {
  return {
    id: r.id,
    documentId: r.document_id,
    label: r.label,
    date: r.date,
    kind: r.kind,
    description: r.description,
    addedToCalendarEventId: r.added_to_calendar_event_id ?? undefined,
    createdAt: r.created_at,
  };
}

export async function fetchDocumentDates(userId: string): Promise<DocumentDate[]> {
  const { data, error } = await client().from("document_dates").select("*").eq("user_id", userId).order("date", { ascending: true });
  if (error) throw error;
  return (data as DocumentDateRow[]).map(documentDateFromRow);
}

export async function insertDocumentDateRow(
  userId: string,
  date: { documentId: string; label: string; date: string; kind?: DocumentDateKind; description?: string }
): Promise<DocumentDate> {
  const { data, error } = await client()
    .from("document_dates")
    .insert({ user_id: userId, document_id: date.documentId, label: date.label, date: date.date, kind: date.kind ?? "other", description: date.description ?? "" })
    .select("*")
    .single();
  if (error) throw error;
  return documentDateFromRow(data as DocumentDateRow);
}

export async function updateDocumentDateRow(id: string, patch: { addedToCalendarEventId?: string }): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.addedToCalendarEventId !== undefined) row.added_to_calendar_event_id = patch.addedToCalendarEventId;
  const { error } = await client().from("document_dates").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteDocumentDateRow(id: string): Promise<void> {
  const { error } = await client().from("document_dates").delete().eq("id", id);
  if (error) throw error;
}

interface DocumentTaskRow {
  id: string;
  document_id: string;
  title: string;
  description: string;
  created_task_id: string | null;
  created_at: string;
}

function documentTaskFromRow(r: DocumentTaskRow): DocumentTask {
  return { id: r.id, documentId: r.document_id, title: r.title, description: r.description, createdTaskId: r.created_task_id ?? undefined, createdAt: r.created_at };
}

export async function fetchDocumentTasks(userId: string): Promise<DocumentTask[]> {
  const { data, error } = await client().from("document_tasks").select("*").eq("user_id", userId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data as DocumentTaskRow[]).map(documentTaskFromRow);
}

export async function insertDocumentTaskRow(userId: string, task: { documentId: string; title: string; description?: string }): Promise<DocumentTask> {
  const { data, error } = await client()
    .from("document_tasks")
    .insert({ user_id: userId, document_id: task.documentId, title: task.title, description: task.description ?? "" })
    .select("*")
    .single();
  if (error) throw error;
  return documentTaskFromRow(data as DocumentTaskRow);
}

export async function updateDocumentTaskRow(id: string, patch: { createdTaskId?: string }): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.createdTaskId !== undefined) row.created_task_id = patch.createdTaskId;
  const { error } = await client().from("document_tasks").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteDocumentTaskRow(id: string): Promise<void> {
  const { error } = await client().from("document_tasks").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// document activity (purpose-built feed — mirrors goal_activity)
// ---------------------------------------------------------------------------

interface DocumentActivityRow {
  id: string;
  document_id: string;
  kind: string;
  description: string;
  created_at: string;
}

function documentActivityFromRow(r: DocumentActivityRow): DocumentActivityEntry {
  return { id: r.id, documentId: r.document_id, kind: r.kind, description: r.description, createdAt: r.created_at };
}

export async function fetchDocumentActivity(userId: string, documentId: string, limitCount = 30): Promise<DocumentActivityEntry[]> {
  const { data, error } = await client()
    .from("document_activity")
    .select("*")
    .eq("user_id", userId)
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(limitCount);
  if (error) throw error;
  return (data as DocumentActivityRow[]).map(documentActivityFromRow);
}

export async function insertDocumentActivityRow(userId: string, documentId: string, kind: string, description: string): Promise<void> {
  const { error } = await client().from("document_activity").insert({ user_id: userId, document_id: documentId, kind, description });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// document chat messages (per-document Q&A history — write support in Phase B2)
// ---------------------------------------------------------------------------

interface DocumentChatMessageRow {
  id: string;
  document_id: string;
  role: DocumentChatMessage["role"];
  content: string;
  source_page: number | null;
  created_at: string;
}

function documentChatMessageFromRow(r: DocumentChatMessageRow): DocumentChatMessage {
  return { id: r.id, documentId: r.document_id, role: r.role, content: r.content, sourcePage: r.source_page ?? undefined, createdAt: r.created_at };
}

export async function fetchDocumentChatMessages(userId: string, documentId: string): Promise<DocumentChatMessage[]> {
  const { data, error } = await client()
    .from("document_chat_messages")
    .select("*")
    .eq("user_id", userId)
    .eq("document_id", documentId)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data as DocumentChatMessageRow[]).map(documentChatMessageFromRow);
}

// ---------------------------------------------------------------------------
// study notes (AI-generated, Student plan)
// ---------------------------------------------------------------------------

interface StudyNoteRow {
  id: string;
  subject_id: string | null;
  title: string;
  content: string;
  source_input: string;
  created_at: string;
}

function studyNoteFromRow(r: StudyNoteRow): StudyNote {
  return { id: r.id, subjectId: r.subject_id ?? undefined, title: r.title, content: r.content, sourceInput: r.source_input, createdAt: r.created_at };
}

export async function fetchStudyNotes(userId: string): Promise<StudyNote[]> {
  const { data, error } = await client().from("study_notes").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data as StudyNoteRow[]).map(studyNoteFromRow);
}

export async function deleteStudyNoteRow(id: string): Promise<void> {
  const { error } = await client().from("study_notes").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// activity (agent_actions) — the audit trail
// ---------------------------------------------------------------------------

interface ActivityRow {
  id: string;
  tool: string;
  action: string;
  status: ActivityEntry["status"];
  metadata: Record<string, unknown>;
  event_id: string | null;
  created_at: string;
}

function activityFromRow(r: ActivityRow): ActivityEntry {
  return { id: r.id, tool: r.tool, action: r.action, status: r.status, metadata: r.metadata ?? {}, eventId: r.event_id ?? undefined, createdAt: r.created_at };
}

export async function fetchActivity(userId: string, limitCount = 100): Promise<ActivityEntry[]> {
  const { data, error } = await client().from("agent_actions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limitCount);
  if (error) throw error;
  return (data as ActivityRow[]).map(activityFromRow);
}

// ---------------------------------------------------------------------------
// full account data export ("What Alxioum knows") + full deletion
// ---------------------------------------------------------------------------

export async function exportAllUserData(userId: string) {
  const [
    profile,
    tasks,
    events,
    memory,
    activity,
    shoppingLists,
    shoppingItems,
    goals,
    goalMilestones,
    routines,
    routineSteps,
    documents,
    documentCollections,
    documentDates,
    documentTasks,
    studyNotes,
  ] = await Promise.all([
    fetchProfile(userId),
    fetchTasks(userId),
    fetchEvents(userId),
    fetchMemory(userId),
    fetchActivity(userId, 500),
    fetchShoppingLists(userId),
    fetchShoppingItems(userId),
    fetchGoals(userId),
    fetchGoalMilestones(userId),
    fetchRoutines(userId),
    fetchRoutineSteps(userId),
    fetchDocuments(userId),
    fetchDocumentCollections(userId),
    fetchDocumentDates(userId),
    fetchDocumentTasks(userId),
    fetchStudyNotes(userId),
  ]);
  return {
    profile,
    tasks,
    events,
    memory,
    activity,
    shoppingLists,
    shoppingItems,
    goals,
    goalMilestones,
    routines,
    routineSteps,
    documents,
    documentCollections,
    documentDates,
    documentTasks,
    studyNotes,
  };
}

export async function deleteAllUserContent(userId: string): Promise<void> {
  const c = client();
  const tables = [
    "tasks",
    "events",
    "memory",
    "messages",
    "conversations",
    "agent_actions",
    "pending_actions",
    "notifications",
    "push_subscriptions",
    "focus_sessions",
    "subjects",
    "student_profiles",
    "calendar_connections",
    "shopping_items",
    "shopping_lists",
    "goal_action_logs",
    "goal_actions",
    "goal_activity",
    "goal_coach_messages",
    "goal_milestones",
    "goals",
    "routine_steps",
    "routines",
    "weekly_reviews",
    "document_dates",
    "document_tasks",
    "document_activity",
    "document_chat_messages",
    "documents",
    "document_collections",
    "study_notes",
  ];
  const { data: storedFiles } = await c.storage.from("documents").list(userId);
  if (storedFiles?.length) {
    await c.storage.from("documents").remove(storedFiles.map((f) => `${userId}/${f.name}`));
  }
  for (const t of tables) {
    const { error } = await c.from(t).delete().eq("user_id", userId);
    if (error) throw error;
  }
}
