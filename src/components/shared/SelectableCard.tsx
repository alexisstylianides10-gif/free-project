"use client";

import { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Onboarding-style selectable option — a full-width pill row (used for
 * single-choice questions) or a compact card (used for multi-select grids
 * of interests). Selected state mirrors the Canva reference: violet border
 * + tinted fill + trailing checkmark. */
export function SelectableCard({
  label,
  description,
  icon,
  selected,
  onClick,
  compact = false,
}: {
  label: string;
  description?: string;
  icon?: ReactNode;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-4 text-left transition-all duration-150 active:scale-[0.99]",
        compact ? "py-3" : "py-3.5",
        selected
          ? "border-accent/70 bg-accent-soft/60 shadow-glow-accent"
          : "border-border bg-surface hover:border-border-strong"
      )}
    >
      {icon && <span className="text-xl leading-none">{icon}</span>}
      <span className="flex-1">
        <span className={cn("block font-medium", selected ? "text-white" : "text-foreground")}>{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>}
      </span>
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
          selected ? "border-transparent bg-gradient-brand" : "border-border-strong"
        )}
      >
        {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </span>
    </button>
  );
}
