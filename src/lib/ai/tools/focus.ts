import type { ToolSpec } from "./types";

export const focusStart: ToolSpec<{ taskId?: string; plannedMinutes: number }> = {
  name: "focus_start",
  description:
    "Propose starting a focus session for a given number of minutes, optionally linked to a task (use tasks_search first to resolve the exact taskId if the user names a task). After confirming, the user can open the Focus page to see the running timer.",
  inputSchema: {
    type: "object",
    properties: { taskId: { type: "string" }, plannedMinutes: { type: "number", minimum: 1, maximum: 240 } },
    required: ["plannedMinutes"],
  },
  consequential: true,
  action: "create",
  describe: async (ctx, input) => {
    if (input.taskId) {
      const { data, error } = await ctx.supabase.from("tasks").select("title").eq("id", input.taskId).eq("user_id", ctx.userId).maybeSingle();
      if (error) return { error: error.message };
      if (!data) return { error: "I couldn't find that task." };
      return { summary: `Start a ${input.plannedMinutes}-minute focus session on "${data.title}"?` };
    }
    return { summary: `Start a ${input.plannedMinutes}-minute focus session?` };
  },
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase
      .from("focus_sessions")
      .insert({ user_id: ctx.userId, task_id: input.taskId ?? null, planned_minutes: input.plannedMinutes, actual_minutes: 0 })
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: { session: data } };
  },
};

export const focusComplete: ToolSpec<{ sessionId: string; actualMinutes?: number }> = {
  name: "focus_complete",
  description: "Propose ending/completing an in-progress focus session. Use focus_start's returned session id, or ask the user if unsure.",
  inputSchema: { type: "object", properties: { sessionId: { type: "string" }, actualMinutes: { type: "number" } }, required: ["sessionId"] },
  consequential: true,
  action: "complete",
  describe: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("focus_sessions").select("*").eq("id", input.sessionId).eq("user_id", ctx.userId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "I couldn't find that focus session." };
    if (data.completed_at) return { error: "That session is already complete." };
    return { summary: "Mark this focus session complete?" };
  },
  execute: async (ctx, input) => {
    const { data: existing } = await ctx.supabase.from("focus_sessions").select("planned_minutes").eq("id", input.sessionId).eq("user_id", ctx.userId).maybeSingle();
    const { data, error } = await ctx.supabase
      .from("focus_sessions")
      .update({ completed_at: new Date().toISOString(), actual_minutes: input.actualMinutes ?? existing?.planned_minutes ?? 0 })
      .eq("id", input.sessionId)
      .eq("user_id", ctx.userId)
      .select("*")
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Session no longer exists." };
    return { ok: true, result: { session: data } };
  },
};

export const focusTools = [focusStart, focusComplete];
