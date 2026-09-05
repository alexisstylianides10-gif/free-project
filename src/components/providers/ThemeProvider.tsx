"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "dark" | "light" | "system";

const STORAGE_KEY = "alxioum_theme";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: "dark" | "light";
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersLight(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

function resolve(mode: ThemeMode): "dark" | "light" {
  if (mode === "system") return systemPrefersLight() ? "light" : "dark";
  return mode;
}

function applyClass(resolved: "dark" | "light") {
  document.documentElement.classList.toggle("light", resolved === "light");
}

/**
 * Inline script injected before hydration so the correct theme class is on
 * <html> before first paint — without this, a light-mode user would see a
 * flash of the dark default while React boots. Light is the primary/default
 * look; dark is opt-in via the toggle (and its own class), matching that.
 */
export const themeInitScript = `(function(){try{var m=localStorage.getItem("${STORAGE_KEY}")||"light";var isLight=m==="light"||(m==="system"&&window.matchMedia("(prefers-color-scheme: light)").matches);if(isLight)document.documentElement.classList.add("light");}catch(e){}})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [resolved, setResolved] = useState<"dark" | "light">("light");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && (window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null)) || "light";
    setModeState(stored);
    const r = resolve(stored);
    setResolved(r);
    applyClass(r);

    if (stored === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: light)");
      const onChange = () => {
        const next = resolve("system");
        setResolved(next);
        applyClass(next);
      };
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    const r = resolve(next);
    setResolved(r);
    applyClass(r);
  }, []);

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
