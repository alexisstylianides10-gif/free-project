"use client";

import { Target, Rocket } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export function GoalTypeChooser({ open, onOpenChange, onChoose }: { open: boolean; onOpenChange: (open: boolean) => void; onChoose: (kind: "personal" | "business") => void }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="What kind of goal?" description="Personal goals track anything you want to achieve. A Business goal gets its own AI co-founder workspace.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          onClick={() => onChoose("personal")}
          className="flex flex-col items-start gap-2 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-accent/50 hover:bg-accent-soft"
        >
          <Target className="h-5 w-5 text-accent" />
          <span className="text-sm font-semibold text-foreground">Personal Goal</span>
          <span className="text-[12.5px] text-muted-foreground">Fitness, learning, habits, savings — anything you want to achieve.</span>
        </button>
        <button
          onClick={() => onChoose("business")}
          className="flex flex-col items-start gap-2 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-accent/50 hover:bg-accent-soft"
        >
          <Rocket className="h-5 w-5 text-accent" />
          <span className="text-sm font-semibold text-foreground">Business Goal</span>
          <span className="text-[12.5px] text-muted-foreground">Build a real business, with Alxioum as your AI co-founder.</span>
        </button>
      </div>
    </Modal>
  );
}
