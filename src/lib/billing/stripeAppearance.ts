import type { Appearance } from "@stripe/stripe-js";

/**
 * Stripe Elements' `appearance` API only accepts concrete CSS color
 * strings, not var(--foo) references, so these mirror the HSL triplets in
 * src/app/globals.css by hand — keep them in sync if the theme palette
 * changes there.
 */
const PALETTE = {
  dark: {
    background: "hsl(228 26% 10%)",
    surfaceRaised: "hsl(228 24% 13%)",
    foreground: "hsl(220 30% 96%)",
    mutedForeground: "hsl(222 14% 62%)",
    border: "hsl(228 20% 20%)",
    accent: "hsl(252 92% 68%)",
    danger: "hsl(356 78% 62%)",
  },
  light: {
    background: "hsl(0 0% 100%)",
    surfaceRaised: "hsl(220 25% 97%)",
    foreground: "hsl(230 30% 12%)",
    mutedForeground: "hsl(222 12% 42%)",
    border: "hsl(220 16% 88%)",
    accent: "hsl(252 74% 54%)",
    danger: "hsl(356 68% 48%)",
  },
} as const;

export function stripeAppearance(resolved: "dark" | "light"): Appearance {
  const c = PALETTE[resolved];
  return {
    theme: resolved === "dark" ? "night" : "stripe",
    variables: {
      colorPrimary: c.accent,
      colorBackground: c.surfaceRaised,
      colorText: c.foreground,
      colorTextSecondary: c.mutedForeground,
      colorDanger: c.danger,
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      borderRadius: "14px",
      spacingUnit: "4px",
    },
    rules: {
      ".Input": { border: `1px solid ${c.border}`, backgroundColor: c.background },
      ".Input:focus": { border: `1px solid ${c.accent}`, boxShadow: "none" },
      ".Label": { fontSize: "13px", fontWeight: "500", color: c.mutedForeground },
      ".Tab": { border: `1px solid ${c.border}`, backgroundColor: c.background },
      ".Tab:hover": { color: c.foreground },
      ".Tab--selected": { border: `1px solid ${c.accent}`, backgroundColor: c.background },
    },
  };
}
