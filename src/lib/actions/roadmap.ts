import type { SupabaseClient } from "@supabase/supabase-js";
import { ROADMAP_LEVELS } from "@/lib/catalog/roadmap";

/** The browser CustomEvent name a future toast/badge listener could use.
 * Kept as a small shared constant rather than a magic string on both ends. */
export const ROADMAP_LEVEL_UP_EVENT = "alxioum:roadmap-level-up";

const MAX_LEVEL = 6;

/**
 * Marks `level` (and any earlier level not already completed) as completed,
 * and unlocks the next level if one exists.
 *
 * Backfill-safe by design: this fetches the user's actual current
 * roadmap_progress rows first rather than trusting a level-by-level
 * sequential assumption, so an out-of-order trigger (e.g. a business/
 * creative mission completes and fires Level 3 before any skill mission has
 * ever fired Level 2) never leaves an earlier level showing "locked" while
 * a later one shows "completed" on the timeline — every level from 1 up to
 * `level` gets marked completed together. Backfilled levels all share the
 * same completed_at timestamp (the moment of the triggering action) rather
 * than a fabricated earlier date — acceptable because nothing in the UI
 * displays roadmap_progress.completed_at as an absolute date today, only
 * as a completed/unlocked/locked status.
 *
 * Idempotent: safe to call more than once for the same level (an already-
 * completed level is left untouched, never re-dated).
 */
export async function advanceRoadmapLevel(supabase: SupabaseClient, userId: string, level: number) {
  if (level < 1 || level > MAX_LEVEL) return;

  const { data: existingRows } = await supabase
    .from("roadmap_progress")
    .select("level_number, unlocked, completed_at")
    .eq("user_id", userId);

  const byLevel = new Map((existingRows ?? []).map((r) => [r.level_number, r]));
  const now = new Date().toISOString();

  const toComplete = [];
  for (let n = 1; n <= level; n++) {
    const existing = byLevel.get(n);
    if (existing?.completed_at) continue; // already completed — don't touch, preserves original completed_at
    toComplete.push({ user_id: userId, level_number: n, unlocked: true, completed_at: now });
  }

  if (toComplete.length) {
    await supabase.from("roadmap_progress").upsert(toComplete, { onConflict: "user_id,level_number" });
    // Only notify for the specifically-requested level, never for a
    // silently-backfilled earlier one, so a single call never fires more
    // than one notification (e.g. requesting level 3 while 1 and 2 were
    // still incomplete backfills 1, 2, and 3 together, but only level 3 —
    // the level the caller actually asked to advance to — gets a row).
    if (toComplete.some((r) => r.level_number === level)) {
      const def = ROADMAP_LEVELS.find((l) => l.level === level);
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "roadmap_level_up",
        title: `Roadmap: Level ${level} complete`,
        body: def?.title ?? `You completed level ${level}.`,
        related_id: String(level),
        href: "/app/future",
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(ROADMAP_LEVEL_UP_EVENT, { detail: { level } }));
      }
    }
  }

  if (level < MAX_LEVEL) {
    const next = byLevel.get(level + 1);
    if (!next?.unlocked) {
      // completed_at deliberately omitted from this payload so an
      // already-completed next level (shouldn't happen sequentially, but
      // be defensive) is never reset to null/overwritten.
      await supabase
        .from("roadmap_progress")
        .upsert({ user_id: userId, level_number: level + 1, unlocked: true }, { onConflict: "user_id,level_number" });
    }
  }
}
