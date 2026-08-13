"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Loader2 } from "lucide-react";
import { PendingActionCard } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ConfirmationCard({
  action,
  resolvedSummary,
  resolvedStatus,
  onDecide,
}: {
  action: PendingActionCard;
  resolvedSummary?: string;
  resolvedStatus?: PendingActionCard["status"];
  onDecide: (decision: "confirm" | "cancel") => Promise<void>;
}) {
  const [busy, setBusy] = useState<"confirm" | "cancel" | null>(null);

  if (resolvedSummary) {
    const failed = resolvedStatus === "failed";
    return (
      <div
        className={cn(
          "mt-2 rounded-xl border px-3.5 py-2.5 text-[13px]",
          failed ? "border-danger/30 bg-danger-soft/50 text-danger" : "border-border bg-muted/40 text-foreground"
        )}
      >
        {resolvedSummary}
      </div>
    );
  }

  async function decide(d: "confirm" | "cancel") {
    setBusy(d);
    await onDecide(d);
    setBusy(null);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 rounded-xl border border-accent/30 bg-accent-soft/40 p-3.5">
      <p className="whitespace-pre-wrap text-[13.5px] text-foreground">{action.summary}</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => decide("confirm")}
          disabled={busy !== null}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy === "confirm" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Confirm
        </button>
        <button
          onClick={() => decide("cancel")}
          disabled={busy !== null}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          {busy === "cancel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          Cancel
        </button>
      </div>
    </motion.div>
  );
}
