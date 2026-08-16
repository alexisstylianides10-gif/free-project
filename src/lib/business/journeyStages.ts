import type { BusinessStage } from "@/lib/types";

export interface JourneyStageDef {
  key: BusinessStage;
  label: string;
  icon: string;
}

export const JOURNEY_STAGES: JourneyStageDef[] = [
  { key: "idea", label: "Idea", icon: "💡" },
  { key: "validation", label: "Validation", icon: "🔎" },
  { key: "business_model", label: "Business Model", icon: "📋" },
  { key: "build", label: "Build", icon: "🛠" },
  { key: "launch", label: "Launch", icon: "🚀" },
  { key: "first_customers", label: "First Customers", icon: "💰" },
  { key: "grow", label: "Grow", icon: "📈" },
  { key: "scale", label: "Scale", icon: "⚡" },
];

export function stageIndex(stage: BusinessStage): number {
  return JOURNEY_STAGES.findIndex((s) => s.key === stage);
}

export function stageLabel(stage: BusinessStage): string {
  return JOURNEY_STAGES.find((s) => s.key === stage)?.label ?? stage;
}

/**
 * One representative milestone per journey stage, seeded unchecked when a
 * business is created — gives the Journey view real content from day one
 * instead of 8 empty stages, and doubles as the flattened milestone list
 * the spec's "Business Milestones" section shows.
 */
export const SEED_MILESTONES: { stage: BusinessStage; title: string }[] = [
  { stage: "idea", title: "Business idea selected" },
  { stage: "validation", title: "Customer problem validated" },
  { stage: "business_model", title: "Business model defined" },
  { stage: "build", title: "MVP built" },
  { stage: "launch", title: "Landing page live" },
  { stage: "first_customers", title: "First paying customer" },
  { stage: "grow", title: "Revenue goal reached" },
  { stage: "scale", title: "Customer base doubled" },
];
