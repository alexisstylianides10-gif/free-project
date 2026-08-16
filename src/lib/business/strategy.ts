import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

let cachedClient: Anthropic | null = null;
function anthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

export type MarketingCategory = "free" | "paid" | "partnership" | "outbound" | "content" | "community";

export interface MarketingIdea {
  idea: string;
  category: MarketingCategory;
  platform: string;
}

const STRATEGY_TOOL: Anthropic.Messages.Tool = {
  name: "record_marketing_ideas",
  description: "Record realistic, prioritized marketing ideas for getting a business its first customers, grounded in the specific business described.",
  input_schema: {
    type: "object",
    properties: {
      ideas: {
        type: "array",
        minItems: 6,
        maxItems: 10,
        items: {
          type: "object",
          properties: {
            idea: { type: "string", description: "One concrete, specific action — not generic advice like 'do social media'." },
            category: { type: "string", enum: ["free", "paid", "partnership", "outbound", "content", "community"] },
            platform: { type: "string", description: "Where/how, e.g. 'Reddit r/smallbusiness', 'cold email', 'local Facebook groups'." },
          },
          required: ["idea", "category", "platform"],
        },
      },
    },
    required: ["ideas"],
  },
};

export type GenerateStrategyOutcome = { ok: true; ideas: MarketingIdea[] } | { ok: false; error: string };

/**
 * Grounded in the business's own stored fields only (name/problem/customer/
 * solution/stage) — never fabricates market data. Shared by the
 * business_generate_strategy tool and could be called from a dedicated UI
 * action later, same pattern as documents/ask.ts's askDocument.
 */
export async function generateMarketingIdeas(supabase: SupabaseClient, userId: string, businessId: string): Promise<GenerateStrategyOutcome> {
  const { data: business, error } = await supabase
    .from("businesses")
    .select("name,problem,solution,target_customer,stage")
    .eq("id", businessId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { ok: false, error: "Couldn't load that business." };
  if (!business) return { ok: false, error: "I couldn't find that business." };

  const prompt = [
    `Business: ${business.name}.`,
    business.problem ? `Problem it solves: ${business.problem}.` : "",
    business.solution ? `What it does: ${business.solution}.` : "",
    business.target_customer ? `Target customer: ${business.target_customer}.` : "",
    `Current stage: ${String(business.stage).replace(/_/g, " ")}.`,
    "Give realistic marketing ideas prioritized for someone at this stage — favor free/low-cost, high-effort-tolerance tactics for an early-stage business over expensive paid ads.",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const response = await anthropic().messages.create({
      model: process.env.ALXIOUM_MODEL || "claude-sonnet-4-5-20250929",
      max_tokens: 1200,
      system:
        "You are a grounded marketing advisor for an early-stage founder. Never invent market statistics or guarantee results. Every idea must be something the founder could actually start this week — specific platforms/channels, not generic advice.",
      tools: [STRATEGY_TOOL],
      tool_choice: { type: "tool", name: "record_marketing_ideas" },
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
    });
    const toolUse = response.content.find((b) => b.type === "tool_use");
    const ideas = (toolUse && "input" in toolUse ? (toolUse.input as { ideas?: MarketingIdea[] }).ideas : undefined) ?? [];
    if (!ideas.length) return { ok: false, error: "Couldn't generate ideas right now." };
    return { ok: true, ideas };
  } catch (err) {
    console.error("[business/strategy] failed:", err);
    return { ok: false, error: "Couldn't generate ideas right now. Try again shortly." };
  }
}
