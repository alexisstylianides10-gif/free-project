"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getAchievement } from "@/lib/catalog/achievements";
import { ACHIEVEMENT_UNLOCKED_EVENT } from "@/lib/actions/achievements";
import { AchievementToast } from "@/components/ui/AchievementToast";

const AUTO_DISMISS_MS = 4500;

interface QueuedToast {
  id: number;
  key: string;
}

interface AchievementToastContextValue {
  /** For award call sites that can't dispatch the browser CustomEvent
   * themselves — currently just the server-side grade-quiz route, whose
   * newly-unlocked keys come back in its JSON response instead of firing
   * client-side. Every other award call site (the large majority — anything
   * that calls awardAchievementOnce from a "use client" component) doesn't
   * need this; it gets picked up automatically via the event listener
   * below. */
  notify: (key: string) => void;
}

const AchievementToastContext = createContext<AchievementToastContextValue | null>(null);

/**
 * Mounted once in the authenticated /app shell (see app/layout.tsx). Listens
 * for ACHIEVEMENT_UNLOCKED_EVENT (dispatched by awardAchievementOnce itself
 * whenever it genuinely inserts a new row, not on an already-owned repeat
 * call) and renders a stacked, auto-dismissing toast per newly unlocked
 * achievement. Lives above individual page components in the tree, so it
 * survives client-side navigation between pages within /app — a call site
 * can `notify()`/fire the event right before navigating away (e.g. the quiz
 * results redirect) and the toast still renders on top of whatever page
 * loads next, the same way a normal global toast system would.
 */
export function AchievementToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<QueuedToast[]>([]);
  const nextId = useRef(0);

  const notify = useCallback((key: string) => {
    if (!getAchievement(key)) return; // unknown key — nothing to show
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, key }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), AUTO_DISMISS_MS);
  }, []);

  useEffect(() => {
    function onUnlocked(e: Event) {
      const key = (e as CustomEvent<{ key: string }>).detail?.key;
      if (key) notify(key);
    }
    window.addEventListener(ACHIEVEMENT_UNLOCKED_EVENT, onUnlocked);
    return () => window.removeEventListener(ACHIEVEMENT_UNLOCKED_EVENT, onUnlocked);
  }, [notify]);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <AchievementToastContext.Provider value={{ notify }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => {
          const achievement = getAchievement(t.key);
          if (!achievement) return null;
          return (
            <div key={t.id} className="pointer-events-auto w-full max-w-sm">
              <AchievementToast achievement={achievement} onDismiss={() => dismiss(t.id)} />
            </div>
          );
        })}
      </div>
    </AchievementToastContext.Provider>
  );
}

/** Only needed by call sites that receive newly-unlocked achievement keys
 * from an API response rather than calling awardAchievementOnce directly in
 * the browser (see the doc comment on `notify` above). */
export function useAchievementToast(): AchievementToastContextValue {
  const ctx = useContext(AchievementToastContext);
  if (!ctx) throw new Error("useAchievementToast must be used within AchievementToastProvider");
  return ctx;
}
