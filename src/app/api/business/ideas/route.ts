import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/ai/rateLimit";
import type { IdeaCandidate, IdeaFinderAnswers } from "@/lib/business/ideas";

export const runtime = "nodejs";

let cachedClient: Anthropic | null = null;
function anthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

const IDEA_TOOL: Anthropic.Messages.Tool = {
  name: "propose_business_ideas",
  description:
    "Propose 3-5 concrete business idea candidates based on what the user described (a stated idea, or answers about their skills/interests/time/budget). This is a suggestion only, scored as an AI estimate — the user picks one before anything is created.",
  input_schema: {
    type: "object",
    properties: {
      ideas: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "A short, concrete business name (not generic, e.g. 'Coastline Coffee Roasters' not 'Coffee Business')." },
            problem: { type: "string", description: "The real problem this solves, in one sentence." },
            customer: { type: "string", description: "Who the customer is, specifically." },
            solution: { type: "string", description: "What the business actually does/sells, in one or two sentences." },
            businessModel: { type: "string", description: "How the business operates (e.g. 'Subscription SaaS', 'Local service', 'Marketplace')." },
            monetization: { type: "string", description: "Specifically how it makes money (price point, model)." },
            difficulty: { type: "string", enum: ["easy", "moderate", "challenging", "ambitious"] },
            startupCost: { type: "string", description: "A rough, honest startup cost band, e.g. 'Low (under $500)', 'Medium ($500-5,000)', 'High ($5,000+)'." },
            advantages: { type: "array", items: { type: "string" }, description: "2-3 real potential advantages for this specific user, given what they told you." },
            risks: { type: "array", items: { type: "string" }, description: "2-3 honest main risks — never omit this to sound more positive." },
            competitionLevel: { type: "string", enum: ["low", "medium", "high"] },
            validationMethod: { type: "string", description: "The single most useful way to validate demand before building anything." },
            firstActions: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3, description: "Exactly 3 concrete first actions to take this week." },
            score: {
              type: "object",
              description: "0-100 AI estimates, not objective facts. Be honest and differentiated across ideas — not everything should score 70-80.",
              properties: {
                demand: { type: "number" },
                competition: { type: "number", description: "Higher = less competitive / more room." },
                difficulty: { type: "number", description: "Higher = easier to execute." },
                monetization: { type: "number", description: "Higher = clearer path to revenue." },
                userFit: { type: "number", description: "Higher = better fit for this specific user's stated skills/interests/time/budget." },
                overall: { type: "number" },
              },
              required: ["demand", "competition", "difficulty", "monetization", "userFit", "overall"],
            },
          },
          required: [
            "name", "problem", "customer", "solution", "businessModel", "monetization",
            "difficulty", "startupCost", "advantages", "risks", "competitionLevel",
            "validationMethod", "firstActions", "score",
          ],
        },
      },
      recommendedIndex: { type: "number", description: "Index (0-based) of the idea you'd personally investigate first given what the user told you." },
      recommendationNote: { type: "string", description: "One honest sentence explaining the recommendation — framed as a suggestion, never a guarantee (e.g. start with 'Based on what you told me, I'd investigate...')." },
    },
    required: ["ideas", "recommendedIndex", "recommendationNote"],
  },
};

function describeAnswers(a: IdeaFinderAnswers): string {
  const parts: string[] = [];
  if (a.goodAt) parts.push(`good at: ${a.goodAt}`);
  if (a.enjoy) parts.push(`enjoys: ${a.enjoy}`);
  if (a.timeAvailable) parts.push(`time available: ${a.timeAvailable}`);
  if (a.budget) parts.push(`budget: ${a.budget}`);
  if (a.format) parts.push(`format preference: ${a.format}`);
  if (a.customerType) parts.push(`interested customer type: ${a.customerType}`);
  return parts.join("; ");
}

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: "Give it a moment before trying again." }, { status: 429 });
  }

  let body: { freeText?: string; answers?: IdeaFinderAnswers };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const freeText = body.freeText?.trim();
  const answersText = body.answers ? describeAnswers(body.answers) : "";
  if (!freeText && !answersText) {
    return NextResponse.json({ error: "Tell me a bit about what you're looking for first." }, { status: 400 });
  }
  if (freeText && freeText.length > 600) return NextResponse.json({ error: "Keep it a bit shorter." }, { status: 400 });

  const promptParts: string[] = [];
  if (freeText) promptParts.push(`The user said: "${freeText}"`);
  if (answersText) promptParts.push(`They answered a few quick questions: ${answersText}.`);

  try {
    const response = await anthropic().messages.create({
      model: process.env.ALXIOUM_MODEL || "claude-sonnet-4-5-20250929",
      max_tokens: 2200,
      system:
        "You are a grounded startup advisor helping someone find a real business idea worth investigating. Never fabricate market statistics, named competitors, or guaranteed outcomes — scores are your own honest estimate, not fact, and every idea must include real risks alongside advantages. Favor concrete, specific ideas over generic ones (a specific niche and customer, not 'an app for people'). If the user already stated a specific idea, include it (refined) plus 2-4 closely related variations or adjacent angles, not unrelated alternatives.",
      tools: [IDEA_TOOL],
      tool_choice: { type: "tool", name: "propose_business_ideas" },
      messages: [{ role: "user", content: [{ type: "text", text: promptParts.join(" ") }] }],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    const parsed =
      (toolUse && "input" in toolUse
        ? (toolUse.input as { ideas?: IdeaCandidate[]; recommendedIndex?: number; recommendationNote?: string })
        : undefined) ?? {};

    if (!parsed.ideas?.length) {
      return NextResponse.json({ error: "Couldn't come up with ideas for that — try describing it a bit more." }, { status: 422 });
    }

    return NextResponse.json({
      ideas: parsed.ideas,
      recommendedIndex: typeof parsed.recommendedIndex === "number" ? parsed.recommendedIndex : null,
      recommendationNote: parsed.recommendationNote ?? undefined,
    });
  } catch (err) {
    console.error("[business/ideas] failed:", err);
    return NextResponse.json({ error: "Couldn't generate ideas right now. Try again shortly." }, { status: 502 });
  }
}
