"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Check } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { authedFetch } from "@/lib/api";
import { isEntitled } from "@/lib/billing/entitlement";
import { getPlanOption, TRACK_LABEL, type BillingInterval } from "@/lib/billing/plans";
import { CheckoutForm } from "@/components/billing/CheckoutForm";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { branding } from "@/lib/branding";

const PERKS_BY_TRACK = {
  student: [
    "AI Coach: your always-on mentor for school, skills, and career",
    "AI study plans built around your real exams and deadlines",
    "Upload notes, photos, or PDFs and get an instant AI breakdown",
    "AI tutor sessions, quizzes, and spaced-repetition flashcards",
  ],
  business: [
    "AI Coach: your always-on mentor for building your business",
    "An AI-generated snapshot and starter milestones for your idea",
    "AI-drafted marketing and content ideas for any platform",
    "Milestone, metrics, and competitor tracking in one place",
  ],
} as const;

const FREE_TAGLINE_BY_TRACK = {
  student: "School tracking (timetable, homework, exams, career matches, and your roadmap) is always free.",
  business: "Your business plan basics, milestone checklist, and metrics log are always free.",
} as const;

export default function UpgradePage() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();

  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);
  const [activationTimedOut, setActivationTimedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const onPlus = Boolean(profile && isEntitled(profile) && profile.plan === "plus");
  const track = profile?.track ?? "student";
  const planOption = getPlanOption(track, interval);
  const monthlyOption = getPlanOption(track, "monthly");
  const yearlyOption = getPlanOption(track, "yearly");
  const yearlySavingsPercent = Math.round((1 - yearlyOption.priceUsd / (monthlyOption.priceUsd * 12)) * 100);

  // Once the card is confirmed, the webhook is what actually flips the
  // profile to plan="plus" — poll refreshProfile a few times so the UI
  // catches up without the customer having to hit "Refresh" themselves.
  // If every attempt runs out with no webhook update, activationTimedOut
  // surfaces a manual way forward instead of spinning forever.
  useEffect(() => {
    if (!paymentSucceeded || onPlus) return;
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      if (cancelled) return;
      if (attempts >= 8) {
        setActivationTimedOut(true);
        return;
      }
      attempts += 1;
      await refreshProfile();
      if (!cancelled) setTimeout(tick, 1500);
    };
    const t = setTimeout(tick, 1200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [paymentSucceeded, onPlus, refreshProfile]);

  // Confirmed active — give the customer a moment to see the confirmation,
  // then take them into the app rather than leaving them stranded on the
  // upgrade screen with no next step.
  useEffect(() => {
    if (!onPlus || !paymentSucceeded) return;
    const t = setTimeout(() => router.push("/app"), 1500);
    return () => clearTimeout(t);
  }, [onPlus, paymentSucceeded, router]);

  async function startCheckout() {
    setError(null);
    setStartingCheckout(true);
    try {
      const res = await authedFetch("/api/billing/create-subscription", {
        method: "POST",
        body: JSON.stringify({ interval }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't start checkout.");
      setClientSecret(json.clientSecret);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start checkout.");
    } finally {
      setStartingCheckout(false);
    }
  }

  async function openPortal() {
    setError(null);
    setPortalLoading(true);
    try {
      const res = await authedFetch("/api/billing/create-portal-session", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't open the billing portal.");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the billing portal.");
      setPortalLoading(false);
    }
  }

  const daysLeft = profile
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="space-y-6 pb-4 animate-fade-in">
      <ScreenHeader eyebrow={`${branding.name} Plus`} title={`Activate your ${TRACK_LABEL[track].toLowerCase()} plan`} />

      {paymentSucceeded && (
        <Card className="border-success/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {!onPlus && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-success" />}
              <p className="text-sm text-foreground">
                {onPlus
                  ? "You're on Alxioum Plus. Enjoy!"
                  : activationTimedOut
                    ? "Payment received, but activation is taking longer than usual."
                    : "Payment received. Activating your plan…"}
              </p>
            </div>
            {onPlus ? (
              <Button size="sm" className="mt-3 w-full" onClick={() => router.push("/app")}>
                Continue to app
              </Button>
            ) : (
              activationTimedOut && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Your card was charged successfully. This is just a delay confirming it on our side. Try refreshing,
                    or head into the app now; it&rsquo;ll unlock as soon as it catches up.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => refreshProfile()}>
                      Refresh
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => router.push("/app")}>
                      Go to app
                    </Button>
                  </div>
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}

      {profile?.plan_status === "trialing" && !onPlus && !paymentSucceeded && (
        <Card className="border-accent/30">
          <CardContent className="p-4 text-sm text-foreground">
            {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial.` : "Your free trial has ended."}
          </CardContent>
        </Card>
      )}

      {!paymentSucceeded && (
        <Card>
          <CardContent className="p-6">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
              <Sparkles className="h-3.5 w-3.5" /> {branding.name} Plus · {TRACK_LABEL[track]}
            </p>

            {!onPlus && !clientSecret && (
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
                    {i === "monthly" ? (
                      "Monthly"
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        Yearly
                        <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-2xs font-bold text-success">
                          -{yearlySavingsPercent}%
                        </span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <p className="mt-4 text-3xl font-extrabold text-foreground">
              ${planOption.priceUsd}
              <span className="text-base font-medium text-muted-foreground">/{interval === "monthly" ? "mo" : "yr"}</span>
            </p>

            {!clientSecret && (
              <ul className="mt-5 space-y-3">
                {PERKS_BY_TRACK[track].map((perk) => (
                  <li key={perk} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {perk}
                  </li>
                ))}
              </ul>
            )}

            {error && <p className="mt-4 text-sm text-danger">{error}</p>}

            <div className="mt-6 space-y-2.5">
              {onPlus ? (
                <Button size="lg" variant="outline" className="w-full" onClick={openPortal} disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage subscription"}
                </Button>
              ) : clientSecret ? (
                <>
                  <CheckoutForm
                    clientSecret={clientSecret}
                    submitLabel={`Pay $${planOption.priceUsd}/${interval === "monthly" ? "mo" : "yr"}`}
                    onSuccess={() => setPaymentSucceeded(true)}
                  />
                  <Button size="sm" variant="ghost" className="w-full" onClick={() => setClientSecret(null)}>
                    Change plan
                  </Button>
                </>
              ) : (
                <Button size="lg" className="w-full" onClick={startCheckout} disabled={startingCheckout}>
                  {startingCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue to payment"}
                </Button>
              )}
              {!clientSecret && (
                <Button size="sm" variant="ghost" className="w-full" onClick={() => router.push("/app")}>
                  Back to app
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!paymentSucceeded && <p className="text-center text-xs text-muted-foreground">{FREE_TAGLINE_BY_TRACK[track]}</p>}
    </div>
  );
}
