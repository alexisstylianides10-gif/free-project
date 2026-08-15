import type { ToolSpec } from "./types";

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const weeklyReviewGenerate: ToolSpec<Record<string, never>> = {
  name: "weekly_review_generate",
  description: "Generate a summary of the user's last 7 days (events, completed/remaining tasks, goal progress, upcoming deadlines) and this week's top priorities. Read-only — doesn't change any data, just summarizes it.",
  inputSchema: { type: "object", properties: {} },
  consequential: false,
  execute: async (ctx) => {
    const weekStart = addDays(ctx.today, -6);
    const nextWeekEnd = addDays(ctx.today, 7);

    const [{ data: events }, { data: completedTasks }, { data: remainingTasks }, { data: upcomingTasks }, { data: goals }] = await Promise.all([
      ctx.supabase.from("events").select("id").eq("user_id", ctx.userId).gte("date", weekStart).lte("date", ctx.today),
      ctx.supabase.from("tasks").select("id").eq("user_id", ctx.userId).eq("done", true).gte("completed_at", weekStart),
      ctx.supabase.from("tasks").select("id").eq("user_id", ctx.userId).eq("done", false).gte("due_date", weekStart).lte("due_date", ctx.today),
      ctx.supabase
        .from("tasks")
        .select("id,title,due_date,priority")
        .eq("user_id", ctx.userId)
        .eq("done", false)
        .gte("due_date", ctx.today)
        .lte("due_date", nextWeekEnd)
        .order("due_date", { ascending: true })
        .limit(5),
      ctx.supabase.from("goals").select("id,name,progress").eq("user_id", ctx.userId).eq("completed", false),
    ]);

    const stats = {
      eventsThisWeek: events?.length ?? 0,
      tasksCompleted: completedTasks?.length ?? 0,
      tasksRemaining: remainingTasks?.length ?? 0,
      upcomingDeadlines: (upcomingTasks ?? []).map((t) => ({ id: t.id, title: t.title, dueDate: t.due_date, priority: t.priority })),
      activeGoals: (goals ?? []).map((g) => ({ id: g.id, name: g.name, progress: g.progress })),
    };

    await ctx.supabase.from("weekly_reviews").insert({ user_id: ctx.userId, week_start: weekStart, stats });

    return { ok: true, result: stats };
  },
};

export const weeklyReviewTools = [weeklyReviewGenerate];
