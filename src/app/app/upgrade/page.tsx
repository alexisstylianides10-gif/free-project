"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/AuthProvider";
import { authedFetch } from "@/lib/api";
import { isEntitled } from "@/lib/billing/entitlement";
import { getPlanOption, type BillingInterval } from "@/lib/billing/plans";
import { CheckoutForm } from "@/components/billing/CheckoutForm";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { branding } from "@/lib/branding";

export default function UpgradePage() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const t = useTranslations("UpgradePage");

  const TRACK_LABEL_LOCAL: Record<"student" | "business", string> = {
    student: t("trackLabel.student"),
    business: t("trackLabel.business"),
  };
  const PERKS_BY_TRACK = {
    student: t.raw("perks.student") as string[],
    business: t.raw("perks.business") as string[],
  };
  const FREE_TAGLINE_BY_TRACK = {
    student: t("freeTagline.student"),
    business: t("freeTagline.business"),
  };

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
      if (!res.ok) throw new Error(json.error || t("couldNotStartCheckout"));
      setClientSecret(json.clientSecret);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("couldNotStartCheckout"));
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
      if (!res.ok) throw new Error(json.error || t("couldNotOpenPortal"));
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("couldNotOpenPortal"));
      setPortalLoading(false);
    }
  }

  const daysLeft = profile
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="space-y-6 pb-4 animate-fade-in">
      <ScreenHeader eyebrow={t("eyebrow", { name: branding.name })} title={t("activateYourPlan", { track: TRACK_LABEL_LOCAL[track].toLowerCase() })} />

      {paymentSucceeded && (
        <Card className="border-success/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {!onPlus && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-success" />}
              <p className="text-sm text-foreground">
                {onPlus
                  ? t("onPlusEnjoy", { name: branding.name })
                  : activationTimedOut
                    ? t("activationDelayed")
                    : t("activatingPlan")}
              </p>
            </div>
            {onPlus ? (
              <Button size="sm" className="mt-3 w-full" onClick={() => router.push("/app")}>
                {t("continueToApp")}
              </Button>
            ) : (
              activationTimedOut && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t("activationDelayedBody")}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => refreshProfile()}>
                      {t("refresh")}
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => router.push("/app")}>
                      {t("goToApp")}
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
            {daysLeft > 0 ? t("daysLeftInTrial", { days: daysLeft }) : t("trialEnded")}
          </CardContent>
        </Card>
      )}

      {!paymentSucceeded && (
        <Card>
          <CardContent className="p-6">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
              <Sparkles className="h-3.5 w-3.5" /> {t("planPlusTrack", { name: branding.name, track: TRACK_LABEL_LOCAL[track] })}
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
                      t("monthly")
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        {t("yearly")}
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
              <span className="text-base font-medium text-muted-foreground">/{interval === "monthly" ? t("moAbbrev") : t("yrAbbrev")}</span>
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
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("manageSubscription")}
                </Button>
              ) : clientSecret ? (
                <>
                  <CheckoutForm
                    clientSecret={clientSecret}
                    submitLabel={t("payAmount", { price: planOption.priceUsd, unit: interval === "monthly" ? t("moAbbrev") : t("yrAbbrev") })}
                    onSuccess={() => setPaymentSucceeded(true)}
                  />
                  <Button size="sm" variant="ghost" className="w-full" onClick={() => setClientSecret(null)}>
                    {t("changePlan")}
                  </Button>
                </>
              ) : (
                <Button size="lg" className="w-full" onClick={startCheckout} disabled={startingCheckout}>
                  {startingCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : t("continueToPayment")}
                </Button>
              )}
              {!clientSecret && (
                <Button size="sm" variant="ghost" className="w-full" onClick={() => router.push("/app")}>
                  {t("backToApp")}
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
