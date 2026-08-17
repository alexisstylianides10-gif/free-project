import { pushEventToGoogle } from "@/lib/google/calendar";
import { formatDayLabel, formatTime12 } from "@/lib/utils";
import type { ToolSpec } from "./types";

const PRIORITIES = ["critical", "high", "medium", "low"] as const;

interface PlanTaskInput {
  title: string;
  dueDate?: string;
  priority?: (typeof PRIORITIES)[number];
  estimatedMinutes?: number;
}

interface PlanEventInput {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  notes?: string;
}

export const planOrganizeDay: ToolSpec<{ tasks?: PlanTaskInput[]; events?: PlanEventInput[] }> = {
  name: "plan_organize_day",
  statusLabel: "Preparing your plan…",
  description:
    "Propose a combined plan that creates multiple tasks and/or schedules multiple calendar blocks in ONE confirmation — use this instead of calling tasks_create / calendar_create separately several times when the user is asking you to organize their day/week from a messy multi-part request (e.g. 'I have tennis at 6, need groceries, need to study, and my project is due Friday'). Before proposing this, gather real context first: call tasks_search, calendar_search, goals_search, and/or shopping_search as relevant, and pick event times that don't overlap what's already on the calendar.",
  inputSchema: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            dueDate: { type: "string" },
            priority: { type: "string", enum: PRIORITIES as unknown as string[] },
            estimatedMinutes: { type: "number" },
          },
          required: ["title"],
        },
      },
      events: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            date: { type: "string" },
            startTime: { type: "string", description: "HH:mm 24h" },
            endTime: { type: "string", description: "HH:mm 24h" },
            location: { type: "string" },
            notes: { type: "string" },
          },
          required: ["title", "date", "startTime", "endTime"],
        },
      },
    },
  },
  consequential: true,
  action: "create",
  describe: async (ctx, input) => {
    const tasks = input.tasks ?? [];
    const events = input.events ?? [];
    if (tasks.length === 0 && events.length === 0) return { error: "Nothing to plan — include at least one task or event." };
    const parts: string[] = [];
    if (tasks.length) parts.push(`${tasks.length} task${tasks.length > 1 ? "s" : ""} (${tasks.map((t) => t.title).join(", ")})`);
    if (events.length) {
      parts.push(
        `${events.length} calendar block${events.length > 1 ? "s" : ""} (${events
          .map((e) => `${e.title} — ${formatDayLabel(e.date, ctx.today)} ${formatTime12(e.startTime)}–${formatTime12(e.endTime)}`)
          .join(", ")})`
      );
    }
    return { summary: `Organize this: ${parts.join(" and ")}?` };
  },
  execute: async (ctx, input) => {
    const createdTasks: unknown[] = [];
    const createdEvents: unknown[] = [];

    // Attempt every item rather than aborting on the first failure — a
    // partial plan (3 of 4 things created) is a materially different, more
    // honest outcome than reporting total failure while some rows already
    // committed. Failures are collected and surfaced in the result instead.
    const failures: string[] = [];

    for (const t of input.tasks ?? []) {
      const { data, error } = await ctx.supabase
        .from("tasks")
        .insert({
          user_id: ctx.userId,
          title: t.title,
          due_date: t.dueDate ?? null,
          priority: t.priority ?? "medium",
          category: "personal",
          estimated_minutes: t.estimatedMinutes ?? null,
          ai_context: "Created via chat as part of a combined plan",
        })
        .select("*")
        .single();
      if (error) {
        failures.push(`Task "${t.title}": ${error.message}`);
        continue;
      }
      createdTasks.push(data);
    }

    for (const e of input.events ?? []) {
      const { data, error } = await ctx.supabase
        .from("events")
        .insert({
          user_id: ctx.userId,
          title: e.title,
          date: e.date,
          start_time: e.startTime,
          end_time: e.endTime,
          type: "personal",
          location: e.location ?? null,
          notes: e.notes ?? null,
          recurrence: "none",
          timezone: ctx.timezone,
          ai_generated: true,
        })
        .select("*")
        .single();
      if (error) {
        failures.push(`Event "${e.title}": ${error.message}`);
        continue;
      }
      createdEvents.push(data);
      pushEventToGoogle(ctx.supabase, ctx.userId, "create", {
        id: data.id,
        title: data.title,
        date: data.date,
        startTime: data.start_time,
        endTime: data.end_time,
        location: data.location ?? undefined,
        notes: data.notes ?? undefined,
        timezone: data.timezone ?? ctx.timezone,
        recurrence: "none",
        source: "alxioum",
      }).catch((err) => console.error("[plan_organize_day] google sync failed:", err));
    }

    if (createdTasks.length === 0 && createdEvents.length === 0 && failures.length > 0) {
      return { ok: false, error: failures.join("; ") };
    }
    return { ok: true, result: { tasks: createdTasks, events: createdEvents, failures } };
  },
};

export const planTools = [planOrganizeDay];
