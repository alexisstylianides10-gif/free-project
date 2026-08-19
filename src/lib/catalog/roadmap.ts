export interface RoadmapLevelDef {
  level: number;
  stage: "Discover" | "Learn" | "Build" | "Launch" | "Grow";
  title: string;
  description: string;
}

// The generic 6-level Career Roadmap shown on the Future tab, following the
// product spec's DISCOVER -> LEARN -> BUILD -> LAUNCH -> GROW progression.
export const ROADMAP_LEVELS: RoadmapLevelDef[] = [
  { level: 1, stage: "Discover", title: "Discover your interests", description: "Complete onboarding and explore your top career matches." },
  { level: 2, stage: "Learn", title: "Learn the basics", description: "Build one core skill your top career needs — coding, design, writing, or numbers." },
  { level: 3, stage: "Build", title: "Build your first project", description: "Turn what you're learning into something real you can show." },
  { level: 4, stage: "Launch", title: "Launch it", description: "Share your project or idea with a real audience, even a small one." },
  { level: 5, stage: "Grow", title: "Get your first users or feedback", description: "Get real feedback from people outside your immediate circle." },
  { level: 6, stage: "Grow", title: "Build something bigger", description: "Turn an early win into a bigger project, portfolio, or small business." },
];
