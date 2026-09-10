"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, GraduationCap, Rocket, Check } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { PLAN_OPTIONS, type Track, type BillingInterval } from "@/lib/billing/plans";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { branding } from "@/lib/branding";

const TRACK_ICON: Record<Track, typeof GraduationCap> = { student: GraduationCap, business: Rocket };

export function ChoosePlanClient() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const t = useTranslations("ChoosePlanPage");
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [busy, setBusy] = useState<Track | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track is locked once onboarding is done — no going back here to switch
  // (e.g. student -> business). Server-side trigger enforces this too.
  useEffect(() => {
    if (!loading && profile?.onboarding_completed) {
      router.replace("/app");
    }
  }, [loading, profile, router]);

  if (loading || profile?.onboarding_completed) {
    return <LoadingScreen message={t("loading")} />;
  }

  const monthlyTotal = PLAN_OPTIONS.find((o) => o.track === "student" && o.interval === "monthly")!.priceUsd * 12;
  const yearlyTotal = PLAN_OPTIONS.find((o) => o.track === "student" && o.interval === "yearly")!.priceUsd;
  const yearlySavingsPercent = Math.round((1 - yearlyTotal / monthlyTotal) * 100);

  async function choose(track: Track) {
    if (!supabase || !user || busy) return;
    setError(null);
    setBusy(track);
    const { error: updateError } = await supabase.from("profiles").update({ track, billing_interval: interval }).eq("id", user.id);
    if (updateError) {
      setError(t("saveFailed"));
      setBusy(null);
      return;
    }
    await refreshProfile();
    router.push("/onboarding");
  }

  return (
    <main className="flex min-h-dvh flex-col bg-background px-6 pb-10 pt-16">
      <div className="bg-ambient-glow pointer-events-none absolute inset-x-0 top-0 h-72" aria-hidden />
      <div className="relative z-10 mx-auto w-full max-w-sm flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">{branding.name}</p>
        <h1 className="mt-1 text-heading font-extrabold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>

        <div className="mt-6 flex items-center gap-1 rounded-xl bg-muted p-1">
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

        <div className="mt-5 space-y-3.5">
          {(["student", "business"] as const).map((track) => {
            const Icon = TRACK_ICON[track];
            const perks = t.raw(`tracks.${track}.perks`) as string[];
            const option = PLAN_OPTIONS.find((o) => o.track === track && o.interval === interval)!;
            // Business track is temporarily paused — visible so people know
            // it's coming, but not selectable yet.
            const comingSoon = track === "business";
            return (
              <Card key={track} className={comingSoon ? "opacity-60" : undefined}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-body font-bold text-foreground">{t(`tracks.${track}.name`)}</p>
                        {comingSoon && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
                            {t("comingSoon")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{t(`tracks.${track}.tagline`)}</p>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-1.5">
                    {perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                        {perk}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-lg font-extrabold text-foreground">
                      ${option.priceUsd}
                      <span className="text-xs font-medium text-muted-foreground">/{interval === "monthly" ? t("mo") : t("yr")}</span>
                    </p>
                    {comingSoon ? (
                      <Button size="sm" disabled>
                        {t("comingSoon")}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => choose(track)} disabled={busy !== null}>
                        {busy === track ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("choose", { track: t(`tracks.${track}.name`) })}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        <p className="mt-6 text-center text-xs text-muted-foreground">{t("trialNote")}</p>
      </div>
    </main>
  );
}
