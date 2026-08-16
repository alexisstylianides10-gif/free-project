"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAlxioum } from "@/lib/store";
import { formatDayLabel, daysBetween, todayISO } from "@/lib/utils";
import { JOURNEY_STAGES, stageIndex } from "@/lib/business/journeyStages";
import { computeBusinessHealth, HEALTH_DIMENSION_LABEL, HEALTH_STATUS_LABEL, HealthDimensionStatus } from "@/lib/business/health";

const HEALTH_TONE: Record<HealthDimensionStatus, "success" | "accent" | "warning" | "danger" | "neutral"> = {
  good: "success",
  growing: "accent",
  needs_validation: "warning",
  weak: "danger",
  unknown: "neutral",
};

export default function BusinessDetailPage() {
  const params = useParams<{ businessId: string }>();
  const businessId = params.businessId;

  const businesses = useAlxioum((s) => s.businesses);
  const goals = useAlxioum((s) => s.goals);
  const businessMilestones = useAlxioum((s) => s.businessMilestones);
  const businessMetrics = useAlxioum((s) => s.businessMetrics);
  const businessInsights = useAlxioum((s) => s.businessInsights);
  const businessExperiments = useAlxioum((s) => s.businessExperiments);
  const businessCustomers = useAlxioum((s) => s.businessCustomers);
  const toggleBusinessMilestone = useAlxioum((s) => s.toggleBusinessMilestone);

  const business = businesses.find((b) => b.id === businessId);
  const goal = business ? goals.find((g) => g.id === business.goalId) : undefined;
  const milestones = useMemo(() => businessMilestones.filter((m) => m.businessId === businessId).sort((a, b) => a.sortOrder - b.sortOrder), [businessMilestones, businessId]);
  const metrics = useMemo(() => businessMetrics.filter((m) => m.businessId === businessId), [businessMetrics, businessId]);
  const insights = useMemo(() => businessInsights.filter((i) => i.businessId === businessId), [businessInsights, businessId]);
  const experiments = useMemo(() => businessExperiments.filter((e) => e.businessId === businessId), [businessExperiments, businessId]);
  const customers = useMemo(() => businessCustomers.filter((c) => c.businessId === businessId), [businessCustomers, businessId]);

  if (!business) {
    return (
      <div className="space-y-4">
        <Link href="/app/goals" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Goals
        </Link>
        <p className="text-sm text-muted-foreground">This business couldn&apos;t be found — it may have been deleted.</p>
      </div>
    );
  }

  const overallProgress = milestones.length > 0 ? Math.round((milestones.filter((m) => m.done).length / milestones.length) * 100) : 0;
  const health = computeBusinessHealth(business, milestones, metrics, insights, experiments, customers);
  const openRisks = insights.filter((i) => i.kind === "risk" && i.status === "open");
  const nextMilestone = milestones.find((m) => !m.done);
  const daysLeft = goal?.targetDate ? daysBetween(todayISO(), goal.targetDate) : null;

  return (
    <div className="space-y-5">
      <Link href="/app/goals" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Goals
      </Link>

      {/* Business Snapshot */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Business Snapshot</p>
          <h1 className="mt-1 font-serif text-[24px] font-medium tracking-tight text-foreground">{business.name}</h1>
          {business.ideaSummary && <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">{business.ideaSummary}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="accent">{JOURNEY_STAGES[stageIndex(business.stage)]?.icon} {JOURNEY_STAGES[stageIndex(business.stage)]?.label}</Badge>
          <Badge tone={business.status === "building" ? "success" : "neutral"}>{business.status === "building" ? "Building" : business.status === "paused" ? "Paused" : "Archived"}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SnapshotStat label="Customers" value={String(customers.length)} />
        <SnapshotStat
          label="Revenue"
          value={goal ? `${goal.measurementCurrent}${goal.measurementUnit ? ` ${goal.measurementUnit}` : ""}` : "—"}
        />
        <SnapshotStat label="Main goal" value={goal?.measurementTarget !== undefined ? `${goal.measurementTarget} ${goal.measurementUnit ?? ""}`.trim() : "Not set"} />
        <SnapshotStat label="Biggest risk" value={openRisks[0]?.title ?? "None flagged yet"} />
      </div>

      {/* Overall progress */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold text-foreground">Overall progress</p>
            <span className="text-[12.5px] font-medium tabular-nums text-muted-foreground">{overallProgress}%</span>
          </div>
          <ProgressBar value={overallProgress} className="mt-2" />
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
            {daysLeft !== null && <span>{daysLeft >= 0 ? `${daysLeft} days to target date` : "Target date passed"}</span>}
            {nextMilestone && (
              <button onClick={() => toggleBusinessMilestone(nextMilestone.id)} className="flex items-center gap-1 font-medium text-accent hover:opacity-80">
                <Check className="h-3 w-3" /> Next: {nextMilestone.title}
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Business Health */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-foreground">Business Health</p>
            <span className="flex items-center gap-1 text-[13px] font-semibold tabular-nums text-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-accent" /> {health.overall !== null ? `${health.overall} / 100` : "Not enough data yet"}
            </span>
          </div>
          <div className="space-y-2">
            {(Object.keys(HEALTH_DIMENSION_LABEL) as (keyof typeof HEALTH_DIMENSION_LABEL)[]).map((key) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-[12.5px] text-muted-foreground">{HEALTH_DIMENSION_LABEL[key]}</span>
                <Badge tone={HEALTH_TONE[health[key]]}>{HEALTH_STATUS_LABEL[health[key]]}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Business Journey */}
      <div>
        <p className="mb-2 text-[13px] font-semibold text-foreground">Business Journey</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {JOURNEY_STAGES.map((stageDef, i) => {
            const stageMilestones = milestones.filter((m) => m.stage === stageDef.key);
            const done = stageMilestones.filter((m) => m.done).length;
            const isCurrent = stageDef.key === business.stage;
            const isPast = i < stageIndex(business.stage);
            return (
              <Card key={stageDef.key} className={isCurrent ? "border-accent/50 bg-accent-soft/30" : undefined}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">{stageDef.icon}</span>
                      <span className={`text-[13px] font-semibold ${isCurrent ? "text-accent" : "text-foreground"}`}>{stageDef.label}</span>
                    </div>
                    {isCurrent && <Badge tone="accent">Current</Badge>}
                    {isPast && !isCurrent && <Badge tone="success">Done</Badge>}
                  </div>
                  {stageMilestones.length > 0 && (
                    <div className="mt-2.5 space-y-1">
                      {stageMilestones.map((m) => (
                        <button key={m.id} onClick={() => toggleBusinessMilestone(m.id)} className="flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left hover:bg-muted/60">
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${m.done ? "border-accent bg-accent text-accent-foreground" : "border-border"}`}>
                            {m.done && <Check className="h-3 w-3" />}
                          </span>
                          <span className={`text-[12px] ${m.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{m.title}</span>
                        </button>
                      ))}
                      <p className="pl-1 pt-1 text-[11px] text-muted-foreground">
                        {done} / {stageMilestones.length} milestones
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SnapshotStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="truncate text-[15px] font-semibold text-foreground">{value}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
