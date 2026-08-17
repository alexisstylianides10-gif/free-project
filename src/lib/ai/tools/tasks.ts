import { formatDayLabel, newId } from "@/lib/utils";
import type { ToolSpec } from "./types";

const PRIORITIES = ["critical", "high", "medium", "low"] as const;
const CATEGORIES = ["school", "home", "work", "health", "social", "travel", "personal"] as const;

interface TaskRow {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  done: boolean;
}

function taskLabel(t: TaskRow, today: string): string {
  const due = t.due_date ? `, due ${formatDayLabel(t.due_date, today)}` : "";
  return `"${t.title}" (${t.priority}${due}) (id: ${t.id})`;
}

export const tasksSearch: ToolSpec<{ query?: string; done?: boolean; dueBefore?: string; limit?: number }> = {
  name: "tasks_search",
  statusLabel: "Checking your tasks…",
  description: "Search the user's tasks. ALWAYS call this before tasks_update, tasks_complete, or tasks_delete to resolve the exact taskId — never guess one.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" },
      done: { type: "boolean" },
      dueBefore: { type: "string", description: "ISO date upper bound on due_date." },
      limit: { type: "number" },
    },
  },
  consequential: false,
  execute: async (ctx, input) => {
    let q = ctx.supabase.from("tasks").select("*").eq("user_id", ctx.userId);
    if (input.done !== undefined) q = q.eq("done", input.done);
    if (input.dueBefore) q = q.lte("due_date", input.dueBefore);
    if (input.query) q = q.ilike("title", `%${input.query}%`);
    q = q.order("due_date", { ascending: true, nullsFirst: false }).limit(input.limit ?? 20);
    const { data, error } = await q;
    if (error) return { ok: false, error: error.message };
    const rows = data as TaskRow[];
    return { ok: true, result: { count: rows.length, tasks: rows.map((t) => ({ id: t.id, title: t.title, dueDate: t.due_date, priority: t.priority, done: t.done })) } };
  },
};

export const tasksCreate: ToolSpec<{
  title: string;
  dueDate?: string;
  priority?: (typeof PRIORITIES)[number];
  category?: (typeof CATEGORIES)[number];
  estimatedMinutes?: number;
  description?: string;
}> = {
  name: "tasks_create",
  statusLabel: "Adding a task…",
  description: "Propose creating a new task.",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      dueDate: { type: "string" },
      priority: { type: "string", enum: PRIORITIES as unknown as string[] },
      category: { type: "string", enum: CATEGORIES as unknown as string[] },
      estimatedMinutes: { type: "number" },
      description: { type: "string" },
    },
    required: ["title"],
  },
  consequential: true,
  action: "create",
  describe: async (ctx, input) => {
    const due = input.dueDate ? ` — due ${formatDayLabel(input.dueDate, ctx.today)}` : "";
    const prio = input.priority && input.priority !== "medium" ? ` (${input.priority} priority)` : "";
    return { summary: `Create task "${input.title}"${due}${prio}?` };
  },
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase
      .from("tasks")
      .insert({
        user_id: ctx.userId,
        title: input.title,
        due_date: input.dueDate ?? null,
        priority: input.priority ?? "medium",
        category: input.category ?? "personal",
        estimated_minutes: input.estimatedMinutes ?? null,
        description: input.description ?? null,
        ai_context: "Created via chat",
      })
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: { task: data } };
  },
};

export const tasksUpdate: ToolSpec<{ taskId: string; title?: string; dueDate?: string; priority?: (typeof PRIORITIES)[number] }> = {
  name: "tasks_update",
  statusLabel: "Updating your tasks…",
  description: "Propose updating a task. Requires the exact taskId from tasks_search.",
  inputSchema: {
    type: "object",
    properties: {
      taskId: { type: "string" },
      title: { type: "string" },
      dueDate: { type: "string" },
      priority: { type: "string", enum: PRIORITIES as unknown as string[] },
    },
    required: ["taskId"],
  },
  consequential: true,
  action: "update",
  describe: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("tasks").select("*").eq("id", input.taskId).eq("user_id", ctx.userId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "I couldn't find that task — it may have already been deleted." };
    return { summary: `Update ${taskLabel(data as TaskRow, ctx.today)}?` };
  },
  execute: async (ctx, input) => {
    const row: Record<string, unknown> = {};
    if (input.title !== undefined) row.title = input.title;
    if (input.dueDate !== undefined) row.due_date = input.dueDate;
    if (input.priority !== undefined) row.priority = input.priority;
    const { data, error } = await ctx.supabase.from("tasks").update(row).eq("id", input.taskId).eq("user_id", ctx.userId).select("*").maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Task no longer exists." };
    return { ok: true, result: { task: data } };
  },
};

export const tasksComplete: ToolSpec<{ taskId: string }> = {
  name: "tasks_complete",
  statusLabel: "Updating your tasks…",
  description: "Propose marking a task complete. Requires the exact taskId from tasks_search.",
  inputSchema: { type: "object", properties: { taskId: { type: "string" } }, required: ["taskId"] },
  consequential: true,
  action: "complete",
  describe: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("tasks").select("*").eq("id", input.taskId).eq("user_id", ctx.userId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "I couldn't find that task." };
    if ((data as TaskRow).done) return { error: "That task is already complete." };
    return { summary: `Mark ${taskLabel(data as TaskRow, ctx.today)} complete?` };
  },
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase
      .from("tasks")
      .update({ done: true, completed_at: new Date().toISOString() })
      .eq("id", input.taskId)
      .eq("user_id", ctx.userId)
      .select("*")
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Task no longer exists." };
    return { ok: true, result: { task: data } };
  },
};

export const tasksDelete: ToolSpec<{ taskId: string }> = {
  name: "tasks_delete",
  statusLabel: "Updating your tasks…",
  description: "Propose deleting a task. Requires the exact taskId from tasks_search. There is no bulk-delete tool.",
  inputSchema: { type: "object", properties: { taskId: { type: "string" } }, required: ["taskId"] },
  consequential: true,
  action: "delete",
  describe: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("tasks").select("*").eq("id", input.taskId).eq("user_id", ctx.userId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "I couldn't find that task — it may have already been deleted." };
    return { summary: `Delete ${taskLabel(data as TaskRow, ctx.today)}?` };
  },
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("tasks").delete().eq("id", input.taskId).eq("user_id", ctx.userId).select("id,title").maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Task no longer exists." };
    return { ok: true, result: { deleted: data } };
  },
};

export const tasksBreakDown: ToolSpec<{ taskId: string; subtasks: string[] }> = {
  name: "tasks_break_down",
  statusLabel: "Breaking task into steps…",
  description:
    "Propose breaking a task into 3-6 concrete subtasks, grounded only in the task's own title/description — never invent scope it doesn't imply. Requires the exact taskId from tasks_search and a subtasks array you've already worked out.",
  inputSchema: {
    type: "object",
    properties: {
      taskId: { type: "string" },
      subtasks: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 8 },
    },
    required: ["taskId", "subtasks"],
  },
  consequential: true,
  action: "update",
  describe: async (ctx, input) => {
    const { data } = await ctx.supabase.from("tasks").select("title").eq("id", input.taskId).eq("user_id", ctx.userId).maybeSingle();
    if (!data) return { error: "I couldn't find that task." };
    if (!input.subtasks.length) return { error: "Nothing to break down into." };
    return { summary: `Break "${data.title}" into ${input.subtasks.length} steps: ${input.subtasks.join(", ")}?` };
  },
  execute: async (ctx, input) => {
    const subtasks = input.subtasks.map((title) => ({ id: newId(), title, done: false }));
    const { data, error } = await ctx.supabase.from("tasks").update({ subtasks }).eq("id", input.taskId).eq("user_id", ctx.userId).select("*").maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Task no longer exists." };
    return { ok: true, result: { task: data } };
  },
};

export const taskTools = [tasksSearch, tasksCreate, tasksUpdate, tasksComplete, tasksDelete, tasksBreakDown];
