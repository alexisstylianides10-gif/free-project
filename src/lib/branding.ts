/**
 * Single source of truth for product naming/copy that shows up in the UI,
 * metadata, and the PWA manifest. "FutureOS" is a placeholder name — change
 * it here and it propagates everywhere (root layout metadata, manifest,
 * onboarding copy, nav header) without hunting through the codebase.
 */
export const branding = {
  name: "FutureOS",
  shortName: "FutureOS",
  tagline: "Build your future while you build your grades.",
  description:
    "FutureOS helps students stay on top of school while discovering and building their future career — school, skills, projects, and career, all in one place.",
  themeColor: "#0A0C1A",
  backgroundColor: "#0A0C1A",
} as const;
