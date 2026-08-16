import type { ToolSpec } from "./types";

export const chatPresentChoices: ToolSpec<{ question: string; options: { label: string; value: string }[] }> = {
  name: "chat_present_choices",
  description:
    "Present the user with 2-5 specific, real options to pick from when their request is genuinely ambiguous (e.g. two matching calendar events named 'my appointment'). ALWAYS resolve the options via the relevant search tool first — never invent an option. Do not use this for a yes/no confirmation; those already go through the normal propose-and-confirm flow. 'value' should be a short phrase the user could plausibly type back (e.g. the event's title + time) so their reply is unambiguous on the next turn.",
  inputSchema: {
    type: "object",
    properties: {
      question: { type: "string" },
      options: {
        type: "array",
        minItems: 2,
        maxItems: 5,
        items: {
          type: "object",
          properties: { label: { type: "string" }, value: { type: "string" } },
          required: ["label", "value"],
        },
      },
    },
    required: ["question", "options"],
  },
  consequential: false,
  execute: async (_ctx, input) => ({ ok: true, result: input }),
};

interface TaskRow {
  id: string;
  title: string;
  due_date: string;
}

interface GoalRow {
  id: string;
  name: string;
  icon: string;
}

interface DocumentDateRow {
  label: string;
  date: string;
  document_id: string;
}

export const dailyBriefingGet: ToolSpec<Record<string, never>> = {
  name: "daily_briefing_get",
  statusLabel: "Preparing your briefing…",
  description: "Get today's briefing — a count of today's calendar events, remaining tasks, high-priority active goals, and upcoming document deadlines, plus a computed recommended focus. Use this for requests like 'what's important today' or 'what should I focus on'.",
  inputSchema: { type: "object", properties: {} },
  consequential: false,
  execute: async (ctx) => {
    const in3 = new Date(ctx.today + "T00:00:00");
    in3.setDate(in3.getDate() + 3);
    const in3ISO = in3.toISOString().slice(0, 10);
    const in7 = new Date(ctx.today + "T00:00:00");
    in7.setDate(in7.getDate() + 7);
    const in7ISO = in7.toISOString().slice(0, 10);

    const [{ count: eventsCount }, { data: openTasks }, { data: priorityGoals }, { data: soonDocDates }] = await Promise.all([
      ctx.supabase.from("events").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId).eq("date", ctx.today),
      ctx.supabase.from("tasks").select("id,title,due_date").eq("user_id", ctx.userId).eq("done", false).lte("due_date", in7ISO).order("due_date", { ascending: true, nullsFirst: false }),
      ctx.supabase.from("goals").select("id,name,icon").eq("user_id", ctx.userId).eq("completed", false).eq("paused", false).eq("priority", "high"),
      ctx.supabase.from("document_dates").select("label,date,document_id").eq("user_id", ctx.userId).lte("date", in7ISO).gte("date", ctx.today),
    ]);

    const tasks = (openTasks ?? []) as TaskRow[];
    const goals = (priorityGoals ?? []) as GoalRow[];
    const docDates = (soonDocDates ?? []) as DocumentDateRow[];

    const nearestTask = tasks.find((t) => t.due_date && t.due_date <= in3ISO) ?? null;
    const nearestDocDate = docDates.filter((d) => d.date <= in3ISO).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;

    let recommendedFocus: string | null = null;
    if (nearestTask && (!nearestDocDate || nearestTask.due_date <= nearestDocDate.date)) {
      recommendedFocus = nearestTask.title;
    } else if (nearestDocDate) {
      recommendedFocus = nearestDocDate.label;
    } else if (goals.length > 0) {
      recommendedFocus = goals[0].name;
    }

    return {
      ok: true,
      result: {
        eventsCount: eventsCount ?? 0,
        tasksRemaining: tasks.length,
        goalsPriorityCount: goals.length,
        deadlinesUpcoming: docDates.length,
        recommendedFocus,
      },
    };
  },
};

export const chatTools = [chatPresentChoices, dailyBriefingGet];
