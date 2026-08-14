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
  Student: {
    id: "Student",
    name: "Student",
    priceMonthlyEUR: 4,
    priceYearlyEUR: 40,
    aiMessagesPerMonth: 1000,
    maxOutputTokensPerReply: 1400,
    contextConversationTurns: 16,
    features: [
      "Everything in Pro, at student pricing",
      "1,000 AI actions / month",
      "Calendar + Tasks + Memory agents",
      "Longer conversation memory",
      "Priority support",
    ],
  },
  Pro: {
    id: "Pro",
    name: "Pro",
    priceMonthlyEUR: 8,
    priceYearlyEUR: 80,
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
  Max: {
    id: "Max",
    name: "Max",
    priceMonthlyEUR: 25,
    priceYearlyEUR: 250,
    aiMessagesPerMonth: Infinity,
    maxOutputTokensPerReply: 2000,
    contextConversationTurns: 30,
    features: [
      "Unlimited AI actions",
      "Every agent, including new ones as they launch",
      "Longest conversation memory",
      "Priority support",
      "Everything in Pro",
    ],
  },
};

export function planLimits(plan: Plan): PlanDefinition {
  return PLANS[plan] ?? PLANS.Free;
}
