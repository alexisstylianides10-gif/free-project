"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PLAN_OPTIONS, TRACK_LABEL, type BillingInterval } from "@/lib/billing/plans";
import { PRICING_FAQ } from "@/lib/marketing/faq";
import { cn } from "@/lib/utils";

// Extracted verbatim from pricing/PricingClient.tsx's body ("use client" —
// owns the monthly/yearly toggle state, unchanged) so the exact same
// JSX/copy renders on both the standalone /pricing route and inline on / —
// see PRODUCT_SPECS_SCROLL_LANDING.md §2, §4, §7.

// Perks copied verbatim from src/app/app/upgrade/page.tsx's PERKS_BY_TRACK —
// the marketing promise and the actual in-app upsell must never say two
// different things.
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

// Copied verbatim from src/app/app/upgrade/page.tsx's FREE_TAGLINE_BY_TRACK.
const FREE_TAGLINE_BY_TRACK = {
  student: "School tracking (timetable, homework, exams, career matches, and your roadmap) is always free.",
  business: "Your business plan basics, milestone checklist, and metrics log are always free.",
} as const;

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
  const Heading = headingLevel;
  const [interval, setInterval] = useState<BillingInterval>("monthly");

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
      <div className="bg-ambient-glow pointer-events-none absolute inset-x-0 top-0 h-72" aria-hidden />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-14 md:px-10 lg:px-16">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Pricing</p>
        <Heading className="mt-2 max-w-2xl text-display font-extrabold leading-[1.15] tracking-tight text-foreground">
          Simple pricing. The organizing tools are always free.
        </Heading>
        <p className="mt-4 max-w-xl text-body leading-relaxed text-muted-foreground">
          Pay only if you want the AI on top.
        </p>

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
                "Monthly"
              ) : (
                <span className="inline-flex items-center gap-1">
                  Yearly
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
          <Card>
            <CardContent className="flex h-full flex-col p-6">
              <p className="text-body font-bold text-foreground">Free</p>
              <p className="mt-2 text-3xl font-extrabold text-foreground">$0</p>
              <p className="mt-2 text-sm text-muted-foreground">{FREE_TAGLINE_BY_TRACK.student}</p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {[
                  "Timetable, homework & exam tracking",
                  "Career matches & Future Map roadmap",
                  "Weekly review, deadlines, XP & achievements",
                ].map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {perk}
                  </li>
                ))}
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>
                    Business plan, milestones, metrics &amp; expenses{" "}
                    <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                      (coming soon)
                    </span>
                  </span>
                </li>
              </ul>
              <p className="mt-5 text-xs text-muted-foreground">{FREE_TAGLINE_BY_TRACK.business}</p>
              <Link href="/signup" className="mt-4">
                <Button variant="outline" className="w-full">
                  Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Plus — Student (live) */}
          <Card className="border-accent/30">
            <CardContent className="flex h-full flex-col p-6">
              <p className="text-body font-bold text-foreground">Alxioum Plus &middot; {TRACK_LABEL.student}</p>
              <p className="mt-2 text-3xl font-extrabold text-foreground">
                ${studentPrice}
                <span className="text-sm font-medium text-muted-foreground">/{interval === "monthly" ? "mo" : "yr"}</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {PERKS_BY_TRACK.student.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {perk}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-center text-xs text-muted-foreground">
                3-day free trial, no card required. Cancel anytime.
              </p>
              <Link href="/signup" className="mt-3">
                <Button className="w-full">Get Started</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Plus — Business (coming soon) */}
          <Card className="opacity-60">
            <CardContent className="flex h-full flex-col p-6">
              <div className="flex items-center gap-1.5">
                <p className="text-body font-bold text-foreground">Alxioum Plus &middot; {TRACK_LABEL.business}</p>
                <Badge tone="neutral">Coming soon</Badge>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-foreground">
                ${businessPrice}
                <span className="text-sm font-medium text-muted-foreground">/{interval === "monthly" ? "mo" : "yr"}</span>
                {interval === "yearly" && (
                  <span className="ml-2 rounded-full bg-success/15 px-1.5 py-0.5 align-middle text-2xs font-bold text-success">
                    -{businessSavingsPercent}%
                  </span>
                )}
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {PERKS_BY_TRACK.business.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {perk}
                  </li>
                ))}
              </ul>
              <Button className="mt-5" disabled>
                Coming soon
              </Button>
            </CardContent>
          </Card>
        </div>

        {showFaqStrip && (
          <section className="mt-20">
            <h2 className="text-heading font-extrabold tracking-tight text-foreground">Pricing questions</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {PRICING_FAQ.map((item) => (
                <div key={item.q}>
                  <p className="font-semibold text-foreground">{item.q}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              More questions?{" "}
              <Link href="/faq" className="font-semibold text-foreground underline underline-offset-4">
                See the full FAQ
              </Link>
              .
            </p>
          </section>
        )}
      </div>
    </section>
  );
}
