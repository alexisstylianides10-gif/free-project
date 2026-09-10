"use client";

import { useMemo, useState } from "react";
import { TrendingUp, Sparkles, Users, Loader2, Plus, Receipt, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBusinessMetrics, useBusinessContentIdeas, useBusinessCompetitors, useBusinessExpenses } from "@/lib/hooks/domain";
import { supabase } from "@/lib/supabase/client";
import { authedFetch } from "@/lib/api";
import { todayISO } from "@/lib/utils";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";

const METRIC_KEYS: string[] = ["revenue", "customers", "signups"];
const PLATFORM_KEYS: string[] = ["instagram", "blog", "email", "other"];
const EXPENSE_CATEGORY_KEYS: string[] = ["software_tools", "marketing", "inventory", "contractors", "shipping", "rent", "other"];

export default function BusinessGrowHome() {
  const { user } = useAuth();
  const t = useTranslations("BusinessGrowHome");
  const METRIC_OPTIONS = METRIC_KEYS.map((key) => ({ key, label: t(`metricOptions.${key}`) }));
  const PLATFORM_OPTIONS = PLATFORM_KEYS.map((key) => ({ key, label: t(`platformOptions.${key}`) }));
  const EXPENSE_CATEGORY_OPTIONS = EXPENSE_CATEGORY_KEYS.map((key) => ({ key, label: t(`expenseCategoryOptions.${key}`) }));
  const { data: metrics, error: metricsError, refetch: refetchMetrics } = useBusinessMetrics(user?.id);
  const { data: contentIdeas, error: ideasError, refetch: refetchIdeas } = useBusinessContentIdeas(user?.id);
  const { data: competitors, error: competitorsError, refetch: refetchCompetitors } = useBusinessCompetitors(user?.id);
  const { data: expenses, error: expensesError, refetch: refetchExpenses } = useBusinessExpenses(user?.id);

  // First non-null error wins, same convention as StudentSchoolHome's pageError.
  const pageError = metricsError ?? ideasError ?? competitorsError ?? expensesError;

  const [metricKey, setMetricKey] = useState(METRIC_OPTIONS[0].key);
  const [metricValue, setMetricValue] = useState("");
  const [loggingMetric, setLoggingMetric] = useState(false);

  const [expenseCategory, setExpenseCategory] = useState(EXPENSE_CATEGORY_OPTIONS[0].key);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [loggingExpense, setLoggingExpense] = useState(false);

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount), 0), [expenses]);

  const [platform, setPlatform] = useState(PLATFORM_OPTIONS[0].key);
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const [competitorName, setCompetitorName] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [addingCompetitor, setAddingCompetitor] = useState(false);

  async function logMetric(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user || !metricValue.trim() || loggingMetric) return;
    const value = Number(metricValue);
    if (!Number.isFinite(value)) return;
    setLoggingMetric(true);
    try {
      await supabase.from("business_metrics").insert({ user_id: user.id, metric_key: metricKey, value, logged_date: todayISO() });
      setMetricValue("");
      await refetchMetrics();
    } finally {
      setLoggingMetric(false);
    }
  }

  async function logExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user || !expenseAmount.trim() || loggingExpense) return;
    const amount = Number(expenseAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setLoggingExpense(true);
    try {
      await supabase.from("business_expenses").insert({
        user_id: user.id,
        category: expenseCategory,
        description: expenseDescription.trim() || null,
        amount,
        logged_date: todayISO(),
      });
      setExpenseAmount("");
      setExpenseDescription("");
      await refetchExpenses();
    } finally {
      setLoggingExpense(false);
    }
  }

  async function generateContent(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || generating) return;
    setGenerating(true);
    setContentError(null);
    try {
      const res = await authedFetch("/api/business/generate-content", { method: "POST", body: JSON.stringify({ platform, topic }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("couldNotGenerate"));
      setTopic("");
      await refetchIdeas();
    } catch (err) {
      setContentError(err instanceof Error ? err.message : t("couldNotGenerate"));
    } finally {
      setGenerating(false);
    }
  }

  async function addCompetitor(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user || !competitorName.trim() || addingCompetitor) return;
    setAddingCompetitor(true);
    try {
      await supabase.from("business_competitors").insert({ user_id: user.id, name: competitorName.trim(), url: competitorUrl.trim() || null });
      setCompetitorName("");
      setCompetitorUrl("");
      await refetchCompetitors();
    } finally {
      setAddingCompetitor(false);
    }
  }

  return (
    <div className="space-y-7 pb-4">
      <ScreenHeader title={t("title")} subtitle={t("subtitle")} action={<NotificationBell className="md:hidden" />} />

      {pageError && (
        <Card className="border border-danger/40">
          <CardContent className="flex items-start gap-2.5 p-4 text-sm text-danger">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("loadError", { error: pageError })}</span>
          </CardContent>
        </Card>
      )}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("metrics")}</h2>
        </div>
        <Card>
          <CardContent className="p-4">
            <form onSubmit={logMetric} className="flex items-center gap-2">
              <Select value={metricKey} onChange={(e) => setMetricKey(e.target.value)} className="h-11 w-auto shrink-0 pr-8 text-xs font-medium">
                {METRIC_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <Input value={metricValue} onChange={(e) => setMetricValue(e.target.value)} type="number" placeholder={t("value")} className="flex-1" />
              <Button size="sm" type="submit" disabled={loggingMetric || !metricValue.trim()}>
                {loggingMetric ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("log")}
              </Button>
            </form>

            {metrics.length > 0 &&
              (() => {
                const latest = metrics[0];
                const prior = metrics.slice(1).find((m) => m.metric_key === latest.metric_key);
                if (!prior) return null;
                const delta = latest.value - prior.value;
                if (delta === 0) return null;
                return (
                  <Badge tone={delta > 0 ? "success" : "danger"} className="mt-3">
                    {delta > 0 ? "+" : ""}
                    {delta} {t("vsLastEntry", { metric: METRIC_OPTIONS.find((o) => o.key === latest.metric_key)?.label ?? latest.metric_key })}
                  </Badge>
                );
              })()}

            {metrics.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title={t("noMetricsYet")}
                subtitle={t("noMetricsSubtitle")}
                bare
              />
            ) : (
              <>
                <p className="mb-2 mt-4 text-caption font-semibold uppercase tracking-wide text-muted-foreground">{t("recent")}</p>
                <div className="space-y-1.5">
                  {metrics.slice(0, 6).map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {METRIC_OPTIONS.find((o) => o.key === m.metric_key)?.label ?? m.metric_key} · {m.logged_date}
                      </span>
                      <span className="font-semibold text-foreground">{m.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("expenses")}</h2>
        </div>
        <Card>
          <CardContent className="p-4">
            <form onSubmit={logExpense} className="space-y-2.5">
              <div className="flex gap-2">
                <Select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="h-11 w-auto shrink-0 pr-8 text-xs font-medium">
                  {EXPENSE_CATEGORY_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </Select>
                <Input
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t("amount")}
                  className="flex-1"
                />
              </div>
              <div className="flex gap-2">
                <Input
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  placeholder={t("whatWasItFor")}
                  className="flex-1"
                />
                <Button size="sm" type="submit" disabled={loggingExpense || !expenseAmount.trim()}>
                  {loggingExpense ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("log")}
                </Button>
              </div>
            </form>

            {expenses.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title={t("noExpensesYet")}
                subtitle={t("noExpensesSubtitle")}
                bare
              />
            ) : (
              <>
                <div className="mt-4 flex items-center justify-between border-b border-border pb-2 text-sm">
                  <span className="font-semibold text-foreground">{t("totalSpent")}</span>
                  <span className="font-bold text-foreground">${totalExpenses.toFixed(2)}</span>
                </div>
                <p className="mb-2 mt-4 text-caption font-semibold uppercase tracking-wide text-muted-foreground">{t("recent")}</p>
                <div className="space-y-1.5">
                  {expenses.slice(0, 6).map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between text-sm">
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        {EXPENSE_CATEGORY_OPTIONS.find((o) => o.key === exp.category)?.label ?? exp.category}
                        {exp.description ? ` · ${exp.description}` : ""} · {exp.logged_date}
                      </span>
                      <span className="shrink-0 font-semibold text-foreground">${Number(exp.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("contentHelper")}</h2>
        </div>
        <Card>
          <CardContent className="p-4">
            <form onSubmit={generateContent} className="space-y-2.5">
              <div className="flex gap-2">
                <Select value={platform} onChange={(e) => setPlatform(e.target.value)} className="h-11 w-auto shrink-0 pr-8 text-xs font-medium">
                  {PLATFORM_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </Select>
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t("topicPlaceholder")} className="flex-1" />
              </div>
              <Button size="md" type="submit" className="w-full" disabled={generating || !topic.trim()}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : t("generateDraft")}
              </Button>
            </form>
            {contentError && <p className="mt-2 text-xs text-danger">{contentError}</p>}

            {contentIdeas.length > 0 && (
              <div className="mt-4 space-y-3">
                {contentIdeas.slice(0, 3).map((idea) => (
                  <div key={idea.id} className="rounded-xl bg-muted p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {PLATFORM_OPTIONS.find((o) => o.key === idea.platform)?.label ?? idea.platform} · {idea.topic}
                    </p>
                    <p className="mt-1.5 whitespace-pre-line text-sm text-foreground">{idea.generated_content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("competitors")}</h2>
        </div>
        <Card>
          <CardContent className="p-4">
            {competitors.length === 0 ? (
              <EmptyState
                icon={Users}
                title={t("noCompetitorsYet")}
                subtitle={t("noCompetitorsSubtitle")}
                bare
              />
            ) : (
              <>
                <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">{t("recent")}</p>
                <div className="space-y-2">
                  {competitors.map((c) => (
                    <div key={c.id} className="rounded-xl bg-muted px-3.5 py-2.5">
                      <p className="text-sm font-semibold text-foreground">{c.name}</p>
                      {c.url && <p className="truncate text-xs text-muted-foreground">{c.url}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}

            <form onSubmit={addCompetitor} className="mt-3 flex items-center gap-2">
              <Input value={competitorName} onChange={(e) => setCompetitorName(e.target.value)} placeholder={t("namePlaceholder")} className="flex-1" />
              <Input value={competitorUrl} onChange={(e) => setCompetitorUrl(e.target.value)} placeholder={t("urlPlaceholder")} className="flex-1" />
              <button
                type="submit"
                disabled={addingCompetitor || !competitorName.trim()}
                aria-label={t("addCompetitor")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-white shadow-raised transition-opacity disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
