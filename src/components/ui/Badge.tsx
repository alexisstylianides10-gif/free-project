import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        // Pill shape is a deliberate exception here, not a holdover — spec
        // §6 explicitly allows a 999px "pill" tier, and small status/count
        // chips are the canonical case for it.
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption font-semibold leading-4",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
