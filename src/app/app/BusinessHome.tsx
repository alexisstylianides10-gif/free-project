"use client";

import Link from "next/link";
import { ChevronRight, CheckCircle2, Circle, Flame, TrendingUp } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBusinessProfile, useBusinessMilestones, useBusinessMetrics } from "@/lib/hooks/domain";
import { Card, CardContent } from "@/components/ui/Card";
import { StatTile, StreakStat } from "@/components/shared/StatTile";
import { RadialStat } from "@/components/shared/RadialStat";
import { cn } from "@/lib/utils";

const HOVER_LIFT = "lg:transition-all lg:duration-200 lg:hover:-translate-y-1 lg:hover:shadow-glow-accent";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function BusinessHome() {
  const { user, profile } = useAuth();
  const { data: businessProfile } = useBusinessProfile(user?.id);
  const { data: milestones } = useBusinessMilestones(user?.id);
  const { data: metrics } = useBusinessMetrics(user?.id);

  const nextMilestones = milestones.filter((m) => m.status !== "done").slice(0, 3);
  const doneCount = milestones.filter((m) => m.status === "done").length;
  const latestMetric = metrics[0];
  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const milestonePercent = milestones.length ? Math.round((doneCount / milestones.length) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <div className="bg-ambient-glow mb-6 lg:mb-8">
        <div className="relative">
          <h1 className="text-[22px] font-bold text-foreground lg:text-[28px]">
            {greeting()}, <span className="text-gradient-brand">{firstName}</span> 👋
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground lg:text-base">Here&rsquo;s where your business stands today.</p>
        </div>
      </div>

      <div className="space-y-7 pb-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6 lg:space-y-0 lg:pb-0">
        <Card className="lg:hidden">
          <CardContent className="flex items-stretch gap-4 p-4">
            <StatTile label="Milestones" value={milestonePercent} tone="future" />
            <div className="w-px bg-border" />
            <StreakStat days={profile?.streak_count ?? 0} />
          </CardContent>
        </Card>

        <Card className="hidden overflow-hidden border-accent/20 lg:col-start-2 lg:block">
          <CardContent className="relative p-5">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-mission opacity-20 blur-2xl" />
            <div className="relative flex items-center justify-center">
              <RadialStat label="Milestones" value={milestonePercent} tone="future" size={104} strokeWidth={8} />
            </div>
            <div className="relative mt-4 flex items-center justify-center gap-1.5 border-t border-border pt-4 text-sm font-bold text-foreground">
              <span aria-hidden>🔥</span>
              {profile?.streak_count ?? 0}
              <span className="text-xs font-medium text-muted-foreground">day streak</span>
            </div>
          </CardContent>
        </Card>

        {businessProfile?.business_idea && (
          <Card className="lg:col-start-2">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your idea</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{businessProfile.business_idea}</p>
            </CardContent>
          </Card>
        )}

        <section className="lg:col-start-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Next up</h2>
            <Link href="/app/school" className="flex items-center gap-0.5 text-xs font-semibold text-accent">
              Plan <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {nextMilestones.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                {milestones.length === 0 ? "No milestones yet — check your Plan tab." : "All caught up on milestones!"}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {nextMilestones.map((m) => (
                <Card key={m.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    {m.status === "in_progress" ? (
                      <Flame className="h-5 w-5 shrink-0 text-warning" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{m.title}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-start-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Latest metric</h2>
            <Link href="/app/future" className="flex items-center gap-0.5 text-xs font-semibold text-accent">
              Grow <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <TrendingUp className="h-5 w-5 shrink-0 text-accent" />
              {latestMetric ? (
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {latestMetric.value} <span className="font-normal text-muted-foreground">{latestMetric.metric_key}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{latestMetric.logged_date}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No metrics logged yet — head to Grow to log one.</p>
              )}
            </CardContent>
          </Card>
        </section>

        <Link href="/app/coach" className="lg:col-start-2">
          <Card className={cn("border-accent/30", HOVER_LIFT)}>
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
              <p className="text-sm text-foreground">Ask AI Coach what to focus on next.</p>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
