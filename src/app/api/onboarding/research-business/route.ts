import "server-only";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/supabase/server";
import { extractJSON, StudyAIError } from "@/lib/study/ai";

export const runtime = "nodejs";

const MODEL = process.env.FUTUREOS_MODEL || "claude-opus-5";

interface ResearchedMilestone {
  title: string;
  description: string;
}
interface ResearchResult {
  snapshot: string;
  milestones: ResearchedMilestone[];
  suggestedIdea?: string;
}

let cachedClient: Anthropic | null = null;
function anthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured on the server.");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

/**
 * Turns a founder's onboarding answers into a short "Business Snapshot" and
 * 4-6 starter milestones — the business-track equivalent of research-school
 * (same JSON-contract-plus-web-search pattern). The caller
 * (completeBusinessOnboarding) falls back to a small hardcoded milestone
 * list on any failure here, so onboarding never breaks on this.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser(req);
  if (!user) return NextResponse.json({ error }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  let body: {
    businessIdea?: string;
    stage?: string;
    targetCustomer?: string;
    focusAreas?: string[];
    strengths?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const businessIdea = (body.businessIdea ?? "").trim();
  const stage = (body.stage ?? "idea").trim();
  const targetCustomer = (body.targetCustomer ?? "").trim();
  const focusAreas = Array.isArray(body.focusAreas) ? body.focusAreas.slice(0, 5) : [];
  const strengths = Array.isArray(body.strengths) ? body.strengths.slice(0, 6) : [];

  const hasIdea = businessIdea.length > 0;

  const system = hasIdea
    ? `You are a sharp, practical startup advisor. Given a founder's business idea, current stage, target customer, and what they want to focus on first, use web search (if the idea names a real market/niche) to sanity-check the space, then write a short, encouraging-but-realistic snapshot and a starter milestone checklist. Never promise revenue, funding, or guaranteed success — stay grounded and actionable. Keep milestones concrete and achievable in the founder's current stage, ordered roughly in the sequence they should tackle them.

Respond with ONLY valid JSON, no prose, no markdown fences, matching exactly this shape:
{
  "snapshot": "1-2 sentence realistic summary of the idea and what matters most right now",
  "milestones": [{ "title": "string (short, action-oriented)", "description": "string (1 sentence, concrete)" }]
}
Include 4-6 milestones.`
    : `You are a sharp, practical startup advisor. This founder doesn't have a business idea yet — they only know they want to start something. Given their strengths and what they want to focus on first, use web search if useful to sanity-check demand, then suggest ONE concrete, realistic, beginner-friendly business direction that plays to their strengths (not a vague category — a specific, nameable business concept), then write a short snapshot explaining why it fits them and a starter milestone checklist for validating and starting it. Never promise revenue, funding, or guaranteed success — stay grounded and actionable. The first 1-2 milestones should be about validating the suggested idea (e.g. talking to potential customers) before building anything.

Respond with ONLY valid JSON, no prose, no markdown fences, matching exactly this shape:
{
  "suggestedIdea": "1 sentence naming the specific business concept you're suggesting",
  "snapshot": "1-2 sentence explanation of why this direction fits them and what matters most right now",
  "milestones": [{ "title": "string (short, action-oriented)", "description": "string (1 sentence, concrete)" }]
}
Include 4-6 milestones.`;

  const userText = hasIdea
    ? `Business idea: ${businessIdea}\nStage: ${stage}\nTarget customer: ${targetCustomer || "not specified"}\nWants to focus on: ${focusAreas.join(", ") || "not specified"}`
    : `No business idea yet.\nStrengths: ${strengths.join(", ") || "not specified"}\nWants to focus on: ${focusAreas.join(", ") || "not specified"}\nTarget customer (if any thoughts): ${targetCustomer || "not specified"}`;

  try {
    const response = await anthropicClient().messages.create({
      model: MODEL,
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: userText }],
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }],
      output_config: { effort: "medium" },
    });

    const textBlock = response.content.find((b): b is Anthropic.Messages.TextBlock => b.type === "text");
    if (!textBlock) throw new StudyAIError("No text response.");
    const result = extractJSON<ResearchResult>(textBlock.text);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Research failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
