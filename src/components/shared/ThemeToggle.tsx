"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme, type ThemeMode } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";

const OPTIONS: { key: ThemeMode; label: string; icon: typeof Sun }[] = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "system", label: "Auto", icon: Monitor },
];

const CYCLE: ThemeMode[] = ["system", "light", "dark"];

/**
 * Single source of truth for the theme control (spec §19 — one component
 * per concern, not five). Two variants share the same `useTheme()` state:
 *  - "segmented" (default): labeled 3-way picker for a settings page.
 *  - "compact": one icon button that cycles system → light → dark, for
 *    tight header chrome (TopBar) where a 3-option control doesn't fit.
 */
export function ThemeToggle({ variant = "segmented" }: { variant?: "segmented" | "compact" }) {
  const { mode, setMode } = useTheme();

  if (variant === "compact") {
    const ThemeIcon = OPTIONS.find((o) => o.key === mode)?.icon ?? Monitor;
    return (
      <button
        type="button"
        onClick={() => setMode(CYCLE[(CYCLE.indexOf(mode) + 1) % CYCLE.length])}
        aria-label={`Theme: ${mode}. Click to change.`}
        title={`Theme: ${mode}`}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
      >
        <ThemeIcon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
      {OPTIONS.map((o) => {
        const Icon = o.icon;
        const active = mode === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => setMode(o.key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors",
              active ? "bg-surface text-foreground shadow-subtle" : "text-muted-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
