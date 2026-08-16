"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Loader2, Undo2 } from "lucide-react";
import { PendingActionCard, ResolvedActionCard } from "@/lib/types";
import { buildPreviewCards } from "@/lib/ai/cardBuilders";
import { UNDO_MAP } from "@/lib/ai/undoMap";
import { ResponseCardRenderer } from "./cards/ResponseCardRenderer";
import { cn } from "@/lib/utils";

export function ConfirmationCard({
  action,
  resolvedAction,
  onDecide,
  onUndo,
}: {
  action: PendingActionCard;
  resolvedAction?: ResolvedActionCard | null;
  onDecide: (decision: "confirm" | "cancel") => Promise<void>;
  onUndo?: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<"confirm" | "cancel" | "undo" | null>(null);

  if (resolvedAction?.status === "superseded") {
    return <div className="mt-2 rounded-xl border border-border bg-muted/30 px-3.5 py-2 text-[12.5px] text-muted-foreground">Updated below.</div>;
  }

  if (resolvedAction?.resultSummary) {
    const failed = resolvedAction.status === "failed";
    const canUndo = !failed && !resolvedAction.undone && Boolean(UNDO_MAP[resolvedAction.tool]) && onUndo;

    async function undo() {
      setBusy("undo");
      await onUndo!();
      setBusy(null);
    }

    return (
      <div className="mt-2 space-y-1.5">
        <div
          className={cn(
            "rounded-xl border px-3.5 py-2.5 text-[13px]",
            failed ? "border-danger/30 bg-danger-soft/50 text-danger" : "border-border bg-muted/40 text-foreground"
          )}
        >
          {resolvedAction.resultSummary}
        </div>
        {resolvedAction.cards?.map((card, i) => <ResponseCardRenderer key={i} card={card} />)}
        {canUndo && (
          <button
            onClick={undo}
            disabled={busy !== null}
            className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {busy === "undo" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
            Undo
          </button>
        )}
      </div>
    );
  }

  async function decide(d: "confirm" | "cancel") {
    setBusy(d);
    await onDecide(d);
    setBusy(null);
  }

  const previewCards = buildPreviewCards(action.tool, action.args);

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 rounded-xl border border-accent/30 bg-accent-soft/40 p-3.5">
      <p className="whitespace-pre-wrap text-[13.5px] text-foreground">{action.summary}</p>
      {previewCards.map((card, i) => (
        <ResponseCardRenderer key={i} card={card} />
      ))}
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
