import type { Plan } from "@/lib/types";

/**
 * Single source of truth for pricing and AI usage limits. The pricing page,
 * the Settings/Billing screen, and the server-side usage gate in
 * /api/chat all read from this file — change a number once, it's correct
 * everywhere.
 */
export interface PlanDefinition {
  id: Plan;
  name: string;
  priceMonthlyEUR: number;
  priceYearlyEUR: number;
  aiMessagesPerMonth: number;
  maxOutputTokensPerReply: number;
  contextConversationTurns: number;
  features: string[];
}

export const PLANS: Record<Plan, PlanDefinition> = {
  Free: {
    id: "Free",
    name: "Free",
    priceMonthlyEUR: 0,
    priceYearlyEUR: 0,
    aiMessagesPerMonth: 40,
    maxOutputTokensPerReply: 700,
    contextConversationTurns: 6,
    features: [
      "40 AI actions / month",
      "Calendar agent",
      "Tasks agent",
      "My Day",
    ],
  },
  Pro: {
    id: "Pro",
    name: "Pro",
    priceMonthlyEUR: 19,
    priceYearlyEUR: 190,
    aiMessagesPerMonth: 1000,
    maxOutputTokensPerReply: 1400,
    contextConversationTurns: 16,
    features: [
      "1,000 AI actions / month",
      "Calendar + Tasks + Memory agents",
      "Longer conversation memory",
      "Priority support",
      "Early access to new agents",
    ],
  },
};

export function planLimits(plan: Plan): PlanDefinition {
  return PLANS[plan] ?? PLANS.Free;
}
