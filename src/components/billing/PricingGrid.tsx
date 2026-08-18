"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { PLANS, type PlanDefinition } from "@/lib/billing/plans";
import { useBillingAction } from "@/lib/useBillingAction";
import { useAlxioum } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/types";

const ORDER: Plan[] = ["Free", "Student", "Pro", "Max"];
const POPULAR: Plan = "Pro";

function savingsPct(monthly: number, yearly: number): number {
  if (monthly <= 0 || yearly <= 0) return 0;
  return Math.round((1 - yearly / (monthly * 12)) * 100);
}

// The plan's own "N AI actions / month" line is promoted to a subtitle
// under the plan name instead, so it isn't duplicated in the bullet list.
function bulletFeatures(plan: PlanDefinition): string[] {
  return plan.features.filter((f) => !f.includes("AI action"));
}

/**
 * Shared plan-comparison grid used both on the public /pricing page
 * ("marketing" mode — every card links to sign-in) and inside the app for
 * changing plans ("account" mode — buttons act directly). Reused instead of
 * duplicated so pricing, colors, and copy can only ever come from one place
 * (PLANS in lib/billing/plans.ts).
 */
export function PricingGrid({
  mode,
  currentPlan,
  onChanged,
  onFreeSelect,
  returnPath,
}: {
  mode: "marketing" | "account" | "onboarding";
  currentPlan?: Plan;
  onChanged?: () => void;
  /** onboarding only: called instead of any API call when Free is picked, since a brand-new account has nothing to downgrade from. */
  onFreeSelect?: () => void;
  /** onboarding only: where Stripe Checkout sends the user back to, so they resume the flow instead of landing on Settings. */
  returnPath?: string;
}) {
  const [yearly, setYearly] = useState(false);
  const { go, busyKey: checkoutBusyKey, error: checkoutError } = useBillingAction();
  const getAccessToken = useAlxioum((s) => s.getAccessToken);
  const [downgrading, setDowngrading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function downgradeToFree() {
    if (!window.confirm("Switch to the Free plan? You'll keep your current plan's access until the billing period ends, then move to Free.")) return;
    setDowngrading(true);
    setLocalError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const res = await fetch("/api/stripe/cancel", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      onChanged?.();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDowngrading(false);
    }
  }

  const error = checkoutError ?? localError;

  return (
    <div>
      <div className="flex justify-center">
        <div className="relative flex rounded-full border border-border bg-surface p-1">
          {(["monthly", "yearly"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setYearly(m === "yearly")}
              className={cn(
                "relative z-10 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors",
                (m === "yearly") === yearly ? "text-accent-foreground" : "text-muted-foreground"
              )}
            >
              {(m === "yearly") === yearly && (
                <motion.span layoutId={`pricing-toggle-pill-${mode}`} className="absolute inset-0 -z-10 rounded-full bg-accent" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
              )}
              {m === "yearly" ? "Yearly" : "Monthly"}
              {m === "yearly" && (
                <span className={cn("text-[11px]", yearly ? "text-accent-foreground/80" : "text-accent")}>Save {savingsPct(PLANS.Pro.priceMonthlyEUR, PLANS.Pro.priceYearlyEUR)}%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {ORDER.map((planId) => (
          <PlanCard
            key={planId}
            planId={planId}
            yearly={yearly}
            mode={mode}
            isCurrent={mode === "account" && currentPlan === planId}
            isPastPaid={mode === "account" && !!currentPlan && currentPlan !== "Free" && currentPlan !== planId}
            busy={checkoutBusyKey === planId || (planId === "Free" && downgrading)}
            anyBusy={checkoutBusyKey !== null || downgrading}
            onSelect={() => {
              if (mode === "marketing") return;
              if (planId === "Free") {
                if (mode === "onboarding") onFreeSelect?.();
                else downgradeToFree();
                return;
              }
              if (mode === "account" && currentPlan && currentPlan !== "Free" && currentPlan !== planId) {
                // Switching between two paid plans has to go through the
                // Stripe portal, not a fresh Checkout Session — Checkout
                // would create a second, concurrent subscription instead of
                // changing the existing one.
                go("/api/stripe/portal", undefined, planId);
                return;
              }
              go("/api/stripe/checkout", { kind: "subscription", plan: planId, cycle: yearly ? "yearly" : "monthly", returnPath }, planId);
            }}
          />
        ))}
      </div>

      {error && <p className="mt-4 text-center text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}

function PlanCard({
  planId,
  yearly,
  mode,
  isCurrent,
  isPastPaid,
  busy,
  anyBusy,
  onSelect,
}: {
  planId: Plan;
  yearly: boolean;
  mode: "marketing" | "account" | "onboarding";
  isCurrent: boolean;
  isPastPaid: boolean;
  busy: boolean;
  anyBusy: boolean;
  onSelect: () => void;
}) {
  const plan = PLANS[planId];
  const hasYearly = plan.priceYearlyEUR > 0;
  const price = yearly && hasYearly ? plan.priceYearlyEUR : plan.priceMonthlyEUR;
  const period = yearly && hasYearly ? "/year" : "/month";
  const monthlyEquivalent = yearly && hasYearly ? Math.round((plan.priceYearlyEUR / 12) * 100) / 100 : null;
  const highlight = planId === POPULAR;
  const features = bulletFeatures(plan);

  const label = isCurrent
    ? "Current plan"
    : mode === "marketing"
      ? planId === "Free"
        ? "Get started free"
        : "Get early access"
      : mode === "onboarding"
        ? planId === "Free"
          ? "Continue with Free"
          : "Start 3-day free trial"
        : planId === "Free"
          ? "Downgrade to Free"
          : isPastPaid
            ? "Switch plans"
            : "Select";

  const buttonInner = (
    <span className="flex w-full items-center justify-center gap-1.5">
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {label}
    </span>
  );

  const buttonClass = cn(
    "mt-5 block w-full rounded-full px-4 py-2.5 text-center text-[13.5px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
    isCurrent ? "bg-muted text-muted-foreground" : highlight ? "bg-accent text-accent-foreground" : "border border-border text-foreground"
  );

  return (
    <div className={cn("relative rounded-2xl border p-6", highlight ? "border-accent/50 bg-accent-soft/30 shadow-card" : "border-border/70 bg-surface")}>
      {highlight && <span className="absolute right-6 top-6 text-[12px] font-semibold text-accent">Popular</span>}
      <p className="text-[16px] font-semibold text-foreground">{plan.name}</p>
      <p className="mt-0.5 text-[12.5px] text-muted-foreground">{plan.aiMessagesPerMonth.toLocaleString()} AI actions / month</p>

      <motion.p key={`${planId}-${yearly}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }} className="mt-4 flex items-baseline gap-1">
        <span className="text-[32px] font-bold tracking-tight text-foreground">€{price}</span>
        <span className="text-[13px] text-muted-foreground">{period}</span>
      </motion.p>
      {monthlyEquivalent !== null && <p className="mt-0.5 text-[12px] text-muted-foreground">≈ €{monthlyEquivalent}/month billed yearly</p>}

      {mode === "marketing" ? (
        <Link href="/login" className={buttonClass}>
          {buttonInner}
        </Link>
      ) : (
        <button onClick={onSelect} disabled={isCurrent || anyBusy} className={buttonClass}>
          {buttonInner}
        </button>
      )}

      <ul className="mt-5 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13px] text-foreground">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
