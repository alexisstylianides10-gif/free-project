"use client";

import { useState } from "react";
import { TrendingUp, Sparkles, Users, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBusinessMetrics, useBusinessContentIdeas, useBusinessCompetitors } from "@/lib/hooks/domain";
import { supabase } from "@/lib/supabase/client";
import { authedFetch } from "@/lib/api";
import { todayISO } from "@/lib/utils";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const METRIC_OPTIONS = [
  { key: "revenue", label: "Revenue ($)" },
  { key: "customers", label: "Customers" },
  { key: "signups", label: "Signups" },
];

const PLATFORM_OPTIONS = [
  { key: "instagram", label: "Instagram" },
  { key: "blog", label: "Blog" },
  { key: "email", label: "Email" },
  { key: "other", label: "Other" },
];

export default function BusinessGrowHome() {
  const { user } = useAuth();
  const { data: metrics, refetch: refetchMetrics } = useBusinessMetrics(user?.id);
  const { data: contentIdeas, refetch: refetchIdeas } = useBusinessContentIdeas(user?.id);
  const { data: competitors, refetch: refetchCompetitors } = useBusinessCompetitors(user?.id);

  const [metricKey, setMetricKey] = useState(METRIC_OPTIONS[0].key);
  const [metricValue, setMetricValue] = useState("");
  const [loggingMetric, setLoggingMetric] = useState(false);

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

  async function generateContent(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || generating) return;
    setGenerating(true);
    setContentError(null);
    try {
      const res = await authedFetch("/api/business/generate-content", { method: "POST", body: JSON.stringify({ platform, topic }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't generate content.");
      setTopic("");
      await refetchIdeas();
    } catch (err) {
      setContentError(err instanceof Error ? err.message : "Couldn't generate content.");
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
    <div className="space-y-7 pb-4 animate-fade-in">
      <ScreenHeader title="Grow" subtitle="Track your numbers, draft content, and watch the market." />

      <section>
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Metrics</h2>
        </div>
        <Card>
          <CardContent className="p-4">
            <form onSubmit={logMetric} className="flex items-center gap-2">
              <select
                value={metricKey}
                onChange={(e) => setMetricKey(e.target.value)}
                className="h-11 rounded-full border border-border bg-surface px-3 text-xs font-medium text-foreground outline-none"
              >
                {METRIC_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                value={metricValue}
                onChange={(e) => setMetricValue(e.target.value)}
                type="number"
                placeholder="Value"
                className="h-11 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
              />
              <Button size="sm" type="submit" disabled={loggingMetric || !metricValue.trim()}>
                {loggingMetric ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Log"}
              </Button>
            </form>

            {metrics.length === 0 ? (
              <p className="mt-4 text-center text-sm text-muted-foreground">No metrics logged yet.</p>
            ) : (
              <div className="mt-4 space-y-1.5">
                {metrics.slice(0, 6).map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {METRIC_OPTIONS.find((o) => o.key === m.metric_key)?.label ?? m.metric_key} · {m.logged_date}
                    </span>
                    <span className="font-semibold text-foreground">{m.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Content Helper</h2>
        </div>
        <Card>
          <CardContent className="p-4">
            <form onSubmit={generateContent} className="space-y-2.5">
              <div className="flex gap-2">
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="h-11 rounded-full border border-border bg-surface px-3 text-xs font-medium text-foreground outline-none"
                >
                  {PLATFORM_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="What's it about?"
                  className="h-11 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
                />
              </div>
              <Button size="md" type="submit" className="w-full" disabled={generating || !topic.trim()}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate draft"}
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
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Competitors</h2>
        </div>
        <Card>
          <CardContent className="p-4">
            {competitors.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">No competitors added yet.</p>
            ) : (
              <div className="space-y-2">
                {competitors.map((c) => (
                  <div key={c.id} className="rounded-xl bg-muted px-3.5 py-2.5">
                    <p className="text-sm font-semibold text-foreground">{c.name}</p>
                    {c.url && <p className="truncate text-xs text-muted-foreground">{c.url}</p>}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={addCompetitor} className="mt-3 flex items-center gap-2">
              <input
                value={competitorName}
                onChange={(e) => setCompetitorName(e.target.value)}
                placeholder="Name"
                className="h-11 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
              />
              <input
                value={competitorUrl}
                onChange={(e) => setCompetitorUrl(e.target.value)}
                placeholder="URL (optional)"
                className="h-11 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
              />
              <button
                type="submit"
                disabled={addingCompetitor || !competitorName.trim()}
                aria-label="Add competitor"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-white shadow-glow-accent transition-opacity disabled:opacity-40"
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
