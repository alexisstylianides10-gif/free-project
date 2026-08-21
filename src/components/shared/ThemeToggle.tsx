"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme, type ThemeMode } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";

const OPTIONS: { key: ThemeMode; label: string; icon: typeof Sun }[] = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "system", label: "Auto", icon: Monitor },
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

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
