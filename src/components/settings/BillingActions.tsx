"use client";

import { useState } from "react";
import { CreditCard, Loader2, Sparkles } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import type { PlanDefinition } from "@/lib/billing/plans";

export function BillingActions({ upgradeTarget, hasStripeCustomer }: { upgradeTarget: PlanDefinition | null; hasStripeCustomer: boolean }) {
  const getAccessToken = useAlxioum((s) => s.getAccessToken);
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(path: string, body: Record<string, unknown> | undefined, kind: "checkout" | "portal") {
    setBusy(kind);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
      const json = await res.json();
      if (!res.ok) throw new Error(res.status === 501 ? "Billing isn't live yet — check back soon." : (json.error ?? "Something went wrong."));
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      {upgradeTarget && (
        <Button size="sm" onClick={() => go("/api/stripe/checkout", { plan: upgradeTarget.id, cycle: "monthly" }, "checkout")} disabled={busy !== null}>
          {busy === "checkout" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Subscribe to {upgradeTarget.name} — €{upgradeTarget.priceMonthlyEUR}/mo
        </Button>
      )}
      {hasStripeCustomer && (
        <Button size="sm" variant="outline" onClick={() => go("/api/stripe/portal", undefined, "portal")} disabled={busy !== null}>
          {busy === "portal" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
          Manage billing
        </Button>
      )}
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}
