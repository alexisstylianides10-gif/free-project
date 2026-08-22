"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Sparkles, Check } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { authedFetch } from "@/lib/api";
import { isEntitled } from "@/lib/billing/entitlement";
import { getPlanOption, TRACK_LABEL, type BillingInterval } from "@/lib/billing/plans";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { branding } from "@/lib/branding";

const PERKS_BY_TRACK = {
  student: [
    "AI Coach — your always-on mentor for school, skills, and career",
    "AI study plans built around your real exams and deadlines",
    "Upload notes, photos, or PDFs and get an instant AI breakdown",
    "AI tutor sessions, quizzes, and spaced-repetition flashcards",
  ],
  business: [
    "AI Coach — your always-on mentor for building your business",
    "An AI-generated snapshot and starter milestones for your idea",
    "AI-drafted marketing and content ideas for any platform",
    "Milestone, metrics, and competitor tracking in one place",
  ],
} as const;

const FREE_TAGLINE_BY_TRACK = {
  student: "School tracking — timetable, homework, exams, career matches, and your roadmap — is always free.",
  business: "Your business plan basics, milestone checklist, and metrics log are always free.",
} as const;

export default function UpgradePage() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutResult = searchParams.get("checkout");

  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onPlus = Boolean(profile && isEntitled(profile) && profile.plan === "plus");
  const track = profile?.track ?? "student";
  const planOption = getPlanOption(track, interval);

  async function startCheckout() {
    setError(null);
    setLoading("checkout");
    try {
      const res = await authedFetch("/api/billing/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ interval }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't start checkout.");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start checkout.");
      setLoading(null);
    }
  }

  async function openPortal() {
    setError(null);
    setLoading("portal");
    try {
      const res = await authedFetch("/api/billing/create-portal-session", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't open the billing portal.");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the billing portal.");
      setLoading(null);
    }
  }

  async function refreshAfterCheckout() {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  }

  const daysLeft = profile
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="space-y-6 pb-4 animate-fade-in">
      <ScreenHeader eyebrow={`${branding.name} Plus`} title="Unlock the full AI experience" />

      {checkoutResult === "success" && (
        <Card className="border-success/40">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <p className="text-sm text-foreground">
              {onPlus ? "You're on Alxioum Plus — enjoy!" : "Payment received — activating your plan…"}
            </p>
            {!onPlus && (
              <Button size="sm" variant="outline" onClick={refreshAfterCheckout} disabled={refreshing}>
                {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      {checkoutResult === "cancel" && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">Checkout was canceled — no charge was made.</CardContent>
        </Card>
      )}

      {profile?.plan_status === "trialing" && !onPlus && (
        <Card className="border-accent/30">
          <CardContent className="p-4 text-sm text-foreground">
            {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial.` : "Your free trial has ended."}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
            <Sparkles className="h-3.5 w-3.5" /> {branding.name} Plus — {TRACK_LABEL[track]}
          </p>

          {!onPlus && (
            <div className="mt-4 flex items-center gap-1 rounded-xl bg-muted p-1">
              {(["monthly", "yearly"] as const).map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInterval(i)}
                  className={
                    "flex-1 rounded-lg py-2 text-xs font-semibold transition-colors " +
                    (interval === i ? "bg-surface text-foreground shadow-subtle" : "text-muted-foreground")
                  }
                >
                  {i === "monthly" ? "Monthly" : "Yearly"}
                </button>
              ))}
            </div>
          )}

          <p className="mt-4 text-3xl font-extrabold text-foreground">
            ${planOption.priceUsd}
            <span className="text-base font-medium text-muted-foreground">/{interval === "monthly" ? "mo" : "yr"}</span>
          </p>

          <ul className="mt-5 space-y-3">
            {PERKS_BY_TRACK[track].map((perk) => (
              <li key={perk} className="flex items-start gap-2.5 text-sm text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {perk}
              </li>
            ))}
          </ul>

          {error && <p className="mt-4 text-sm text-danger">{error}</p>}

          <div className="mt-6 space-y-2.5">
            {onPlus ? (
              <Button size="lg" variant="outline" className="w-full" onClick={openPortal} disabled={loading !== null}>
                {loading === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage subscription"}
              </Button>
            ) : (
              <Button size="lg" className="w-full" onClick={startCheckout} disabled={loading !== null}>
                {loading === "checkout" ? <Loader2 className="h-4 w-4 animate-spin" /> : `Subscribe — $${planOption.priceUsd}/${interval === "monthly" ? "mo" : "yr"}`}
              </Button>
            )}
            <Button size="sm" variant="ghost" className="w-full" onClick={() => router.push("/app")}>
              Back to app
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">{FREE_TAGLINE_BY_TRACK[track]}</p>
    </div>
  );
}
