"use client";

import { motion } from "framer-motion";
import { Check, Pencil, X, Sparkles } from "lucide-react";
import { PendingAction } from "@/lib/types";
import { Button } from "@/components/ui/Button";

const kindLabel: Record<PendingAction["kind"], string> = {
  create_event: "wants to create this calendar event",
  create_task: "wants to create this task",
  add_list_item: "wants to update this list",
  create_reminder: "wants to create this reminder",
  create_goal: "wants to create this goal",
  add_expense: "wants to log this expense",
};

export function AIActionCard({
  action,
  onApprove,
  onDismiss,
}: {
  action: PendingAction;
  onApprove: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="mt-2 w-full max-w-sm rounded-xl border border-accent/25 bg-accent-soft/40 p-4"
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-muted-foreground">
            Alxioum <span className="text-foreground">{kindLabel[action.kind]}</span>
          </p>
          <p className="mt-1 truncate text-[14px] font-semibold text-foreground">{action.title}</p>
          <p className="text-[13px] text-muted-foreground">{action.detail}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" onClick={onApprove} className="gap-1.5">
          <Check className="h-3.5 w-3.5" /> Approve
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss} className="gap-1.5 text-muted-foreground">
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
      </div>
    </motion.div>
  );
}
