"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

const TONE_COLORS: Record<"school" | "future" | "brand" | "mission", [string, string]> = {
  brand: ["hsl(var(--accent))", "hsl(var(--accent-end))"],
  school: ["hsl(var(--school))", "hsl(var(--accent))"],
  future: ["hsl(var(--future))", "hsl(var(--mission-via))"],
  mission: ["hsl(var(--mission-from))", "hsl(var(--mission-to))"],
};

/** Circular gradient progress ring — used on desktop hero panels where a
 * flat bar reads too flat/plain for the extra space available. */
export function RadialStat({
  value,
  label,
  size = 88,
  strokeWidth = 7,
  tone = "brand",
  className,
}: {
  value: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  tone?: keyof typeof TONE_COLORS;
  className?: string;
}) {
  const id = useId();
  const gradientId = `radial-${id}`;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference * (1 - clamped / 100);
  const [from, to] = TONE_COLORS[tone];

  return (
    <div className={cn("flex flex-col items-center gap-2.5", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={from} />
              <stop offset="100%" stopColor={to} />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={strokeWidth} className="stroke-border" fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={strokeWidth}
            stroke={`url(#${gradientId})`}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums text-foreground">{clamped}%</div>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
