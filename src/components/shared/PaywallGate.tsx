"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { isEntitled } from "@/lib/billing/entitlement";
import { Button } from "@/components/ui/Button";
import { branding } from "@/lib/branding";

/**
 * Wraps an AI-cost feature (AI Coach, the Study system) and shows an upsell
 * instead of `children` once the student's trial has run out and they
 * haven't subscribed. Reaching this component's non-entitled branch only
 * happens once plan_status has moved past "trialing-and-still-within-window"
 * — see isEntitled() in src/lib/billing/entitlement.ts.
 */
export function PaywallGate({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  if (!profile) return null;
  if (isEntitled(profile)) return <>{children}</>;

  const trialExpired = profile.plan_status === "trialing";

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center animate-fade-in">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow-accent">
        <Lock className="h-6 w-6 text-white" />
      </span>
      <h2 className="mt-6 text-xl font-bold text-foreground">
        {trialExpired ? "Your free trial has ended" : `Unlock ${branding.name} Plus`}
      </h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        AI Coach and the full Study system — material analysis, AI study plans, quizzes, flashcards, and your AI
        tutor — are part of {branding.name} Plus.
      </p>
      <Link href="/app/upgrade" className="mt-6 w-full max-w-xs">
        <Button size="lg" className="w-full">
          Upgrade to Plus — $9.99/mo
        </Button>
      </Link>
    </div>
  );
}
