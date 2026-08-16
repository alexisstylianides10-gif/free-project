import type { ToolSpec, ToolContext } from "./types";
import { computeProgressPct, computeGoalStatus } from "@/lib/goals/status";
import type { Goal, GoalMilestone, GoalAction, GoalActionLog } from "@/lib/types";

/**
 * Chat-driven mutations run server-side and can't reach store.ts's
 * client-only logGoalActivity — without this, a goal created via chat
 * would never show up in that goal's own activity timeline the way a
 * UI-created one does. Mirrors the existing awaited document_activity
 * inserts in tools/documents.ts.
 */
async function logGoalActivity(ctx: ToolContext, goalId: string, kind: string, description: string) {
  await ctx.supabase.from("goal_activity").insert({ user_id: ctx.userId, goal_id: goalId, kind, description });
}

interface GoalRow {
  id: string;
  name: string;
  description: string;
  target_date: string | null;
  progress: number;
  completed: boolean;
  icon: string;
  category: string | null;
  priority: "low" | "medium" | "high";
  difficulty: "easy" | "moderate" | "challenging" | "ambitious";
  paused: boolean;
  measurement_type: "numeric" | "distance" | "count" | "streak" | "time" | "checklist";
  measurement_unit: string;
  measurement_target: number | null;
  measurement_current: number;
  created_at: string;
  kind: "personal" | "business";
}

interface MilestoneRow {
  id: string;
  goal_id: string;
  title: string;
  done: boolean;
}

function goalLabel(g: GoalRow): string {
  const due = g.target_date ? `, target ${g.target_date}` : "";
  return `"${g.name}" (${g.progress}%${due}) (id: ${g.id})`;
}

export const goalsSearch: ToolSpec<{ query?: string; completed?: boolean }> = {
  name: "goals_search",
  statusLabel: "Checking your goals…",
  description: "Search the user's goals and their milestones. ALWAYS call this before goals_update_progress, goals_complete_milestone, or goals_delete to resolve exact ids.",
  inputSchema: {
    type: "object",
    properties: { query: { type: "string" }, completed: { type: "boolean" } },
  },
  consequential: false,
  execute: async (ctx, input) => {
    let q = ctx.supabase.from("goals").select("*").eq("user_id", ctx.userId);
    if (input.completed !== undefined) q = q.eq("completed", input.completed);
    if (input.query) q = q.ilike("name", `%${input.query}%`);
    const { data: goals, error } = await q.order("created_at", { ascending: true });
    if (error) return { ok: false, error: error.message };
    const goalRows = goals as GoalRow[];
    const goalIds = goalRows.map((g) => g.id);
    const safeIds = goalIds.length ? goalIds : ["00000000-0000-0000-0000-000000000000"];
    const [{ data: milestones }, { data: actions }, { data: actionLogs }] = await Promise.all([
      ctx.supabase.from("goal_milestones").select("*").eq("user_id", ctx.userId).in("goal_id", safeIds).order("sort_order", { ascending: true }),
      ctx.supabase.from("goal_actions").select("*").eq("user_id", ctx.userId).in("goal_id", safeIds),
      ctx.supabase.from("goal_action_logs").select("id,goal_action_id,log_date,created_at").eq("user_id", ctx.userId),
    ]);
    const milestoneRows = (milestones ?? []) as MilestoneRow[];
    const actionRows = (actions ?? []) as { id: string; goal_id: string; title: string; frequency_per_week: number; duration_minutes: number | null; created_at: string }[];
    const actionLogRows = (actionLogs ?? []) as { id: string; goal_action_id: string; log_date: string; created_at: string }[];

    return {
      ok: true,
      result: {
        goals: goalRows.map((g) => {
          const goalMilestones: GoalMilestone[] = milestoneRows
            .filter((m) => m.goal_id === g.id)
            .map((m) => ({ id: m.id, goalId: m.goal_id, title: m.title, done: m.done, sortOrder: 0, createdAt: "", description: "" }));
          const goalActions: GoalAction[] = actionRows
            .filter((a) => a.goal_id === g.id)
            .map((a) => ({ id: a.id, goalId: a.goal_id, title: a.title, frequencyPerWeek: a.frequency_per_week, durationMinutes: a.duration_minutes ?? undefined, createdAt: a.created_at }));
          const actionIds = new Set(goalActions.map((a) => a.id));
          const goalActionLogs: GoalActionLog[] = actionLogRows
            .filter((l) => actionIds.has(l.goal_action_id))
            .map((l) => ({ id: l.id, goalActionId: l.goal_action_id, logDate: l.log_date, createdAt: l.created_at }));
          const goal: Goal = {
            id: g.id,
            name: g.name,
            description: g.description,
            targetDate: g.target_date ?? undefined,
            progress: g.progress,
            completed: g.completed,
            createdAt: g.created_at,
            icon: g.icon,
            category: g.category ?? undefined,
            priority: g.priority,
            difficulty: g.difficulty,
            paused: g.paused,
            measurementType: g.measurement_type,
            measurementUnit: g.measurement_unit,
            measurementTarget: g.measurement_target ?? undefined,
            measurementCurrent: g.measurement_current,
            kind: g.kind ?? "personal",
          };
          return {
            id: g.id,
            name: g.name,
            description: g.description,
            targetDate: g.target_date,
            progress: computeProgressPct(goal, goalMilestones),
            status: computeGoalStatus(goal, goalMilestones, goalActions, goalActionLogs),
            completed: g.completed,
            category: g.category,
            priority: g.priority,
            difficulty: g.difficulty,
            paused: g.paused,
            icon: g.icon,
            measurementType: g.measurement_type,
            measurementUnit: g.measurement_unit,
            measurementTarget: g.measurement_target,
            measurementCurrent: g.measurement_current,
            milestones: goalMilestones.map((m) => ({ id: m.id, title: m.title, done: m.done })),
            nextMilestone: goalMilestones.find((m) => !m.done)?.title ?? null,
          };
        }),
      },
    };
  },
};

export const goalsCreate: ToolSpec<{
  name: string;
  description?: string;
  targetDate?: string;
  milestones?: string[];
  icon?: string;
  category?: string;
  priority?: "low" | "medium" | "high";
  difficulty?: "easy" | "moderate" | "challenging" | "ambitious";
  measurementType?: "numeric" | "distance" | "count" | "streak" | "time" | "checklist";
  measurementUnit?: string;
  measurementTarget?: number;
}> = {
  name: "goals_create",
  statusLabel: "Setting up your goal…",
  description:
    "Propose creating a new goal. When the goal is broad or long-term (e.g. 'learn Spanish', 'save €500'), break it into 3-6 concrete, sequential milestones and pass them in the milestones array — don't leave milestones empty for a vague goal. This is a fallback path — the primary way users create goals is the Goals tab's own guided flow, so only use this when the user is explicitly asking via chat.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      targetDate: { type: "string", description: "ISO date." },
      milestones: { type: "array", items: { type: "string" } },
      icon: { type: "string", description: "A single emoji representing the goal." },
      category: { type: "string" },
      priority: { type: "string", enum: ["low", "medium", "high"] },
      difficulty: { type: "string", enum: ["easy", "moderate", "challenging", "ambitious"] },
      measurementType: { type: "string", enum: ["numeric", "distance", "count", "streak", "time", "checklist"], description: "How progress is tracked. Default 'checklist' derives progress from milestones." },
      measurementUnit: { type: "string", description: "e.g. 'km', 'books', 'kg' — only for non-checklist measurement types." },
      measurementTarget: { type: "number", description: "The target number for non-checklist measurement types." },
    },
    required: ["name"],
  },
  consequential: true,
  action: "create",
  describe: async (_ctx, input) => {
    const due = input.targetDate ? ` — target ${input.targetDate}` : "";
    const ms = input.milestones?.length ? ` with ${input.milestones.length} milestones` : "";
    return { summary: `Create goal "${input.name}"${due}${ms}?` };
  },
  execute: async (ctx, input) => {
    const { data: goal, error } = await ctx.supabase
      .from("goals")
      .insert({
        user_id: ctx.userId,
        name: input.name,
        description: input.description ?? "",
        target_date: input.targetDate ?? null,
        icon: input.icon ?? "🎯",
        category: input.category ?? null,
        priority: input.priority ?? "medium",
        difficulty: input.difficulty ?? "moderate",
        measurement_type: input.measurementType ?? "checklist",
        measurement_unit: input.measurementUnit ?? "",
        measurement_target: input.measurementTarget ?? null,
      })
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    let milestones: unknown[] = [];
    if (input.milestones?.length) {
      const { data: msData, error: msError } = await ctx.supabase
        .from("goal_milestones")
        .insert(input.milestones.map((title, i) => ({ user_id: ctx.userId, goal_id: goal.id, title, sort_order: i })))
        .select("*");
      if (msError) return { ok: false, error: msError.message };
      milestones = msData ?? [];
    }
    await logGoalActivity(ctx, goal.id, "created", `Created goal "${goal.name}" via chat`);
    return { ok: true, result: { goal, milestones } };
  },
};

export const goalsUpdateProgress: ToolSpec<{ goalId: string; progress: number }> = {
  name: "goals_update_progress",
  statusLabel: "Updating your goal…",
  description:
    "Propose updating a goal's progress percentage (0-100). Only use this when the user explicitly states their progress, or when it can be computed exactly from their completed milestones — never invent or guess a progress number.",
  inputSchema: {
    type: "object",
    properties: { goalId: { type: "string" }, progress: { type: "number", minimum: 0, maximum: 100 } },
    required: ["goalId", "progress"],
  },
  consequential: true,
  action: "update",
  describe: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("goals").select("*").eq("id", input.goalId).eq("user_id", ctx.userId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "I couldn't find that goal." };
    return { summary: `Update ${goalLabel(data as GoalRow)} to ${input.progress}%?` };
  },
  execute: async (ctx, input) => {
    const completed = input.progress >= 100;
    const { data, error } = await ctx.supabase
      .from("goals")
      .update({ progress: input.progress, completed })
      .eq("id", input.goalId)
      .eq("user_id", ctx.userId)
      .select("*")
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Goal no longer exists." };
    await logGoalActivity(ctx, input.goalId, "progress_updated", `Updated progress to ${input.progress}% via chat`);
    return { ok: true, result: { goal: data } };
  },
};

export const goalsCompleteMilestone: ToolSpec<{ milestoneId: string }> = {
  name: "goals_complete_milestone",
  statusLabel: "Updating your goal…",
  description: "Propose marking a goal milestone as done. Requires the exact milestoneId from goals_search.",
  inputSchema: { type: "object", properties: { milestoneId: { type: "string" } }, required: ["milestoneId"] },
  consequential: true,
  action: "complete",
  describe: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("goal_milestones").select("*").eq("id", input.milestoneId).eq("user_id", ctx.userId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "I couldn't find that milestone." };
    if ((data as MilestoneRow).done) return { error: "That milestone is already done." };
    return { summary: `Mark milestone "${(data as MilestoneRow).title}" done?` };
  },
  execute: async (ctx, input) => {
    const { data: milestone, error } = await ctx.supabase
      .from("goal_milestones")
      .update({ done: true })
      .eq("id", input.milestoneId)
      .eq("user_id", ctx.userId)
      .select("*")
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!milestone) return { ok: false, error: "Milestone no longer exists." };

    // Recompute the parent goal's progress from real milestone completion —
    // never left stale, and never guessed by the model.
    const { data: allMilestones } = await ctx.supabase.from("goal_milestones").select("done").eq("goal_id", (milestone as MilestoneRow).goal_id);
    if (allMilestones && allMilestones.length > 0) {
      const doneCount = allMilestones.filter((m: { done: boolean }) => m.done).length;
      const progress = Math.round((doneCount / allMilestones.length) * 100);
      await ctx.supabase
        .from("goals")
        .update({ progress, completed: progress >= 100 })
        .eq("id", (milestone as MilestoneRow).goal_id)
        .eq("user_id", ctx.userId);
    }
    await logGoalActivity(ctx, (milestone as MilestoneRow).goal_id, "milestone_completed", `Marked milestone "${(milestone as MilestoneRow).title}" done via chat`);
    return { ok: true, result: { milestone } };
  },
};

export const goalsDelete: ToolSpec<{ goalId: string }> = {
  name: "goals_delete",
  statusLabel: "Updating your goals…",
  description: "Propose deleting a goal and all its milestones. Requires the exact goalId from goals_search.",
  inputSchema: { type: "object", properties: { goalId: { type: "string" } }, required: ["goalId"] },
  consequential: true,
  action: "delete",
  describe: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("goals").select("*").eq("id", input.goalId).eq("user_id", ctx.userId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "I couldn't find that goal — it may already be deleted." };
    return { summary: `Delete ${goalLabel(data as GoalRow)}? This also removes its milestones.` };
  },
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("goals").delete().eq("id", input.goalId).eq("user_id", ctx.userId).select("id,name").maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Goal no longer exists." };
    return { ok: true, result: { deleted: data } };
  },
};

export const goalTools = [goalsSearch, goalsCreate, goalsUpdateProgress, goalsCompleteMilestone, goalsDelete];
