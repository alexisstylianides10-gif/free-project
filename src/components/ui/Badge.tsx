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
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-4",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
