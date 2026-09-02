"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { MarketingNav } from "@/components/shared/MarketingNav";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PLAN_OPTIONS, TRACK_LABEL, type BillingInterval } from "@/lib/billing/plans";

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

const PRICING_FAQ: { q: string; a: string }[] = [
  {
    q: "Is there really a free plan?",
    a: "Yes. Core organization (timetable, homework, exams, career matches, or your business plan and milestones) is always free. AI features like the Coach, study plans, and quiz generation are part of Plus.",
  },
  {
    q: "What happens after my trial?",
    a: "Every new account gets a 3-day free trial of Plus automatically, no card required. When it ends, AI features pause until you subscribe — your core tracking (timetable, homework, exams, or your business plan) stays free either way.",
  },
  {
    q: "Can I switch between monthly and yearly?",
    a: "Yes — before you subscribe you can toggle between monthly and yearly anytime, right on this page or in-app. If you're already on Plus, switching intervals is done from the billing portal (Manage subscription).",
  },
  {
    q: "Can I switch tracks?",
    a: "Your track (student or founder) is locked in once you finish onboarding, so the app can build itself fully around it. If you signed up on the wrong track, contact us and we can help. Note: the founder track is currently paused for new signups while we polish it, so new accounts are on the student track for now.",
  },
];

export function PricingClient() {
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
    <main className="relative min-h-dvh overflow-hidden bg-background">
      <MarketingNav />
      <div className="bg-ambient-glow pointer-events-none absolute inset-x-0 top-0 h-72" aria-hidden />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-14 md:px-10 lg:px-16">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Pricing</p>
        <h1 className="mt-2 max-w-2xl text-display font-extrabold leading-[1.15] tracking-tight text-foreground">
          Simple pricing. The organizing tools are always free.
        </h1>
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
      </div>

      <SiteFooter />
    </main>
  );
}
