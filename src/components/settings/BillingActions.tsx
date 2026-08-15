"use client";

import { CreditCard, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useBillingAction } from "@/lib/useBillingAction";
import type { PlanDefinition } from "@/lib/billing/plans";

export function BillingActions({ upgradeTarget, hasStripeCustomer }: { upgradeTarget: PlanDefinition | null; hasStripeCustomer: boolean }) {
  const { go, busyKey, error } = useBillingAction();

  return (
    <div className="space-y-2">
      {upgradeTarget && (
        <Button
          size="sm"
          onClick={() => go("/api/stripe/checkout", { kind: "subscription", plan: upgradeTarget.id, cycle: "monthly" }, "checkout")}
          disabled={busyKey !== null}
        >
          {busyKey === "checkout" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Subscribe to {upgradeTarget.name} — €{upgradeTarget.priceMonthlyEUR}/mo
        </Button>
      )}
      {hasStripeCustomer && (
        <Button size="sm" variant="outline" onClick={() => go("/api/stripe/portal", undefined, "portal")} disabled={busyKey !== null}>
          {busyKey === "portal" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
          Manage billing
        </Button>
      )}
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}
