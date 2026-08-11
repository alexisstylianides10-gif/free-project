"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Check, Calendar as CalendarIcon, X } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { generateDailyBriefing, generateRecommendation } from "@/lib/aiEngine";
import { useGreeting } from "@/lib/useGreeting";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatMoney, formatTime12, todayISO } from "@/lib/utils";
import Link from "next/link";

export default function HomePage() {
  const greeting = useGreeting();
  const router = useRouter();
  const profile = useAlxioum((s) => s.profile);
  const tasks = useAlxioum((s) => s.tasks);
  const events = useAlxioum((s) => s.events);
  const goals = useAlxioum((s) => s.goals);
  const habits = useAlxioum((s) => s.habits);
  const transactions = useAlxioum((s) => s.transactions);
  const lists = useAlxioum((s) => s.lists);
  const memory = useAlxioum((s) => s.memory);
  const toggleTask = useAlxioum((s) => s.toggleTask);
  const applyAction = useAlxioum((s) => s.applyAction);
  const sendChatMessage = useAlxioum((s) => s.sendChatMessage);

  const [dismissedRec, setDismissedRec] = useState(false);
  const [ask, setAsk] = useState("");

  const engineState = useMemo(
    () => ({ tasks, events, goals, habits, transactions, lists, memory }),
    [tasks, events, goals, habits, transactions, lists, memory]
  );

  const briefing = useMemo(() => generateDailyBriefing(engineState), [engineState]);
  const recommendation = useMemo(() => generateRecommendation(engineState), [engineState]);

  const today = todayISO();
  const todaysSchedule = events
    .filter((e) => e.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const remainingTasks = tasks.filter((t) => !t.done).length;
  const activeGoals = goals.filter((g) => !g.archived).length;
  const habitsToday = habits.filter((h) => h.history[today]).length;
  const spentToday = transactions
    .filter((t) => t.date === today && t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  function submitAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!ask.trim()) return;
    sendChatMessage(ask);
    router.push("/ai");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-foreground">
          {greeting}, {profile.name}.
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Here&apos;s what matters today.</p>
      </div>

      {briefing.length > 0 && (
        <section>
          <SectionLabel>Today</SectionLabel>
          <div className="mt-3 space-y-2">
            {briefing.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
              >
                <Card className="flex items-center gap-3 px-4 py-3">
                  <span className="text-[15px] leading-none">{item.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-foreground">{item.title}</p>
                    <p className="text-[12.5px] text-muted-foreground">{item.subtitle}</p>
                  </div>
                  {item.taskId && (
                    <button
                      onClick={() => toggleTask(item.taskId!)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-success hover:bg-success-soft hover:text-success"
                      aria-label="Mark done"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between">
          <SectionLabel>Your day</SectionLabel>
          <Link href="/today" className="flex items-center gap-1 text-[12.5px] font-medium text-accent hover:opacity-80">
            Full timeline <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <Card className="mt-3 p-4">
          {todaysSchedule.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Nothing scheduled today.</p>
          ) : (
            <div className="scrollbar-none flex gap-2 overflow-x-auto">
              {todaysSchedule.map((e) => (
                <div key={e.id} className="flex min-w-[104px] flex-col gap-1 rounded-lg border border-border px-3 py-2.5">
                  <span className="text-[11.5px] font-medium text-muted-foreground">{formatTime12(e.startTime)}</span>
                  <span className="truncate text-[13px] font-semibold text-foreground">{e.title}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {recommendation && !dismissedRec && (
        <section>
          <SectionLabel>AI recommendation</SectionLabel>
          <Card className="mt-3 border-accent/25 bg-accent-soft/30 p-5">
            <p className="text-[14px] leading-relaxed text-foreground">{recommendation.text}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {recommendation.action && (
                <>
                  <Button
                    size="sm"
                    onClick={() => {
                      applyAction(recommendation.action!);
                      setDismissedRec(true);
                    }}
                  >
                    Do it
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => router.push("/today")}>
                    <CalendarIcon className="h-3.5 w-3.5" /> Schedule
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => setDismissedRec(true)}>
                <X className="h-3.5 w-3.5" /> Dismiss
              </Button>
            </div>
          </Card>
        </section>
      )}

      <section>
        <SectionLabel>Quick progress</SectionLabel>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Tasks" value={`${remainingTasks}`} sub="remaining" href="/tasks" />
          <StatCard label="Goals" value={`${activeGoals}`} sub="active" href="/goals" />
          <StatCard label="Habits" value={`${habitsToday}/${habits.length}`} sub="today" href="/habits" />
          <StatCard label="Spending" value={formatMoney(spentToday)} sub="today" href="/finance" />
        </div>
      </section>

      <form onSubmit={submitAsk}>
        <Card className="flex items-center gap-2 p-2 shadow-raised">
          <input
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            placeholder="Ask Alxioum anything..."
            className="h-10 flex-1 bg-transparent px-2.5 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <Button type="submit" size="sm" disabled={!ask.trim()}>
            Ask
          </Button>
        </Card>
      </form>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>;
}

function StatCard({ label, value, sub, href }: { label: string; value: string; sub: string; href: string }) {
  return (
    <Link href={href}>
      <Card className="p-4 transition-colors hover:border-border-strong">
        <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-[20px] font-semibold tracking-tight text-foreground">{value}</p>
        <p className="text-[12px] text-muted-foreground">{sub}</p>
      </Card>
    </Link>
  );
}
