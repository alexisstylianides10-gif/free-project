/**
 * Single source of truth for product naming/copy that shows up in the UI,
 * metadata, and the PWA manifest. Change it here and it propagates
 * everywhere (root layout metadata, manifest, onboarding copy, nav header,
 * the AI Coach's own self-description) without hunting through the
 * codebase — the one exception is the app icon PNGs, which are rendered
 * pixels rather than text; regenerate those separately if the mark letter
 * changes (see the icon-generation note below).
 */
export const branding = {
  name: "Alxioum",
  shortName: "Alxioum",
  /** Single letter/glyph rendered in the logo mark across auth screens,
   * the welcome screen, and the loading screen. */
  markLetter: "A",
  tagline: "Build your future while you build your grades.",
  description:
    "Alxioum helps students stay on top of school while discovering and building their future career: school, skills, projects, and career, all in one place.",
  themeColor: "#0A0C1A",
  backgroundColor: "#0A0C1A",
} as const;

/**
 * Canonical production domain — the single source of truth for `layout.tsx`
 * metadata (canonical URL, OG/Twitter absolute URLs), `robots.ts`, and
 * `sitemap.ts`. Overridable via `NEXT_PUBLIC_SITE_URL` for preview/staging
 * deploys. Wave 3 note: the previous hardcoded fallback in `layout.tsx`
 * (`https://futureos.vercel.app`) predated the FutureOS -> Alxioum rename
 * and was never updated to a real domain; corrected here rather than left
 * stale (see PROJECT_STATE.md Wave 3a for the judgment call).
 */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.alxioum.com").replace(/\/$/, "");
