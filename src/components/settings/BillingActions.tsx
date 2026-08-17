"use client";

import { useState } from "react";
import { CreditCard, Loader2, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useBillingAction } from "@/lib/useBillingAction";
import { useAlxioum } from "@/lib/store";
import type { PlanDefinition } from "@/lib/billing/plans";

export function BillingActions({
  upgradeTarget,
  hasStripeCustomer,
  cancelable = false,
}: {
  upgradeTarget: PlanDefinition | null;
  hasStripeCustomer: boolean;
  cancelable?: boolean;
}) {
  const { go, busyKey, error } = useBillingAction();
  const getAccessToken = useAlxioum((s) => s.getAccessToken);
  const refreshAll = useAlxioum((s) => s.refreshAll);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleCancel() {
    if (!window.confirm("Cancel your subscription? You'll keep access until your current billing period ends.")) return;
    setCanceling(true);
    setCancelError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const res = await fetch("/api/stripe/cancel", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      await refreshAll();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCanceling(false);
    }
  }

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
      {cancelable && (
        <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-soft" onClick={handleCancel} disabled={canceling}>
          {canceling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
          Cancel subscription
        </Button>
      )}
      {error && <p className="text-[12px] text-danger">{error}</p>}
      {cancelError && <p className="text-[12px] text-danger">{cancelError}</p>}
    </div>
  );
}
