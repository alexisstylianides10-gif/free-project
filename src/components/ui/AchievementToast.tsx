"use client";

import type { AchievementDef } from "@/lib/catalog/achievements";

/** Presentational-only unlock toast — one achievement per card. Stacking,
 * mounting, and auto-dismiss timing live in AchievementToastProvider, which
 * is the reusable piece every award call site benefits from without each
 * one needing its own toast logic.
 *
 * PHASE 2 FLAG: `achievement.icon` is a raw emoji string from the
 * AchievementDef catalog (src/lib/catalog/achievements.ts, ~20 entries),
 * not a lucide-react icon — an icon-library inconsistency inside a
 * src/components/ui/* file. Not converted in this pass: the catalog's
 * `icon: string` field and every one of its ~20 entries would need
 * rewriting to LucideIcon components, and `.icon` is read the same way
 * across 19 files app-wide (subjects, missions, materials, achievements —
 * grepped), some of which may be intentionally user-facing personalization
 * (e.g. a subject icon picker) rather than accidental inconsistency. Needs
 * a scoped product decision before touching, not a blind swap here. */
export function AchievementToast({ achievement, onDismiss }: { achievement: AchievementDef; onDismiss: () => void }) {
  return (
    <div
      role="status"
      onClick={onDismiss}
      className="animate-fade-up glass flex w-full max-w-sm cursor-pointer items-center gap-3 rounded-card border border-accent/30 p-3.5 shadow-pop"
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
