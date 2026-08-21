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
    "Alxioum helps students stay on top of school while discovering and building their future career — school, skills, projects, and career, all in one place.",
  themeColor: "#0A0C1A",
  backgroundColor: "#0A0C1A",
} as const;
