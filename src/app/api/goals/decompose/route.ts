import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/ai/rateLimit";

export const runtime = "nodejs";

let cachedClient: Anthropic | null = null;
function anthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

interface ProposedMilestone {
  title: string;
  description?: string;
}

const PROPOSE_GOAL_TOOL: Anthropic.Messages.Tool = {
  name: "propose_goal_plan",
  description: "Propose a structured plan for a goal the user wants to achieve. This is a suggestion only — the user will review and edit every field before anything is created.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "A short, clear goal name (max ~8 words)." },
      description: { type: "string", description: "One or two sentences describing the goal." },
      icon: { type: "string", description: "A single emoji that represents this goal." },
      category: { type: "string", description: "A short category label if one clearly fits (e.g. 'Health', 'Career', 'Learning', 'Finance', 'Creative', 'Relationships'). Leave empty if nothing fits well — do not force one." },
      priority: { type: "string", enum: ["low", "medium", "high"], description: "Best guess based on how the user described it; default to 'medium' if unclear." },
      difficulty: { type: "string", enum: ["easy", "moderate", "challenging", "ambitious"] },
      measurementType: {
        type: "string",
        enum: ["numeric", "distance", "count", "streak", "time", "checklist"],
        description: "How progress should be tracked. Use 'checklist' (milestone-based) unless the goal clearly has a concrete number to hit — e.g. 'run 10km' is distance, 'read 12 books' is count, 'save €2000' is numeric, 'meditate every day' is streak, 'practice 100 hours' is time.",
      },
      measurementUnit: { type: "string", description: "Unit for the measurement, e.g. 'km', 'books', '€', 'days', 'hours'. Empty for checklist type." },
      measurementTarget: { type: "number", description: "The target number to reach. Omit for checklist type." },
      targetDate: { type: "string", description: "A realistic ISO target date (YYYY-MM-DD), only if one can reasonably be inferred from what the user said or from typical timeframes for this kind of goal. Omit if you'd be guessing." },
      milestones: {
        type: "array",
        description: "3-6 concrete, sequential milestones that break the goal into real progress markers. Keep each one specific and achievable, not vague.",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
          },
          required: ["title"],
        },
      },
    },
    required: ["name", "description", "icon", "priority", "difficulty", "measurementType", "milestones"],
  },
};

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: "Give it a moment before trying again." }, { status: 429 });
  }

  let body: { input?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const input = body.input?.trim();
  if (!input) return NextResponse.json({ error: "Describe what you want to achieve." }, { status: 400 });
  if (input.length > 600) return NextResponse.json({ error: "Keep it a bit shorter." }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);

  try {
    const response = await anthropic().messages.create({
      model: process.env.ALXIOUM_MODEL || "claude-sonnet-4-5-20250929",
      max_tokens: 1000,
      system: `You are helping a user turn a goal they described into a concrete, realistic plan. Today's date is ${today}. Be honest and grounded — never inflate difficulty or invent an overly ambitious plan to sound impressive, and never invent a target date, number, or milestone you can't reasonably justify from what the user said. This proposal is reviewed and edited by the user before anything is saved, so it's fine to make a clear best-effort suggestion, but every field should be something a real person would consider sensible for this goal.`,
      tools: [PROPOSE_GOAL_TOOL],
      tool_choice: { type: "tool", name: "propose_goal_plan" },
      messages: [{ role: "user", content: [{ type: "text", text: `I want to: ${input}` }] }],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    const plan =
      (toolUse && "input" in toolUse
        ? (toolUse.input as {
            name?: string;
            description?: string;
            icon?: string;
            category?: string;
            priority?: string;
            difficulty?: string;
            measurementType?: string;
            measurementUnit?: string;
            measurementTarget?: number;
            targetDate?: string;
            milestones?: ProposedMilestone[];
          })
        : undefined) ?? {};

    if (!plan.name || !plan.milestones?.length) {
      return NextResponse.json({ error: "Couldn't turn that into a plan — try describing it a bit more specifically." }, { status: 422 });
    }

    return NextResponse.json({
      name: plan.name,
      description: plan.description ?? "",
      icon: plan.icon || "🎯",
      category: plan.category || undefined,
      priority: plan.priority ?? "medium",
      difficulty: plan.difficulty ?? "moderate",
      measurementType: plan.measurementType ?? "checklist",
      measurementUnit: plan.measurementUnit ?? "",
      measurementTarget: plan.measurementTarget,
      targetDate: plan.targetDate || undefined,
      milestones: plan.milestones.map((m) => ({ title: m.title, description: m.description ?? "" })),
    });
  } catch (err) {
    console.error("[goals/decompose] failed:", err);
    return NextResponse.json({ error: "Couldn't build a plan right now. Try again shortly." }, { status: 502 });
  }
}
