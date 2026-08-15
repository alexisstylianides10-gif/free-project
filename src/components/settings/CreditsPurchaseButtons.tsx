"use client";

import { Loader2, Plus } from "lucide-react";
import { useBillingAction } from "@/lib/useBillingAction";
import { CREDIT_PACKS } from "@/lib/billing/plans";

export function CreditsPurchaseButtons() {
  const { go, busyKey, error } = useBillingAction();

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {CREDIT_PACKS.map((pack) => (
          <button
            key={pack.id}
            onClick={() => go("/api/stripe/checkout", { kind: "credits", packId: pack.id }, pack.id)}
            disabled={busyKey !== null}
            className="rounded-lg border border-border p-3 text-center transition-colors hover:border-border-strong disabled:opacity-60"
          >
            <p className="text-[13px] font-semibold text-foreground">{pack.actions.toLocaleString()}</p>
            <p className="text-[11.5px] text-muted-foreground">actions</p>
            <p className="mt-1.5 flex items-center justify-center gap-1 text-[13px] font-medium text-accent">
              {busyKey === pack.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3 w-3" />}
              €{pack.priceEUR}
            </p>
          </button>
        ))}
      </div>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}
