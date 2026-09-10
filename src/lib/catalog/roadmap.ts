export interface RoadmapLevelDef {
  level: number;
  stage: "Discover" | "Learn" | "Build" | "Launch" | "Grow";
  title: string;
  description: string;
  /** "auto" = the app advances this level itself, from a real tracked
   * action (see src/lib/actions/roadmap.ts callers). "manual" = the
   * underlying action is real-world and unverifiable by the app, so the
   * student self-reports it via "Mark as done" — same honesty-based
   * pattern already used for mission completion. */
  advancement: "auto" | "manual";
}

// The generic 6-level Career Roadmap shown on the Future tab, following the
// product spec's DISCOVER -> LEARN -> BUILD -> LAUNCH -> GROW progression.
export const ROADMAP_LEVELS: RoadmapLevelDef[] = [
  { level: 1, stage: "Discover", title: "Discover your interests", description: "Complete onboarding and explore your top career matches.", advancement: "auto" },
  { level: 2, stage: "Learn", title: "Learn the basics", description: "Build one core skill your top career needs: coding, design, writing, or numbers.", advancement: "auto" },
  { level: 3, stage: "Build", title: "Build your first project", description: "Turn what you're learning into something real you can show.", advancement: "auto" },
  { level: 4, stage: "Launch", title: "Launch it", description: "Share your project or idea with a real audience, even a small one.", advancement: "manual" },
  { level: 5, stage: "Grow", title: "Get your first users or feedback", description: "Get real feedback from people outside your immediate circle.", advancement: "manual" },
  { level: 6, stage: "Grow", title: "Build something bigger", description: "Turn an early win into a bigger project, portfolio, or small business.", advancement: "manual" },
];
