import type { Business, BusinessCustomer, BusinessExperiment, BusinessInsight, BusinessMetricEntry, BusinessMilestone } from "@/lib/types";
import { stageIndex } from "./journeyStages";

export type HealthDimensionStatus = "good" | "growing" | "needs_validation" | "weak" | "unknown";

export interface BusinessHealth {
  /** 0-100, or null when there isn't enough real data yet to score honestly. */
  overall: number | null;
  product: HealthDimensionStatus;
  demand: HealthDimensionStatus;
  marketing: HealthDimensionStatus;
  revenue: HealthDimensionStatus;
  retention: HealthDimensionStatus;
}

const DIMENSION_SCORE: Record<Exclude<HealthDimensionStatus, "unknown">, number> = {
  good: 90,
  growing: 75,
  needs_validation: 50,
  weak: 25,
};

/**
 * Pure, deterministic computation over real stored rows — mirrors
 * src/lib/goals/status.ts's computeGoalStatus. Never asks the AI to
 * self-assess; a dimension is "unknown" (not scored) rather than
 * guessed when there isn't enough real data yet, and overall is null
 * unless at least two dimensions have real signal.
 */
export function computeBusinessHealth(
  business: Business,
  milestones: BusinessMilestone[],
  metrics: BusinessMetricEntry[],
  insights: BusinessInsight[],
  experiments: BusinessExperiment[],
  customers: BusinessCustomer[]
): BusinessHealth {
  const currentStageIndex = stageIndex(business.stage);
  const buildStageIndex = stageIndex("build");
  const validationStageIndex = stageIndex("validation");

  const product = computeProduct(milestones, currentStageIndex, buildStageIndex);
  const demand = computeDemand(customers, experiments, currentStageIndex, validationStageIndex);
  const marketing = computeMarketing(metrics, currentStageIndex);
  const revenue = computeRevenue(metrics, currentStageIndex);
  const retention = computeRetention(customers);

  const dimensions = [product, demand, marketing, revenue, retention];
  const scored = dimensions.filter((d): d is Exclude<HealthDimensionStatus, "unknown"> => d !== "unknown");
  const overall = scored.length >= 2 ? Math.round(scored.reduce((sum, d) => sum + DIMENSION_SCORE[d], 0) / scored.length) : null;

  return { overall, product, demand, marketing, revenue, retention };
}

function computeProduct(milestones: BusinessMilestone[], currentStageIndex: number, buildStageIndex: number): HealthDimensionStatus {
  if (currentStageIndex < buildStageIndex) return "unknown";
  const buildMilestones = milestones.filter((m) => m.stage === "build" || m.stage === "launch");
  if (buildMilestones.length === 0) return "unknown";
  const doneRatio = buildMilestones.filter((m) => m.done).length / buildMilestones.length;
  if (doneRatio >= 0.7) return "good";
  if (doneRatio > 0) return "needs_validation";
  return "weak";
}

function computeDemand(customers: BusinessCustomer[], experiments: BusinessExperiment[], currentStageIndex: number, validationStageIndex: number): HealthDimensionStatus {
  if (currentStageIndex < validationStageIndex) return "unknown";
  const interviewed = customers.filter((c) => c.stage !== "lead").length;
  const validatingExperiments = experiments.filter((e) => e.status === "completed" && e.conclusion.trim());
  if (interviewed === 0 && validatingExperiments.length === 0) return "needs_validation";
  const positiveExperiment = validatingExperiments.some((e) => /valid|confirm|yes|strong/i.test(e.conclusion));
  if (positiveExperiment || interviewed >= 5) return "good";
  if (interviewed > 0 || validatingExperiments.length > 0) return "growing";
  return "needs_validation";
}

function computeMarketing(metrics: BusinessMetricEntry[], currentStageIndex: number): HealthDimensionStatus {
  const launchStageIndex = stageIndex("launch");
  if (currentStageIndex < launchStageIndex) return "unknown";
  const withTraffic = metrics.filter((m) => (m.visitors ?? 0) > 0 || (m.leads ?? 0) > 0);
  if (withTraffic.length === 0) return "weak";
  const sorted = [...withTraffic].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (sorted.length >= 2 && (last.visitors ?? 0) > (first.visitors ?? 0)) return "growing";
  return "needs_validation";
}

function computeRevenue(metrics: BusinessMetricEntry[], currentStageIndex: number): HealthDimensionStatus {
  const firstCustomersStageIndex = stageIndex("first_customers");
  if (currentStageIndex < firstCustomersStageIndex) return "unknown";
  const withRevenue = metrics.filter((m) => m.revenue !== undefined);
  if (withRevenue.length === 0) return "weak";
  const sorted = [...withRevenue].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const latest = sorted[sorted.length - 1].revenue ?? 0;
  if (latest <= 0) return "weak";
  if (sorted.length >= 2) {
    const previous = sorted[sorted.length - 2].revenue ?? 0;
    if (latest > previous) return "growing";
    if (latest < previous) return "needs_validation";
  }
  return "good";
}

function computeRetention(customers: BusinessCustomer[]): HealthDimensionStatus {
  const resolved = customers.filter((c) => c.stage === "customer" || c.stage === "churned");
  if (resolved.length === 0) return "unknown";
  const churnedRatio = customers.filter((c) => c.stage === "churned").length / resolved.length;
  if (churnedRatio === 0) return "good";
  if (churnedRatio < 0.3) return "growing";
  if (churnedRatio < 0.6) return "needs_validation";
  return "weak";
}

export const HEALTH_DIMENSION_LABEL: Record<keyof Omit<BusinessHealth, "overall">, string> = {
  product: "Product",
  demand: "Demand",
  marketing: "Marketing",
  revenue: "Revenue",
  retention: "Customer retention",
};

export const HEALTH_STATUS_LABEL: Record<HealthDimensionStatus, string> = {
  good: "Good",
  growing: "Growing",
  needs_validation: "Needs validation",
  weak: "Weak",
  unknown: "Unknown",
};
