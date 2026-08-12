"use client";

import { useEffect, useRef } from "react";
import { useAlxioum } from "@/lib/store";

const STORAGE_KEY = "alxioum-theme";

export function ThemeProvider() {
  const theme = useAlxioum((s) => s.profile?.theme ?? "system");
  const updateProfile = useAlxioum((s) => s.updateProfile);
  const restoredRef = useRef(false);

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
