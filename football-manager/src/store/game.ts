"use client";
import { create } from "zustand";
import type { World } from "@/engine/core/types";
import { advanceDay, type DayReport } from "@/engine/world/calendar";
import { SaveManager, type SaveMeta } from "@/db/saves";
import { DatasetLibrary } from "@/data/datasets";

export interface Toast {
  id: number;
  tone: "info" | "success" | "error" | "warn";
  text: string;
}

export type AdvanceMode = "day" | "week" | "match";

export interface AdvanceOutcome {
  daysProcessed: number;
  stoppedFor: "user_match" | "season_end" | "sacked" | "cancelled" | "limit" | "done" | "error";
  pendingFixtureId: string | null;
  error?: string;
}

interface GameState {
  world: World | null;
  version: number;
  saveId: string | null;
  dirty: boolean;
  busy: { label: string; progress: number } | null;
  cancelRequested: boolean;
  toasts: Toast[];
  lastAutosave: string | null;
  setWorld: (w: World | null, saveId: string | null) => void;
  /** Run a mutation on the world, then re-render subscribers. */
  mutate: <T>(fn: (w: World) => T) => T;
  bump: () => void;
  advance: (mode: AdvanceMode) => Promise<AdvanceOutcome>;
  cancel: () => void;
  save: (kind?: SaveMeta["kind"]) => Promise<SaveMeta | null>;
  toast: (text: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
}

let saveManager: SaveManager | null = null;
export function saves(): SaveManager {
  if (!saveManager) saveManager = new SaveManager();
  return saveManager;
}

let library: DatasetLibrary | null = null;
export function datasets(): DatasetLibrary {
  if (!library) library = new DatasetLibrary();
  return library;
}

let toastId = 0;
const yieldToBrowser = () => new Promise<void>((r) => setTimeout(r, 0));

export const useGame = create<GameState>((set, get) => ({
  world: null,
  version: 0,
  saveId: null,
  dirty: false,
  busy: null,
  cancelRequested: false,
  toasts: [],
  lastAutosave: null,
  setWorld: (w, saveId) => {
    try {
      if (saveId) sessionStorage.setItem("fm-active-save", saveId);
      else sessionStorage.removeItem("fm-active-save");
    } catch {
      /* storage unavailable (private mode) – session recovery simply won't happen */
    }
    set({ world: w, saveId, version: get().version + 1, dirty: false });
  },
  mutate: (fn) => {
    const w = get().world;
    if (!w) throw new Error("No career loaded.");
    const out = fn(w);
    set({ version: get().version + 1, dirty: true });
    return out;
  },
  bump: () => set({ version: get().version + 1 }),
  cancel: () => set({ cancelRequested: true }),
  advance: async (mode) => {
    const w = get().world;
    if (!w || get().busy) return { daysProcessed: 0, stoppedFor: "error", pendingFixtureId: null, error: "Busy" };
    const maxDays = mode === "day" ? 1 : mode === "week" ? 7 : 120;
    set({ busy: { label: mode === "match" ? "Advancing to the next match" : "Processing", progress: 0 }, cancelRequested: false });
    let processed = 0;
    let outcome: AdvanceOutcome = { daysProcessed: 0, stoppedFor: "limit", pendingFixtureId: null };
    try {
      for (let i = 0; i < maxDays; i++) {
        if (get().cancelRequested) {
          outcome = { daysProcessed: processed, stoppedFor: "cancelled", pendingFixtureId: null };
          break;
        }
        const r: DayReport = advanceDay(w, { simulateUserMatch: false });
        if (r.userMatchPending) {
          outcome = { daysProcessed: processed, stoppedFor: "user_match", pendingFixtureId: r.userMatchPending };
          break;
        }
        processed++;
        set({ busy: { label: `Processing ${w.meta.currentDate}`, progress: Math.round(((i + 1) / maxDays) * 100) }, version: get().version + 1, dirty: true });
        if (r.sacked) {
          outcome = { daysProcessed: processed, stoppedFor: "sacked", pendingFixtureId: null };
          break;
        }
        if (r.seasonEnded) {
          outcome = { daysProcessed: processed, stoppedFor: "season_end", pendingFixtureId: null };
          break;
        }
        if (i === maxDays - 1) outcome = { daysProcessed: processed, stoppedFor: mode === "match" ? "limit" : "done", pendingFixtureId: null };
        await yieldToBrowser();
      }
    } catch (e) {
      outcome = { daysProcessed: processed, stoppedFor: "error", pendingFixtureId: null, error: (e as Error).message };
      get().toast((e as Error).message, "error");
    } finally {
      set({ busy: null, cancelRequested: false, version: get().version + 1 });
    }
    // automatic saving
    if (w.meta.daysSinceAutosave >= w.meta.autosaveEveryDays || outcome.stoppedFor === "season_end") {
      await get().save("auto");
    }
    return outcome;
  },
  save: async (kind = "manual") => {
    const w = get().world;
    if (!w) return null;
    try {
      const meta = await saves().save(w, { id: get().saveId ?? undefined, kind });
      try { sessionStorage.setItem("fm-active-save", meta.id); } catch { /* ignore */ }
      set({ saveId: meta.id, dirty: false, lastAutosave: kind === "auto" ? new Date().toISOString() : get().lastAutosave });
      if (kind === "manual") get().toast("Career saved.", "success");
      return meta;
    } catch (e) {
      get().toast(`Save failed: ${(e as Error).message}`, "error");
      return null;
    }
  },
  toast: (text, tone = "info") => {
    const id = ++toastId;
    set({ toasts: [...get().toasts, { id, text, tone }] });
    setTimeout(() => get().dismissToast(id), tone === "error" ? 7000 : 3500);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/** Subscribe to the world; components re-render when the version changes. */
export function useWorld(): World {
  const world = useGame((s) => s.world);
  useGame((s) => s.version);
  if (!world) throw new Error("No career loaded");
  return world;
}

export function useVersion(): number {
  return useGame((s) => s.version);
}
