"use client";

import { useMemo } from "react";
import { AlertTriangle, BarChart3, Repeat, Sparkles, Target, TrendingUp } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { computeInsights } from "@/lib/aiEngine";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { daysBetween, formatDayLabel, formatMoney, todayISO } from "@/lib/utils";

export default function InsightsPage() {
  const tasks = useAlxioum((s) => s.tasks);
  const events = useAlxioum((s) => s.events);
  const goals = useAlxioum((s) => s.goals);
  const habits = useAlxioum((s) => s.habits);
  const transactions = useAlxioum((s) => s.transactions);
  const lists = useAlxioum((s) => s.lists);
  const memory = useAlxioum((s) => s.memory);

  const today = todayISO();

  const state = useMemo(
    () => ({ tasks, events, goals, habits, transactions, lists, memory }),
    [tasks, events, goals, habits, transactions, lists, memory]
  );

  const base = computeInsights(state);

  const upcomingTasks = tasks.filter((t) => !t.done && t.dueDate && daysBetween(today, t.dueDate) >= 0 && daysBetween(today, t.dueDate) <= 7);

  const monthTx = transactions.filter((t) => new Date(t.date + "T00:00:00").getMonth() === new Date().getMonth() && t.amount < 0);
  const monthSpend = monthTx.reduce((s, t) => s + Math.abs(t.amount), 0);

  const staleGoal = goals.find((g) => g.progress < 70);

  const sections = [
    {
      icon: AlertTriangle,
      title: "Upcoming pressure",
      body:
        upcomingTasks.length > 0
          ? `You have ${upcomingTasks.length} deadline${upcomingTasks.length > 1 ? "s" : ""} in the next 7 days: ${upcomingTasks
              .slice(0, 3)
              .map((t) => `${t.title} (${formatDayLabel(t.dueDate!)})`)
              .join(", ")}${upcomingTasks.length > 3 ? "…" : ""}.`
          : "Nothing pressing in the next 7 days.",
      tone: upcomingTasks.length > 2 ? "warning" : "neutral",
    },
    {
      icon: TrendingUp,
      title: "Productivity",
      body: base.find((i) => i.title === "Productivity pattern")?.body ?? "Complete a few more tasks and Alxioum will start noticing your patterns.",
      tone: "neutral",
    },
    {
      icon: Target,
      title: "Goals",
      body: staleGoal
        ? `"${staleGoal.name}" is at ${staleGoal.progress}% — worth a focused push this week.`
        : "Your active goals are progressing steadily.",
      tone: "neutral",
    },
    {
      icon: Repeat,
      title: "Habits",
      body: base.find((i) => i.title === "Habit consistency")?.body ?? "Start a habit and Alxioum will track your consistency here.",
      tone: "neutral",
    },
    {
      icon: BarChart3,
      title: "Spending",
      body: `You've spent ${formatMoney(monthSpend)} so far this month across ${monthTx.length} transactions.`,
      tone: "neutral",
    },
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-foreground">Insights</h1>
        <p className="text-[13.5px] text-muted-foreground">Not more analytics — just help understanding your life.</p>
      </div>

      {tasks.length === 0 && goals.length === 0 && habits.length === 0 ? (
        <EmptyState icon={Sparkles} title="Nothing to analyze yet" body="As you use Alxioum, patterns across your tasks, goals, habits, and spending will show up here." />
      ) : (
        <div className="space-y-3">
          {sections.map((s) => (
            <Card key={s.title} className={`flex items-start gap-3 p-4 ${s.tone === "warning" ? "border-warning/30 bg-warning-soft/30" : ""}`}>
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.tone === "warning" ? "bg-warning-soft text-warning" : "bg-accent-soft text-accent"}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-foreground">{s.title}</p>
                <p className="mt-0.5 text-[13.5px] text-muted-foreground">{s.body}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
