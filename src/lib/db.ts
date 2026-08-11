import { supabase } from "./supabase/client";
import {
  Agent,
  AppNotification,
  Budget,
  CalendarEvent,
  ChatMessage,
  Goal,
  Habit,
  LifeDocument,
  LifeList,
  MemoryItem,
  Profile,
  Subscription,
  Task,
  Transaction,
} from "./types";
import { demoAgents } from "./demoData";
import { newId } from "./utils";

function client() {
  if (!supabase) throw new Error("Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).");
  return supabase;
}

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  timezone: string;
  location: string;
  avatar_initials: string;
  plan: Profile["plan"];
  proactivity: Profile["proactivity"];
  theme: Profile["theme"];
  memory_enabled: boolean;
  notification_prefs: Profile["notificationPrefs"];
}

function profileFromRow(r: ProfileRow): Profile {
  return {
    name: r.name,
    email: r.email,
    timezone: r.timezone,
    location: r.location,
    avatarInitials: r.avatar_initials,
    plan: r.plan,
    proactivity: r.proactivity,
    theme: r.theme,
    memoryEnabled: r.memory_enabled,
    notificationPrefs: r.notification_prefs,
  };
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await client().from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data ? profileFromRow(data as ProfileRow) : null;
}

export async function isAccountSeeded(userId: string): Promise<boolean> {
  const { data, error } = await client().from("profiles").select("seeded").eq("id", userId).maybeSingle();
  if (error) throw error;
  return (data as { seeded: boolean } | null)?.seeded ?? false;
}

export async function markAccountSeeded(userId: string): Promise<void> {
  const { error } = await client().from("profiles").update({ seeded: true }).eq("id", userId);
  if (error) throw error;
}

export async function updateProfileRow(userId: string, patch: Partial<Profile>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.timezone !== undefined) row.timezone = patch.timezone;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.avatarInitials !== undefined) row.avatar_initials = patch.avatarInitials;
  if (patch.plan !== undefined) row.plan = patch.plan;
  if (patch.proactivity !== undefined) row.proactivity = patch.proactivity;
  if (patch.theme !== undefined) row.theme = patch.theme;
  if (patch.memoryEnabled !== undefined) row.memory_enabled = patch.memoryEnabled;
  if (patch.notificationPrefs !== undefined) row.notification_prefs = patch.notificationPrefs;
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
  goal_id: string | null;
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
    goalId: r.goal_id ?? undefined,
    recurring: r.recurring,
    subtasks: r.subtasks ?? [],
    aiContext: r.ai_context ?? undefined,
    createdAt: r.created_at,
    completedAt: r.completed_at ?? undefined,
  };
}

function taskToRow(userId: string, t: Task): Record<string, unknown> {
  return {
    id: t.id,
    user_id: userId,
    title: t.title,
    description: t.description ?? null,
    done: t.done,
    due_date: t.dueDate ?? null,
    priority: t.priority,
    estimated_minutes: t.estimatedMinutes ?? null,
    category: t.category,
    project: t.project ?? null,
    goal_id: t.goalId ?? null,
    recurring: t.recurring ?? "none",
    subtasks: t.subtasks ?? [],
    ai_context: t.aiContext ?? null,
    created_at: t.createdAt,
    completed_at: t.completedAt ?? null,
  };
}

export async function fetchTasks(userId: string): Promise<Task[]> {
  const { data, error } = await client().from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data as TaskRow[]).map(taskFromRow);
}

export async function insertTask(userId: string, task: Task): Promise<void> {
  const { error } = await client().from("tasks").insert(taskToRow(userId, task));
  if (error) throw error;
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
  if (patch.goalId !== undefined) row.goal_id = patch.goalId;
  if (patch.recurring !== undefined) row.recurring = patch.recurring;
  if (patch.subtasks !== undefined) row.subtasks = patch.subtasks;
  if (patch.aiContext !== undefined) row.ai_context = patch.aiContext;
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
  linked_task_id: string | null;
  linked_goal_id: string | null;
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
    linkedTaskId: r.linked_task_id ?? undefined,
    linkedGoalId: r.linked_goal_id ?? undefined,
    aiGenerated: r.ai_generated,
    movable: r.movable,
  };
}

function eventToRow(userId: string, e: CalendarEvent): Record<string, unknown> {
  return {
    id: e.id,
    user_id: userId,
    title: e.title,
    date: e.date,
    start_time: e.startTime,
    end_time: e.endTime,
    type: e.type,
    location: e.location ?? null,
    linked_task_id: e.linkedTaskId ?? null,
    linked_goal_id: e.linkedGoalId ?? null,
    ai_generated: e.aiGenerated ?? false,
    movable: e.movable ?? true,
  };
}

export async function fetchEvents(userId: string): Promise<CalendarEvent[]> {
  const { data, error } = await client().from("events").select("*").eq("user_id", userId);
  if (error) throw error;
  return (data as EventRow[]).map(eventFromRow);
}

export async function insertEvent(userId: string, event: CalendarEvent): Promise<void> {
  const { error } = await client().from("events").insert(eventToRow(userId, event));
  if (error) throw error;
}

export async function updateEventRow(eventId: string, patch: Partial<CalendarEvent>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.date !== undefined) row.date = patch.date;
  if (patch.startTime !== undefined) row.start_time = patch.startTime;
  if (patch.endTime !== undefined) row.end_time = patch.endTime;
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.linkedTaskId !== undefined) row.linked_task_id = patch.linkedTaskId;
  if (patch.linkedGoalId !== undefined) row.linked_goal_id = patch.linkedGoalId;
  if (patch.aiGenerated !== undefined) row.ai_generated = patch.aiGenerated;
  if (patch.movable !== undefined) row.movable = patch.movable;
  const { error } = await client().from("events").update(row).eq("id", eventId);
  if (error) throw error;
}

export async function deleteEventRow(eventId: string): Promise<void> {
  const { error } = await client().from("events").delete().eq("id", eventId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// goals
// ---------------------------------------------------------------------------

interface GoalRow {
  id: string;
  name: string;
  why: string;
  progress: number;
  deadline: string | null;
  category: Goal["category"];
  milestones: Goal["milestones"];
  linked_task_ids: string[];
  linked_habit_ids: string[];
  ai_plan: string;
  archived: boolean;
}

function goalFromRow(r: GoalRow): Goal {
  return {
    id: r.id,
    name: r.name,
    why: r.why,
    progress: r.progress,
    deadline: r.deadline ?? undefined,
    category: r.category,
    milestones: r.milestones ?? [],
    linkedTaskIds: r.linked_task_ids ?? [],
    linkedHabitIds: r.linked_habit_ids ?? [],
    aiPlan: r.ai_plan,
    archived: r.archived,
  };
}

function goalToRow(userId: string, g: Goal): Record<string, unknown> {
  return {
    id: g.id,
    user_id: userId,
    name: g.name,
    why: g.why,
    progress: g.progress,
    deadline: g.deadline ?? null,
    category: g.category,
    milestones: g.milestones ?? [],
    linked_task_ids: g.linkedTaskIds ?? [],
    linked_habit_ids: g.linkedHabitIds ?? [],
    ai_plan: g.aiPlan,
    archived: g.archived ?? false,
  };
}

export async function fetchGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await client().from("goals").select("*").eq("user_id", userId);
  if (error) throw error;
  return (data as GoalRow[]).map(goalFromRow);
}

export async function insertGoal(userId: string, goal: Goal): Promise<void> {
  const { error } = await client().from("goals").insert(goalToRow(userId, goal));
  if (error) throw error;
}

export async function updateGoalRow(goalId: string, patch: Partial<Goal>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.why !== undefined) row.why = patch.why;
  if (patch.progress !== undefined) row.progress = patch.progress;
  if (patch.deadline !== undefined) row.deadline = patch.deadline;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.milestones !== undefined) row.milestones = patch.milestones;
  if (patch.linkedTaskIds !== undefined) row.linked_task_ids = patch.linkedTaskIds;
  if (patch.linkedHabitIds !== undefined) row.linked_habit_ids = patch.linkedHabitIds;
  if (patch.aiPlan !== undefined) row.ai_plan = patch.aiPlan;
  if (patch.archived !== undefined) row.archived = patch.archived;
  const { error } = await client().from("goals").update(row).eq("id", goalId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// habits
// ---------------------------------------------------------------------------

interface HabitRow {
  id: string;
  name: string;
  emoji: string;
  target_per_week: number;
  history: Habit["history"];
  best_streak: number;
  ai_note: string | null;
}

function habitFromRow(r: HabitRow): Habit {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    targetPerWeek: r.target_per_week,
    history: r.history ?? {},
    bestStreak: r.best_streak,
    aiNote: r.ai_note ?? undefined,
  };
}

function habitToRow(userId: string, h: Habit): Record<string, unknown> {
  return {
    id: h.id,
    user_id: userId,
    name: h.name,
    emoji: h.emoji,
    target_per_week: h.targetPerWeek,
    history: h.history ?? {},
    best_streak: h.bestStreak ?? 0,
    ai_note: h.aiNote ?? null,
  };
}

export async function fetchHabits(userId: string): Promise<Habit[]> {
  const { data, error } = await client().from("habits").select("*").eq("user_id", userId);
  if (error) throw error;
  return (data as HabitRow[]).map(habitFromRow);
}

export async function insertHabit(userId: string, habit: Habit): Promise<void> {
  const { error } = await client().from("habits").insert(habitToRow(userId, habit));
  if (error) throw error;
}

export async function updateHabitRow(habitId: string, patch: Partial<Habit>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.history !== undefined) row.history = patch.history;
  if (patch.bestStreak !== undefined) row.best_streak = patch.bestStreak;
  if (patch.aiNote !== undefined) row.ai_note = patch.aiNote;
  const { error } = await client().from("habits").update(row).eq("id", habitId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// transactions / subscriptions / budgets
// ---------------------------------------------------------------------------

interface TransactionRow {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  category: Transaction["category"];
}

function txFromRow(r: TransactionRow): Transaction {
  return { id: r.id, merchant: r.merchant, amount: r.amount, date: r.date, category: r.category };
}

export async function fetchTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await client().from("transactions").select("*").eq("user_id", userId).order("date", { ascending: false });
  if (error) throw error;
  return (data as TransactionRow[]).map(txFromRow);
}

export async function insertTransaction(userId: string, tx: Transaction): Promise<void> {
  const { error } = await client()
    .from("transactions")
    .insert({ id: tx.id, user_id: userId, merchant: tx.merchant, amount: tx.amount, date: tx.date, category: tx.category });
  if (error) throw error;
}

interface SubscriptionRow {
  id: string;
  name: string;
  amount: number;
  renews_on: string;
  category: Subscription["category"];
}

function subFromRow(r: SubscriptionRow): Subscription {
  return { id: r.id, name: r.name, amount: r.amount, renewsOn: r.renews_on, category: r.category };
}

export async function fetchSubscriptions(userId: string): Promise<Subscription[]> {
  const { data, error } = await client().from("subscriptions").select("*").eq("user_id", userId);
  if (error) throw error;
  return (data as SubscriptionRow[]).map(subFromRow);
}

interface BudgetRow {
  category: Budget["category"];
  limit_amount: number;
}

export async function fetchBudgets(userId: string): Promise<Budget[]> {
  const { data, error } = await client().from("budgets").select("category, limit_amount").eq("user_id", userId);
  if (error) throw error;
  return (data as BudgetRow[]).map((r) => ({ category: r.category, limit: r.limit_amount }));
}

// ---------------------------------------------------------------------------
// documents
// ---------------------------------------------------------------------------

interface DocumentRow {
  id: string;
  name: string;
  kind: LifeDocument["kind"];
  folder: string;
  tags: string[];
  size_kb: number;
  uploaded_at: string;
  ai_summary: string | null;
  extracted_dates: LifeDocument["extractedDates"];
}

function documentFromRow(r: DocumentRow): LifeDocument {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    folder: r.folder,
    tags: r.tags ?? [],
    sizeKb: r.size_kb,
    uploadedAt: r.uploaded_at,
    aiSummary: r.ai_summary ?? undefined,
    extractedDates: r.extracted_dates ?? undefined,
  };
}

export async function fetchDocuments(userId: string): Promise<LifeDocument[]> {
  const { data, error } = await client().from("documents").select("*").eq("user_id", userId);
  if (error) throw error;
  return (data as DocumentRow[]).map(documentFromRow);
}

export async function insertDocument(userId: string, doc: LifeDocument): Promise<void> {
  const { error } = await client()
    .from("documents")
    .insert({
      id: doc.id,
      user_id: userId,
      name: doc.name,
      kind: doc.kind,
      folder: doc.folder,
      tags: doc.tags,
      size_kb: doc.sizeKb,
      uploaded_at: doc.uploadedAt,
      ai_summary: doc.aiSummary ?? null,
      extracted_dates: doc.extractedDates ?? [],
    });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// lists
// ---------------------------------------------------------------------------

interface ListRow {
  id: string;
  name: string;
  emoji: string;
  kind: LifeList["kind"];
  items: LifeList["items"];
}

function listFromRow(r: ListRow): LifeList {
  return { id: r.id, name: r.name, emoji: r.emoji, kind: r.kind, items: r.items ?? [] };
}

export async function fetchLists(userId: string): Promise<LifeList[]> {
  const { data, error } = await client().from("lists").select("*").eq("user_id", userId);
  if (error) throw error;
  return (data as ListRow[]).map(listFromRow);
}

export async function insertList(userId: string, list: LifeList): Promise<void> {
  const { error } = await client()
    .from("lists")
    .insert({ id: list.id, user_id: userId, name: list.name, emoji: list.emoji, kind: list.kind, items: list.items });
  if (error) throw error;
}

export async function updateListRow(listId: string, patch: Partial<LifeList>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.items !== undefined) row.items = patch.items;
  if (patch.name !== undefined) row.name = patch.name;
  const { error } = await client().from("lists").update(row).eq("id", listId);
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
  source: string;
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
  const { data, error } = await client().from("memory").select("*").eq("user_id", userId);
  if (error) throw error;
  return (data as MemoryRow[]).map(memoryFromRow);
}

export async function insertMemoryRow(userId: string, item: MemoryItem): Promise<void> {
  const { error } = await client()
    .from("memory")
    .insert({
      id: item.id,
      user_id: userId,
      category: item.category,
      content: item.content,
      reason: item.reason,
      source: item.source,
      created_at: item.createdAt,
      active: item.active,
    });
  if (error) throw error;
}

export async function updateMemoryRow(id: string, patch: Partial<MemoryItem>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.active !== undefined) row.active = patch.active;
  const { error } = await client().from("memory").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteMemoryRow(id: string): Promise<void> {
  const { error } = await client().from("memory").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// user_agents (merged with the static catalog at load time)
// ---------------------------------------------------------------------------

interface UserAgentRow {
  agent_id: string;
  installed: boolean;
  active: boolean;
  run_history: Agent["runHistory"];
}

export async function fetchAgents(userId: string): Promise<Agent[]> {
  const { data, error } = await client().from("user_agents").select("*").eq("user_id", userId);
  if (error) throw error;
  const rows = data as UserAgentRow[];
  const byId = new Map(rows.map((r) => [r.agent_id, r]));
  return demoAgents.map((catalogEntry) => {
    const row = byId.get(catalogEntry.id);
    return row
      ? { ...catalogEntry, installed: row.installed, active: row.active, runHistory: row.run_history ?? [] }
      : { ...catalogEntry, installed: false, active: false, runHistory: [] };
  });
}

export async function upsertUserAgent(userId: string, agentId: string, patch: { installed?: boolean; active?: boolean }): Promise<void> {
  const row: Record<string, unknown> = { user_id: userId, agent_id: agentId, ...(patch.installed !== undefined && { installed: patch.installed }), ...(patch.active !== undefined && { active: patch.active }) };
  const { error } = await client().from("user_agents").upsert(row, { onConflict: "user_id,agent_id" });
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
  const { data, error } = await client().from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data as NotificationRow[]).map(notificationFromRow);
}

export async function insertNotification(userId: string, n: AppNotification): Promise<void> {
  const { error } = await client()
    .from("notifications")
    .insert({ id: n.id, user_id: userId, title: n.title, body: n.body, kind: n.kind, read: n.read, created_at: n.createdAt });
  if (error) throw error;
}

export async function markNotificationReadRow(id: string): Promise<void> {
  const { error } = await client().from("notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// chat_messages
// ---------------------------------------------------------------------------

interface ChatRow {
  id: string;
  role: ChatMessage["role"];
  content: string;
  actions: ChatMessage["actions"];
  created_at: string;
}

function chatFromRow(r: ChatRow): ChatMessage {
  return { id: r.id, role: r.role, content: r.content, actions: r.actions ?? [], createdAt: r.created_at };
}

export async function fetchChat(userId: string): Promise<ChatMessage[]> {
  const { data, error } = await client().from("chat_messages").select("*").eq("user_id", userId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data as ChatRow[]).map(chatFromRow);
}

export async function insertChatMessage(userId: string, m: ChatMessage): Promise<void> {
  const { error } = await client()
    .from("chat_messages")
    .insert({ id: m.id, user_id: userId, role: m.role, content: m.content, actions: m.actions ?? [], created_at: m.createdAt });
  if (error) throw error;
}

export async function updateChatMessageActions(id: string, actions: ChatMessage["actions"]): Promise<void> {
  const { error } = await client().from("chat_messages").update({ actions }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Seed a brand-new account with the realistic demo dataset so first-run
// still feels like a populated, "wow" Alxioum instead of an empty shell.
// ---------------------------------------------------------------------------

export async function seedAccountWithDemoData(userId: string): Promise<void> {
  const {
    demoTasks,
    demoEvents,
    demoGoals,
    demoHabits,
    demoTransactions,
    demoSubscriptions,
    demoBudgets,
    demoDocuments,
    demoLists,
    demoMemory,
    demoAgents: catalog,
  } = await import("./demoData");

  const goalIdMap = new Map<string, string>();
  const goalRows = demoGoals.map((g) => {
    const id = newId();
    goalIdMap.set(g.id, id);
    return goalToRow(userId, { ...g, id });
  });
  if (goalRows.length) {
    const { error } = await client().from("goals").insert(goalRows);
    if (error) throw error;
  }

  const taskRows = demoTasks.map((t) =>
    taskToRow(userId, { ...t, id: newId(), goalId: t.goalId ? goalIdMap.get(t.goalId) : undefined })
  );
  if (taskRows.length) {
    const { error } = await client().from("tasks").insert(taskRows);
    if (error) throw error;
  }

  const eventRows = demoEvents.map((e) => eventToRow(userId, { ...e, id: newId() }));
  if (eventRows.length) {
    const { error } = await client().from("events").insert(eventRows);
    if (error) throw error;
  }

  const habitRows = demoHabits.map((h) => habitToRow(userId, { ...h, id: newId() }));
  if (habitRows.length) {
    const { error } = await client().from("habits").insert(habitRows);
    if (error) throw error;
  }

  const txRows = demoTransactions.map((t) => ({ id: newId(), user_id: userId, merchant: t.merchant, amount: t.amount, date: t.date, category: t.category }));
  if (txRows.length) {
    const { error } = await client().from("transactions").insert(txRows);
    if (error) throw error;
  }

  const subRows = demoSubscriptions.map((s) => ({ id: newId(), user_id: userId, name: s.name, amount: s.amount, renews_on: s.renewsOn, category: s.category }));
  if (subRows.length) {
    const { error } = await client().from("subscriptions").insert(subRows);
    if (error) throw error;
  }

  const budgetRows = demoBudgets.map((b) => ({ user_id: userId, category: b.category, limit_amount: b.limit }));
  if (budgetRows.length) {
    const { error } = await client().from("budgets").insert(budgetRows);
    if (error) throw error;
  }

  const docRows = demoDocuments.map((d) => ({
    id: newId(),
    user_id: userId,
    name: d.name,
    kind: d.kind,
    folder: d.folder,
    tags: d.tags,
    size_kb: d.sizeKb,
    uploaded_at: d.uploadedAt,
    ai_summary: d.aiSummary ?? null,
    extracted_dates: d.extractedDates ?? [],
  }));
  if (docRows.length) {
    const { error } = await client().from("documents").insert(docRows);
    if (error) throw error;
  }

  const listRows = demoLists.map((l) => ({ id: newId(), user_id: userId, name: l.name, emoji: l.emoji, kind: l.kind, items: l.items }));
  if (listRows.length) {
    const { error } = await client().from("lists").insert(listRows);
    if (error) throw error;
  }

  const memoryRows = demoMemory.map((m) => ({
    id: newId(),
    user_id: userId,
    category: m.category,
    content: m.content,
    reason: m.reason,
    source: m.source,
    created_at: m.createdAt,
    active: m.active,
  }));
  if (memoryRows.length) {
    const { error } = await client().from("memory").insert(memoryRows);
    if (error) throw error;
  }

  const agentRows = catalog.map((a) => ({ user_id: userId, agent_id: a.id, installed: a.installed, active: a.active, run_history: a.runHistory }));
  if (agentRows.length) {
    const { error } = await client().from("user_agents").insert(agentRows);
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------------
// Load everything for a signed-in user in one go.
// ---------------------------------------------------------------------------

export async function loadAllUserData(userId: string) {
  const [profile, tasks, events, goals, habits, transactions, subscriptions, budgets, documents, lists, memory, agents, notifications, chat] =
    await Promise.all([
      fetchProfile(userId),
      fetchTasks(userId),
      fetchEvents(userId),
      fetchGoals(userId),
      fetchHabits(userId),
      fetchTransactions(userId),
      fetchSubscriptions(userId),
      fetchBudgets(userId),
      fetchDocuments(userId),
      fetchLists(userId),
      fetchMemory(userId),
      fetchAgents(userId),
      fetchNotifications(userId),
      fetchChat(userId),
    ]);
  return { profile, tasks, events, goals, habits, transactions, subscriptions, budgets, documents, lists, memory, agents, notifications, chat };
}
