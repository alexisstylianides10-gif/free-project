"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SectionKicker } from "@/components/marketing/SectionKicker";
import { PLAN_OPTIONS, type BillingInterval } from "@/lib/billing/plans";
import { usePricingFaq } from "@/lib/marketing/faq";
import { cn } from "@/lib/utils";

// Same hover-lift recipe as FeaturesSection's cards — kept as a local
// duplicate (not shared) since these two files intentionally have no
// import relationship, matching the rest of this component's existing
// pattern of self-contained sections. Hover shadow dialed back from
// shadow-float to shadow-raised for the same reason as FeaturesSection's
// HOVER_LIFT — see that file's comment.
const HOVER_LIFT = "transition-all duration-200 hover:-translate-y-1 hover:shadow-raised";

// Extracted verbatim from pricing/PricingClient.tsx's body ("use client" —
// owns the monthly/yearly toggle state, unchanged) so the exact same
// JSX/copy renders on both the standalone /pricing route and inline on / —
// see PRODUCT_SPECS_SCROLL_LANDING.md §2, §4, §7.

// Perk/tagline copy mirrors src/app/app/upgrade/page.tsx's PERKS_BY_TRACK /
// FREE_TAGLINE_BY_TRACK (the marketing promise and the actual in-app upsell
// must never say two different things) — that page is out of this i18n
// pass's scope (in-app, not marketing/auth/onboarding), so its English
// arrays stay as-is; this section's own copy now lives in the "PricingSection"
// i18n namespace with matching English strings.

/**
 * `withSectionBreak` (default `false`) — same opt-in top-divider pattern as
 * `FeaturesSection`; standalone `/pricing` renders with it omitted so it
 * stays pixel-identical to the QA-signed-off `ba9001d` version.
 *
 * `showFaqStrip` (default `true`) — the embedded "Pricing questions" strip
 * (same 4 `PRICING_FAQ` entries) is genuinely conditional on where this
 * renders: standalone `/pricing` keeps it (default), inline on `/` it's
 * suppressed (`showFaqStrip={false}`) because `/` has its own dedicated
 * `FaqSection` immediately after Pricing showing the same 4 questions — see
 * PRODUCT_SPECS_SCROLL_LANDING.md §4. This is the one place a section's
 * sub-content is conditional on where it's rendered; flagged here via prop +
 * comment, not a silent pathname branch.
 *
 * `headingLevel` (default `"h1"`) — same opt-in-prop pattern as
 * `withSectionBreak`. Standalone `/pricing` renders with it omitted, so its
 * main heading stays an `<h1>` (unchanged). Inline on `/`, the Hero already
 * owns the page's one `<h1>`, so `/` passes `headingLevel="h2"` to avoid a
 * second `<h1>` on the same document (QA-flagged, see PROJECT_STATE.md "DEV
 * FIX (scroll landing heading hierarchy)").
 */
export function PricingSection({
  withSectionBreak = false,
  showFaqStrip = true,
  headingLevel = "h1",
}: {
  withSectionBreak?: boolean;
  showFaqStrip?: boolean;
  headingLevel?: "h1" | "h2";
}) {
  const t = useTranslations("PricingSection");
  const faq = usePricingFaq();
  const Heading = headingLevel;
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const freePerks = t.raw("freePerks") as string[];
  const studentPerks = t.raw("studentPerks") as string[];
  const businessPerks = t.raw("businessPerks") as string[];

  const studentMonthly = PLAN_OPTIONS.find((o) => o.track === "student" && o.interval === "monthly")!;
  const studentYearly = PLAN_OPTIONS.find((o) => o.track === "student" && o.interval === "yearly")!;
  const businessMonthly = PLAN_OPTIONS.find((o) => o.track === "business" && o.interval === "monthly")!;
  const businessYearly = PLAN_OPTIONS.find((o) => o.track === "business" && o.interval === "yearly")!;

  // Same formula already used in ChoosePlanClient.tsx and upgrade/page.tsx —
  // computed live from PLAN_OPTIONS, never hardcoded, so if plans.ts pricing
  // ever changes this page can't silently go stale.
  const studentSavingsPercent = Math.round((1 - studentYearly.priceUsd / (studentMonthly.priceUsd * 12)) * 100);
  const businessSavingsPercent = Math.round((1 - businessYearly.priceUsd / (businessMonthly.priceUsd * 12)) * 100);

  const studentPrice = interval === "monthly" ? studentMonthly.priceUsd : studentYearly.priceUsd;
  const businessPrice = interval === "monthly" ? businessMonthly.priceUsd : businessYearly.priceUsd;

  return (
    <section
      id="pricing"
      className={cn("relative scroll-mt-20 overflow-hidden", withSectionBreak && "border-t border-border")}
    >
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-24 pt-20 md:px-10 lg:px-16">
        <SectionKicker>{t("kicker")}</SectionKicker>
        <Heading className="mt-3 max-w-2xl text-title-lg font-bold leading-tight tracking-tight text-foreground">
          {t("title")}
        </Heading>
        <p className="mt-4 max-w-xl text-body leading-relaxed text-muted-foreground">{t("subtitle")}</p>

        <div className="mt-8 flex w-fit items-center gap-1 rounded-xl bg-muted p-1">
          {(["monthly", "yearly"] as const).map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInterval(i)}
              className={
                "rounded-lg px-4 py-2 text-xs font-semibold transition-colors " +
                (interval === i ? "bg-surface text-foreground shadow-subtle" : "text-muted-foreground")
              }
            >
              {i === "monthly" ? (
                t("monthly")
              ) : (
                <span className="inline-flex items-center gap-1">
                  {t("yearly")}
                  <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-2xs font-bold text-success">
                    -{studentSavingsPercent}%
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {/* Free */}
          <Card variant="flat" className={HOVER_LIFT}>
            <CardContent className="flex h-full flex-col p-6">
              <p className="text-body font-bold text-foreground">{t("free")}</p>
              <p className="mt-2 text-3xl font-extrabold text-foreground">$0</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("freeTaglineStudent")}</p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {freePerks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {perk}
                  </li>
                ))}
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>
                    {t("businessPerkPrefix")}{" "}
                    <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                      {t("comingSoonParen")}
                    </span>
                  </span>
                </li>
              </ul>
              <p className="mt-5 text-xs text-muted-foreground">{t("freeTaglineBusiness")}</p>
              <Link href="/signup" className="mt-4">
                <Button variant="outline" className="w-full">
                  {t("getStarted")}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Plus — Student (live) — the only live paid tier, so it's the
              one deliberately given visual weight: raised above its
              siblings and a "Live now" badge, not a fabricated "most
              popular" claim. Per the de-vibe audit (PRODUCT_SPECS_DEVIBE.md
              §2.2c), the accent glow shadow was already dropped. This pass
              (round 3) goes one step further and drops the diagonal
              gradient-wash overlay too — a raised position + accent border +
              badge is already three distinct emphasis cues; a fourth
              (colored wash) stacked on top read as more "AI-generated SaaS
              template" than "one deliberate accent," per the reference-site
              audit (a restrained site uses 1-2 card treatments, not layered
              effects on its one emphasized card). Card is still visually the
              odd one out among the three tiers — just via position + border
              + badge instead of position + border + badge + shadow + wash. */}
          <Card
            variant="flat"
            className={cn(
              "relative overflow-hidden border-accent/50 md:-translate-y-3",
              "transition-all duration-200 hover:-translate-y-4"
            )}
          >
            <CardContent className="relative flex h-full flex-col p-6">
              <div className="flex items-center justify-between gap-2">
                <p className="text-body font-bold text-foreground">Alxioum Plus &middot; {t("trackNameStudent")}</p>
                <Badge tone="accent">{t("liveNow")}</Badge>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-foreground">
                ${studentPrice}
                <span className="text-sm font-medium text-muted-foreground">/{interval === "monthly" ? t("mo") : t("yr")}</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {studentPerks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {perk}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-center text-xs text-muted-foreground">{t("trialNote")}</p>
              <Link href="/signup" className="mt-3">
                <Button className="w-full">{t("getStarted")}</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Plus — Business (coming soon) */}
          <Card variant="flat" className="opacity-60">
            <CardContent className="flex h-full flex-col p-6">
              <div className="flex items-center gap-1.5">
                <p className="text-body font-bold text-foreground">Alxioum Plus &middot; {t("trackNameBusiness")}</p>
                <Badge tone="neutral">{t("comingSoon")}</Badge>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-foreground">
                ${businessPrice}
                <span className="text-sm font-medium text-muted-foreground">/{interval === "monthly" ? t("mo") : t("yr")}</span>
                {interval === "yearly" && (
                  <span className="ml-2 rounded-full bg-success/15 px-1.5 py-0.5 align-middle text-2xs font-bold text-success">
                    -{businessSavingsPercent}%
                  </span>
                )}
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {businessPerks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {perk}
                  </li>
                ))}
              </ul>
              <Button className="mt-5" disabled>
                {t("comingSoon")}
              </Button>
            </CardContent>
          </Card>
        </div>

        {showFaqStrip && (
          <section className="mt-20">
            <h2 className="text-heading font-bold tracking-tight text-foreground">{t("pricingQuestions")}</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {faq.map((item) => (
                <div key={item.q}>
                  <p className="font-semibold text-foreground">{item.q}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              {t("moreQuestionsPrefix")}{" "}
              <Link href="/faq" className="font-semibold text-foreground underline underline-offset-4">
                {t("seeFullFaq")}
              </Link>
              .
            </p>
          </section>
        )}
      </div>
    </section>
  );
}
