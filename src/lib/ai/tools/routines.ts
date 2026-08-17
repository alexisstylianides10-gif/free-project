import type { ToolSpec } from "./types";
import { isStepDoneToday } from "@/lib/utils";

interface RoutineRow {
  id: string;
  name: string;
  frequency: string;
}

interface RoutineStepRow {
  id: string;
  routine_id: string;
  title: string;
  time_label: string;
  done: boolean;
  last_completed_date: string | null;
}

export const routinesSearch: ToolSpec<{ query?: string }> = {
  name: "routines_search",
  description: "List the user's routines and their steps. ALWAYS call this before routines_complete_step or routines_delete to resolve exact ids.",
  inputSchema: { type: "object", properties: { query: { type: "string" } } },
  consequential: false,
  execute: async (ctx, input) => {
    let q = ctx.supabase.from("routines").select("*").eq("user_id", ctx.userId);
    if (input.query) q = q.ilike("name", `%${input.query}%`);
    const { data: routines, error } = await q.order("created_at", { ascending: true });
    if (error) return { ok: false, error: error.message };
    const routineRows = routines as RoutineRow[];
    const routineIds = routineRows.map((r) => r.id);
    const { data: steps } = await ctx.supabase
      .from("routine_steps")
      .select("*")
      .eq("user_id", ctx.userId)
      .in("routine_id", routineIds.length ? routineIds : ["00000000-0000-0000-0000-000000000000"])
      .order("sort_order", { ascending: true });
    const stepRows = (steps ?? []) as RoutineStepRow[];
    return {
      ok: true,
      result: {
        routines: routineRows.map((r) => ({
          id: r.id,
          name: r.name,
          frequency: r.frequency,
          steps: stepRows
            .filter((s) => s.routine_id === r.id)
            .map((s) => ({ id: s.id, title: s.title, timeLabel: s.time_label, done: isStepDoneToday({ done: s.done, lastCompletedDate: s.last_completed_date ?? undefined }, ctx.today) })),
        })),
      },
    };
  },
};

export const routinesCreate: ToolSpec<{
  name: string;
  frequency?: string;
  steps?: { title: string; timeLabel?: string }[];
}> = {
  name: "routines_create",
  description:
    "Propose creating a new routine (e.g. 'morning routine', 'workout routine'). When the user doesn't list exact steps, suggest a sensible ordered sequence of 3-8 steps yourself (with approximate times if it's a time-boxed routine like a morning routine).",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      frequency: { type: "string", description: "e.g. daily, weekdays, weekly, custom." },
      steps: {
        type: "array",
        items: { type: "object", properties: { title: { type: "string" }, timeLabel: { type: "string" } }, required: ["title"] },
      },
    },
    required: ["name"],
  },
  consequential: true,
  action: "create",
  describe: async (_ctx, input) => {
    const stepCount = input.steps?.length ? ` with ${input.steps.length} steps` : "";
    return { summary: `Create "${input.name}" routine${stepCount}?` };
  },
  execute: async (ctx, input) => {
    const { data: routine, error } = await ctx.supabase
      .from("routines")
      .insert({ user_id: ctx.userId, name: input.name, frequency: input.frequency ?? "daily" })
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    let steps: unknown[] = [];
    if (input.steps?.length) {
      const { data: stepData, error: stepError } = await ctx.supabase
        .from("routine_steps")
        .insert(input.steps.map((s, i) => ({ user_id: ctx.userId, routine_id: routine.id, title: s.title, time_label: s.timeLabel ?? "", sort_order: i })))
        .select("*");
      if (stepError) return { ok: false, error: stepError.message };
      steps = stepData ?? [];
    }
    return { ok: true, result: { routine, steps } };
  },
};

export const routinesCompleteStep: ToolSpec<{ stepId: string }> = {
  name: "routines_complete_step",
  description: "Propose marking a routine step as done for today. Requires the exact stepId from routines_search.",
  inputSchema: { type: "object", properties: { stepId: { type: "string" } }, required: ["stepId"] },
  consequential: true,
  action: "complete",
  describe: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("routine_steps").select("*").eq("id", input.stepId).eq("user_id", ctx.userId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "I couldn't find that step." };
    return { summary: `Mark "${(data as RoutineStepRow).title}" done?` };
  },
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase
      .from("routine_steps")
      .update({ done: true, last_completed_date: ctx.today })
      .eq("id", input.stepId)
      .eq("user_id", ctx.userId)
      .select("*")
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Step no longer exists." };
    return { ok: true, result: { step: data } };
  },
};

export const routinesDelete: ToolSpec<{ routineId: string }> = {
  name: "routines_delete",
  description: "Propose deleting a routine and all its steps. Requires the exact routineId from routines_search.",
  inputSchema: { type: "object", properties: { routineId: { type: "string" } }, required: ["routineId"] },
  consequential: true,
  action: "delete",
  describe: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("routines").select("*").eq("id", input.routineId).eq("user_id", ctx.userId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "I couldn't find that routine — it may already be deleted." };
    return { summary: `Delete "${(data as RoutineRow).name}"? This also removes its steps.` };
  },
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("routines").delete().eq("id", input.routineId).eq("user_id", ctx.userId).select("id,name").maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Routine no longer exists." };
    return { ok: true, result: { deleted: data } };
  },
};

export const routineTools = [routinesSearch, routinesCreate, routinesCompleteStep, routinesDelete];
