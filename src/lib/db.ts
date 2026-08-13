import { supabase } from "./supabase/client";
import {
  ActivityEntry,
  AppNotification,
  CalendarEvent,
  Conversation,
  MemoryItem,
  Profile,
  Task,
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
    notificationPrefs: r.notification_prefs,
    onboarded: r.onboarded,
    aiMessagesUsed: r.ai_messages_used,
    aiTokensUsed: r.ai_tokens_used,
    usagePeriodStart: r.usage_period_start,
    proInterestAt: r.pro_interest_at,
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

export async function updateMemoryRow(id: string, patch: Partial<MemoryItem>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.active !== undefined) row.active = patch.active;
  if (patch.content !== undefined) row.content = patch.content;
  const { error } = await client().from("memory").update(row).eq("id", id);
  if (error) throw error;
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
  const [profile, tasks, events, memory, activity] = await Promise.all([
    fetchProfile(userId),
    fetchTasks(userId),
    fetchEvents(userId),
    fetchMemory(userId),
    fetchActivity(userId, 500),
  ]);
  return { profile, tasks, events, memory, activity };
}

export async function deleteAllUserContent(userId: string): Promise<void> {
  const c = client();
  const tables = ["tasks", "events", "memory", "messages", "conversations", "agent_actions", "pending_actions", "notifications", "push_subscriptions"];
  for (const t of tables) {
    const { error } = await c.from(t).delete().eq("user_id", userId);
    if (error) throw error;
  }
}
