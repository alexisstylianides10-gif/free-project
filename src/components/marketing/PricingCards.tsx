"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

function savingsPct(monthly: number, yearly: number): number {
  if (monthly <= 0 || yearly <= 0) return 0;
  return Math.round((1 - yearly / (monthly * 12)) * 100);
}

export function PricingCards() {
  const [yearly, setYearly] = useState(false);

  return (
    <>
      <div className="mt-8 flex justify-center">
        <div className="relative flex rounded-full border border-border bg-surface p-1">
          {(["monthly", "yearly"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setYearly(mode === "yearly")}
              className={cn(
                "relative z-10 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium capitalize transition-colors",
                (mode === "yearly") === yearly ? "text-accent-foreground" : "text-muted-foreground"
              )}
            >
              {(mode === "yearly") === yearly && (
                <motion.span layoutId="pricing-toggle-pill" className="absolute inset-0 -z-10 rounded-full bg-gradient-accent shadow-glow-accent" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
              )}
              {mode}
              {mode === "yearly" && <span className={cn("text-[11px]", yearly ? "text-accent-foreground/80" : "text-accent")}>Save {savingsPct(PLANS.Pro.priceMonthlyEUR, PLANS.Pro.priceYearlyEUR)}%</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <PlanCard planId="Free" yearly={yearly} />
        <PlanCard planId="Student" yearly={yearly} />
        <PlanCard planId="Pro" yearly={yearly} highlight />
        <PlanCard planId="Max" yearly={yearly} />
      </div>
    </>
  );
}

function PlanCard({ planId, yearly, highlight }: { planId: "Free" | "Student" | "Pro" | "Max"; yearly: boolean; highlight?: boolean }) {
  const plan = PLANS[planId];
  const hasYearly = plan.priceYearlyEUR > 0;
  const price = yearly && hasYearly ? plan.priceYearlyEUR : plan.priceMonthlyEUR;
  const period = yearly && hasYearly ? "/year" : "/month";
  const monthlyEquivalent = yearly && hasYearly ? Math.round((plan.priceYearlyEUR / 12) * 100) / 100 : null;

  return (
    <div className={`rounded-2xl border p-6 ${highlight ? "border-accent/40 bg-accent-soft/30 shadow-card" : "border-border/70 bg-surface"}`}>
      <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{plan.name}</p>
      <motion.p key={`${planId}-${yearly}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }} className="mt-2 flex items-baseline gap-1">
        <span className="text-[34px] font-semibold tracking-tight text-foreground">€{price}</span>
        <span className="text-[13px] text-muted-foreground">{period}</span>
      </motion.p>
      {monthlyEquivalent !== null && <p className="mt-0.5 text-[12.5px] text-muted-foreground">≈ €{monthlyEquivalent}/month billed yearly</p>}
      <ul className="mt-5 space-y-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13.5px] text-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {f}
          </li>
        ))}
      </ul>
      <Link
        href="/login"
        className={`mt-6 block rounded-lg px-4 py-2.5 text-center text-[13.5px] font-semibold transition-opacity hover:opacity-90 ${
          highlight ? "bg-gradient-accent text-accent-foreground shadow-glow-accent" : "border border-border text-foreground"
        }`}
      >
        {planId === "Free" ? "Get started free" : "Get early access"}
      </Link>
    </div>
  );
}
