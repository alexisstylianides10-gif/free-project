"use client";

import type { AchievementDef } from "@/lib/catalog/achievements";

/** Presentational-only unlock toast — one achievement per card. Stacking,
 * mounting, and auto-dismiss timing live in AchievementToastProvider, which
 * is the reusable piece every award call site benefits from without each
 * one needing its own toast logic. */
export function AchievementToast({ achievement, onDismiss }: { achievement: AchievementDef; onDismiss: () => void }) {
  return (
    <div
      role="status"
      onClick={onDismiss}
      className="animate-fade-up glass flex w-full max-w-sm cursor-pointer items-center gap-3 rounded-2xl border border-accent/30 p-3.5 shadow-pop"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-xl">
        {achievement.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Achievement Unlocked</p>
        <p className="truncate text-sm font-bold text-foreground">{achievement.title}</p>
      </div>
    </div>
  );
}
