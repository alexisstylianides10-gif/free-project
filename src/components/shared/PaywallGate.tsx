"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { isEntitled } from "@/lib/billing/entitlement";
import { getPlanOption } from "@/lib/billing/plans";
import { Button } from "@/components/ui/Button";
import { branding } from "@/lib/branding";

const DESCRIPTION_BY_TRACK = {
  student: "AI Coach and the full Study system — material analysis, AI study plans, quizzes, flashcards, and your AI tutor — are part of",
  business: "AI Coach, your business snapshot, milestone AI, and the marketing/content helper are part of",
} as const;

/**
 * Wraps an AI-cost feature (AI Coach, the Study/Business-OS system) and
 * shows a plan-activation screen instead of `children` once the trial has
 * run out and there's no active subscription. Reaching this component's
 * non-entitled branch only happens once plan_status has moved past
 * "trialing-and-still-within-window" — see isEntitled() in
 * src/lib/billing/entitlement.ts. Never calls this an "upgrade" — the
 * student/founder already chose their plan at /choose-plan; this screen
 * just activates the one they picked.
 */
export function PaywallGate({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  if (!profile) return null;
  if (isEntitled(profile)) return <>{children}</>;

  const trialExpired = profile.plan_status === "trialing";
  const track = profile.track;
  const monthlyPrice = getPlanOption(track, "monthly").priceUsd;

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center animate-fade-in">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow-accent">
        <Lock className="h-6 w-6 text-white" />
      </span>
      <h2 className="mt-6 text-xl font-bold text-foreground">
        {trialExpired ? "Your free trial has ended" : `Activate ${branding.name} Plus`}
      </h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        {DESCRIPTION_BY_TRACK[track]} {branding.name} Plus.
      </p>
      <Link href="/app/upgrade" className="mt-6 w-full max-w-xs">
        <Button size="lg" className="w-full">
          Activate — ${monthlyPrice}/mo
        </Button>
      </Link>
    </div>
  );
}
