import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ClaudeProvider } from "@/lib/ai/claudeProvider";

let cachedClient: Anthropic | null = null;
function anthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

const provider = new ClaudeProvider();

export interface ResearchedCompetitor {
  name: string;
  product: string;
  targetCustomer: string;
  pricing: string;
  strengths: string;
  weaknesses: string;
  positioning: string;
}

export type ResearchCompetitorsOutcome =
  | { ok: true; available: true; competitors: ResearchedCompetitor[]; opportunityNote: string }
  | { ok: true; available: false }
  | { ok: false; error: string };

const STRUCTURE_TOOL: Anthropic.Messages.Tool = {
  name: "record_competitors",
  description: "Structure real competitor research findings into rows. Only include information actually present in the research text — never add anything not stated there.",
  input_schema: {
    type: "object",
    properties: {
      competitors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            product: { type: "string" },
            targetCustomer: { type: "string" },
            pricing: { type: "string", description: "Empty string if pricing wasn't found in the research." },
            strengths: { type: "string" },
            weaknesses: { type: "string" },
            positioning: { type: "string" },
          },
          required: ["name", "product"],
        },
      },
      opportunityNote: { type: "string", description: "One honest sentence on possible differentiation (faster setup, simpler interface, a specific niche, lower complexity) based only on the gaps visible in this research. Empty string if nothing clear stands out." },
    },
    required: ["competitors", "opportunityNote"],
  },
};

/**
 * Two-step, honest-by-construction: (1) Claude's native web search finds
 * real competitors — no forced tool_choice here, since that would prevent
 * the model from actually using web_search (mirrors the one other place
 * this app uses enableWebSearch, /api/study/research-school). (2) a
 * separate, non-web call structures that text into rows, explicitly
 * instructed to add nothing beyond what step 1 actually found. If step 1
 * finds nothing, this returns available:false rather than ever fabricating
 * competitors, prices, or reviews.
 */
export async function researchCompetitors(supabase: SupabaseClient, userId: string, businessId: string): Promise<ResearchCompetitorsOutcome> {
  const { data: business, error } = await supabase
    .from("businesses")
    .select("name,problem,solution,target_customer")
    .eq("id", businessId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { ok: false, error: "Couldn't load that business." };
  if (!business) return { ok: false, error: "I couldn't find that business." };

  const researchPrompt = [
    `Find 2-5 real, existing companies or products that compete with or are similar to this business: "${business.name}".`,
    business.solution ? `What it does: ${business.solution}.` : "",
    business.target_customer ? `Target customer: ${business.target_customer}.` : "",
    "For each one you find, note its name, what it offers, who it's for, its pricing if you can find it, and its apparent strengths/weaknesses/positioning. If you genuinely can't find any real competitors, say so plainly instead of inventing any.",
  ]
    .filter(Boolean)
    .join(" ");

  let researchText: string;
  try {
    const response = await provider.createMessage({
      system: "You are a careful market researcher. Only report companies/products you actually found via search. Never invent a competitor, price, or review. If you find nothing relevant, say so directly.",
      messages: [{ role: "user", content: [{ type: "text", text: researchPrompt }] }],
      tools: [],
      maxTokens: 900,
      enableWebSearch: true,
    });
    researchText = response.content
      .filter((b): b is Extract<(typeof response.content)[number], { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("\n\n")
      .trim();
  } catch (err) {
    console.error("[business/competitors] research step failed:", err);
    return { ok: false, error: "Couldn't research competitors right now. Try again shortly." };
  }

  if (!researchText || /couldn't find|no (real )?competitors|no relevant results/i.test(researchText)) {
    return { ok: true, available: false };
  }

  try {
    const structured = await anthropic().messages.create({
      model: process.env.ALXIOUM_MODEL || "claude-sonnet-4-5-20250929",
      max_tokens: 1200,
      system: "Structure the given research text into rows. Use ONLY information present in the text — never add a competitor, price, or fact not stated there.",
      tools: [STRUCTURE_TOOL],
      tool_choice: { type: "tool", name: "record_competitors" },
      messages: [{ role: "user", content: [{ type: "text", text: researchText }] }],
    });
    const toolUse = structured.content.find((b) => b.type === "tool_use");
    const parsed = (toolUse && "input" in toolUse ? (toolUse.input as { competitors?: ResearchedCompetitor[]; opportunityNote?: string }) : undefined) ?? {};
    if (!parsed.competitors?.length) return { ok: true, available: false };
    return {
      ok: true,
      available: true,
      competitors: parsed.competitors.map((c) => ({
        name: c.name,
        product: c.product ?? "",
        targetCustomer: c.targetCustomer ?? "",
        pricing: c.pricing ?? "",
        strengths: c.strengths ?? "",
        weaknesses: c.weaknesses ?? "",
        positioning: c.positioning ?? "",
      })),
      opportunityNote: parsed.opportunityNote ?? "",
    };
  } catch (err) {
    console.error("[business/competitors] structuring step failed:", err);
    return { ok: false, error: "Found some research but couldn't organize it. Try again shortly." };
  }
}
