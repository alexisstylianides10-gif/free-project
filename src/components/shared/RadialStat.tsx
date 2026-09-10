"use client";

import { cn } from "@/lib/utils";

// Flat, single-hue stroke per tone (spec §11: a gradient needs a specific
// branding purpose — the previous two-stop gradient here blended two
// unrelated hues per ring (e.g. school blue fading into brand purple, future
// orange fading into mission pink) that encoded no additional data, purely
// decorative). Percentage is communicated by arc length + the number in the
// center; color only needs to identify which stat this is.
const TONE_COLORS: Record<"school" | "future" | "brand" | "mission", string> = {
  brand: "hsl(var(--accent))",
  school: "hsl(var(--school))",
  future: "hsl(var(--future))",
  mission: "hsl(var(--mission-via))",
};

/** Circular progress ring — used on desktop hero panels where a flat bar
 * reads too plain for the extra space available. */
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
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference * (1 - clamped / 100);
  const color = TONE_COLORS[tone];

  return (
    <div className={cn("flex flex-col items-center gap-2.5", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={strokeWidth} className="stroke-border" fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={strokeWidth}
            stroke={color}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums text-foreground">{clamped}%</div>
      </div>
      <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
