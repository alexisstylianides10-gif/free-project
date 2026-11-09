import * as React from "react";
import { cn } from "@/lib/cn";

const tones = {
  neutral: "border-line bg-surface2 text-muted",
  accent: "border-accent/30 bg-accent/10 text-accent",
  gold: "border-gold/30 bg-gold/10 text-gold",
  danger: "border-danger/30 bg-danger/10 text-danger",
  warn: "border-warn/30 bg-warn/10 text-warn",
  info: "border-info/30 bg-info/10 text-info",
} as const;

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none", tones[tone], className)} {...props} />;
}
