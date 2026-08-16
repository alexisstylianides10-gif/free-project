/**
 * Shared shape for AI-generated business idea candidates — used by both
 * /api/business/ideas (produces them) and the Idea Finder / Comparison UI
 * (renders them). Nothing here is persisted; only the idea the user picks
 * becomes a real `businesses` row.
 */
export interface IdeaCandidateScore {
  demand: number;
  competition: number;
  difficulty: number;
  monetization: number;
  userFit: number;
  overall: number;
}

export interface IdeaCandidate {
  name: string;
  problem: string;
  customer: string;
  solution: string;
  businessModel: string;
  monetization: string;
  difficulty: "easy" | "moderate" | "challenging" | "ambitious";
  startupCost: string;
  advantages: string[];
  risks: string[];
  competitionLevel: "low" | "medium" | "high";
  validationMethod: string;
  firstActions: string[];
  score: IdeaCandidateScore;
}

export interface IdeaFinderAnswers {
  goodAt?: string;
  enjoy?: string;
  timeAvailable?: string;
  budget?: string;
  format?: string;
  customerType?: string;
}
