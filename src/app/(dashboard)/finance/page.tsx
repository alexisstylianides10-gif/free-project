"use client";

import { useMemo } from "react";
import { Plus, Sparkles, Wallet as WalletIcon, CreditCard } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDayLabel, formatMoney } from "@/lib/utils";

export default function FinancePage() {
  const transactions = useAlxioum((s) => s.transactions);
  const budgets = useAlxioum((s) => s.budgets);
  const subscriptions = useAlxioum((s) => s.subscriptions);
  const openQuickAdd = useAlxioum((s) => s.openQuickAdd);

  const now = new Date();
  const monthTx = useMemo(
    () => transactions.filter((t) => new Date(t.date + "T00:00:00").getMonth() === now.getMonth()),
    [transactions, now]
  );

  const income = monthTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = monthTx.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const balance = income - expenses;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthTx) {
      if (t.amount >= 0) continue;
      map.set(t.category, (map.get(t.category) ?? 0) + Math.abs(t.amount));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthTx]);
  const maxCategorySpend = Math.max(1, ...byCategory.map(([, v]) => v));

  const subsTotal = subscriptions.reduce((s, sub) => s + sub.amount, 0);

  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projected = daysInMonth > 0 ? Math.round((expenses / Math.max(1, dayOfMonth)) * daysInMonth) : expenses;

  const topOverBudget = budgets
    .map((b) => ({ ...b, spent: byCategory.find(([c]) => c === b.category)?.[1] ?? 0 }))
    .find((b) => b.spent > b.limit);

  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-foreground">Finance</h1>
          <p className="text-[13.5px] text-muted-foreground">A clear view of your money — nothing hidden.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => openQuickAdd("expense")}>
          <Plus className="h-4 w-4" /> Add expense
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Balance" value={formatMoney(balance)} />
        <Metric label="Income" value={formatMoney(income)} tone="success" />
        <Metric label="Expenses" value={formatMoney(-expenses)} tone="danger" />
        <Metric label="This month" value={formatMoney(-projected)} sub="projected" />
      </div>

      {topOverBudget && (
        <Card className="flex items-start gap-2.5 border-warning/30 bg-warning-soft/40 p-4">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-[13.5px] text-foreground">
            You&apos;ve spent {formatMoney(topOverBudget.spent)} on {topOverBudget.category} this month, above your {formatMoney(topOverBudget.limit)} budget.
          </p>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <section>
            <SectionLabel>Spending by category</SectionLabel>
            <Card className="mt-3 p-4">
              {byCategory.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">No spending recorded this month yet.</p>
              ) : (
                <div className="space-y-3">
                  {byCategory.map(([cat, amount]) => (
                    <div key={cat}>
                      <div className="mb-1 flex items-center justify-between text-[13px]">
                        <span className="font-medium text-foreground">{cat}</span>
                        <span className="text-muted-foreground">{formatMoney(amount)}</span>
                      </div>
                      <ProgressBar value={(amount / maxCategorySpend) * 100} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <section>
            <SectionLabel>Budgets</SectionLabel>
            <Card className="mt-3 divide-y divide-border">
              {budgets.map((b) => {
                const spent = byCategory.find(([c]) => c === b.category)?.[1] ?? 0;
                const pct = Math.min(100, (spent / b.limit) * 100);
                const over = spent > b.limit;
                return (
                  <div key={b.category} className="p-4">
                    <div className="mb-1.5 flex items-center justify-between text-[13px]">
                      <span className="font-medium text-foreground">{b.category}</span>
                      <span className={over ? "text-danger" : "text-muted-foreground"}>
                        {formatMoney(spent)} / {formatMoney(b.limit)}
                      </span>
                    </div>
                    <ProgressBar value={pct} tone={over ? "warning" : "accent"} />
                  </div>
                );
              })}
            </Card>
          </section>

          <section>
            <SectionLabel>Recent transactions</SectionLabel>
            <Card className="mt-3 divide-y divide-border">
              {recent.length === 0 ? (
                <div className="p-4">
                  <EmptyState icon={WalletIcon} title="No transactions yet" body="Add an expense to start tracking your spending." />
                </div>
              ) : (
                recent.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3.5">
                    <div>
                      <p className="text-[13.5px] font-medium text-foreground">{t.merchant}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {formatDayLabel(t.date)} · {t.category}
                      </p>
                    </div>
                    <p className={`text-[13.5px] font-semibold ${t.amount < 0 ? "text-foreground" : "text-success"}`}>
                      {formatMoney(t.amount)}
                    </p>
                  </div>
                ))
              )}
            </Card>
          </section>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <section>
            <SectionLabel>Subscriptions</SectionLabel>
            <Card className="mt-3 divide-y divide-border">
              <div className="flex items-center justify-between p-3.5">
                <p className="text-[13px] text-muted-foreground">{subscriptions.length} active</p>
                <p className="text-[13.5px] font-semibold text-foreground">{formatMoney(subsTotal)}/mo</p>
              </div>
              {subscriptions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-foreground">{s.name}</p>
                    <p className="text-[12px] text-muted-foreground">Renews {formatDayLabel(s.renewsOn)}</p>
                  </div>
                  <p className="text-[13px] font-medium text-foreground">{formatMoney(s.amount)}</p>
                </div>
              ))}
            </Card>
          </section>

          <section>
            <SectionLabel>AI insights</SectionLabel>
            <Card className="mt-3 space-y-3 border-accent/25 bg-accent-soft/20 p-4">
              <InsightLine text={`You've spent ${formatMoney(expenses)} so far this month.`} />
              <InsightLine text={`Based on your spending so far, you're on track for around ${formatMoney(projected)} this month.`} />
              <InsightLine text={`You have ${subscriptions.length} subscriptions costing ${formatMoney(subsTotal)}/month.`} />
              <p className="pt-1 text-[11.5px] text-muted-foreground">
                These are observations from your data, not financial advice.
              </p>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>;
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "success" | "danger" }) {
  return (
    <Card className="p-4">
      <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-[19px] font-semibold tracking-tight ${tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-foreground"}`}>
        {value}
      </p>
      {sub && <p className="text-[11.5px] text-muted-foreground">{sub}</p>}
    </Card>
  );
}

function InsightLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
      <p className="text-[13px] text-foreground">{text}</p>
    </div>
  );
}
