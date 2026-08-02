"use client";

import { useEffect, useRef } from "react";
import { useTriply } from "@/lib/store";

const STORAGE_KEY = "triply-theme";

export function ThemeProvider() {
  const theme = useTriply((s) => s.profile.theme);
  const updateProfile = useTriply((s) => s.updateProfile);
  const restoredRef = useRef(false);

  // Restore a saved theme preference once on mount. Applied imperatively
  // (never rendered into SSR HTML), so this can't cause a hydration mismatch.
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      updateProfile({ theme: saved });
    }
  }, [updateProfile]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, theme);

    const root = document.documentElement;
    const apply = (dark: boolean) => root.classList.toggle("dark", dark);

    if (theme === "dark") {
      apply(true);
      return;
    }
    if (theme === "light") {
      apply(false);
      return;
    }
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    apply(mql.matches);
    const listener = (e: MediaQueryListEvent) => apply(e.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, [theme]);

  return null;
}
