import type { ToolSpec, ToolContext } from "./types";
import type { BusinessStage } from "@/lib/types";
import { JOURNEY_STAGES, stageIndex } from "@/lib/business/journeyStages";
import { generateMarketingIdeas } from "@/lib/business/strategy";
import { researchCompetitors } from "@/lib/business/competitors";
import { formatDayLabel, formatTime12, timeOverlap } from "@/lib/utils";
import { pushEventToGoogle } from "@/lib/google/calendar";
import { getWeeklyReview } from "@/lib/business/weeklyReview";
import { fetchOccurrencesInRange, fetchOccurrencesOnDate } from "@/lib/ai/eventOccurrences";

async function logBusinessActivity(ctx: ToolContext, businessId: string, kind: string, description: string) {
  await ctx.supabase.from("business_activity").insert({ user_id: ctx.userId, business_id: businessId, kind, description });
}

async function loadBusiness(ctx: ToolContext, businessId: string) {
  const { data } = await ctx.supabase.from("businesses").select("*").eq("id", businessId).eq("user_id", ctx.userId).maybeSingle();
  return data as Record<string, unknown> | null;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** First open gap of at least durationMinutes within the working day, scanning past sorted busy blocks. */
function findGap(busy: { start: number; end: number }[], durationMinutes: number, dayStart = 8 * 60, dayEnd = 21 * 60): { start: number; end: number } | null {
  const sorted = [...busy].sort((a, b) => a.start - b.start);
  let cursor = dayStart;
  for (const b of sorted) {
    if (b.start - cursor >= durationMinutes) return { start: cursor, end: cursor + durationMinutes };
    cursor = Math.max(cursor, b.end);
  }
  if (dayEnd - cursor >= durationMinutes) return { start: cursor, end: cursor + durationMinutes };
  return null;
}

export const businessSearch: ToolSpec<{ query?: string }> = {
  name: "business_search",
  statusLabel: "Looking up your businesses…",
  description: "Search the user's businesses (Business Builder goals) by name. Use this first to resolve the exact businessId before any other business_* tool — never guess an id.",
  inputSchema: { type: "object", properties: { query: { type: "string", description: "Free-text match against the business name. Omit to list all." } } },
  consequential: false,
  execute: async (ctx, input) => {
    let q = ctx.supabase.from("businesses").select("id,name,stage,status,goal_id").eq("user_id", ctx.userId);
    if (input.query?.trim()) q = q.ilike("name", `%${input.query.trim()}%`);
    const { data, error } = await q.order("created_at", { ascending: true }).limit(20);
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: { businesses: (data ?? []).map((b) => ({ id: b.id, name: b.name, stage: b.stage, status: b.status, goalId: b.goal_id })) } };
  },
};

export const businessGet: ToolSpec<{ businessId: string }> = {
  name: "business_get",
  statusLabel: "Loading business details…",
  description: "Get the full current state of one business — stage, plan fields, milestone progress, latest metrics, open insights, and customer count. Requires an exact businessId from business_search.",
  inputSchema: { type: "object", properties: { businessId: { type: "string" } }, required: ["businessId"] },
  consequential: false,
  execute: async (ctx, input) => {
    const business = await loadBusiness(ctx, input.businessId);
    if (!business) return { ok: false, error: "I couldn't find that business." };
    const [{ data: goal }, { data: milestones }, { data: metrics }, { data: insights }, { data: customers }, { data: experiments }] = await Promise.all([
      ctx.supabase.from("goals").select("measurement_current,measurement_target,measurement_unit,target_date").eq("id", business.goal_id as string).maybeSingle(),
      ctx.supabase.from("business_milestones").select("stage,title,done").eq("business_id", input.businessId).order("sort_order", { ascending: true }),
      ctx.supabase.from("business_metrics").select("*").eq("business_id", input.businessId).order("recorded_at", { ascending: false }).limit(1),
      ctx.supabase.from("business_insights").select("kind,title,status").eq("business_id", input.businessId).eq("status", "open"),
      ctx.supabase.from("business_customers").select("id,stage").eq("business_id", input.businessId),
      ctx.supabase.from("business_experiments").select("question,status,conclusion").eq("business_id", input.businessId).order("created_at", { ascending: false }).limit(5),
    ]);
    const milestoneRows = milestones ?? [];
    const nextMilestone = milestoneRows.find((m) => !m.done);
    return {
      ok: true,
      result: {
        id: business.id,
        name: business.name,
        idea: business.idea_summary,
        problem: business.problem,
        solution: business.solution,
        targetCustomer: business.target_customer,
        stage: business.stage,
        status: business.status,
        revenueModel: business.revenue_model,
        price: business.price,
        goalTarget: goal?.measurement_target,
        goalCurrent: goal?.measurement_current,
        goalUnit: goal?.measurement_unit,
        targetDate: goal?.target_date,
        milestonesDone: milestoneRows.filter((m) => m.done).length,
        milestonesTotal: milestoneRows.length,
        nextMilestone: nextMilestone ? { title: nextMilestone.title, stage: nextMilestone.stage } : null,
        latestMetrics: metrics?.[0] ?? null,
        openInsights: insights ?? [],
        customerCount: (customers ?? []).length,
        customersByStage: (customers ?? []).reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.stage]: (acc[c.stage] ?? 0) + 1 }), {}),
        recentExperiments: experiments ?? [],
      },
    };
  },
};

export const businessUpdate: ToolSpec<{
  businessId: string;
  stage?: string;
  status?: string;
  problem?: string;
  solution?: string;
  targetCustomer?: string;
  valueProposition?: string;
  revenueModel?: string;
  price?: number;
  pricePeriod?: string;
}> = {
  name: "business_update",
  statusLabel: "Updating business…",
  description: "Propose updating a business's stage, status, or plan fields (problem/solution/target customer/value proposition/pricing). Requires exact businessId from business_search.",
  inputSchema: {
    type: "object",
    properties: {
      businessId: { type: "string" },
      stage: { type: "string", enum: JOURNEY_STAGES.map((s) => s.key) },
      status: { type: "string", enum: ["building", "paused", "archived"] },
      problem: { type: "string" },
      solution: { type: "string" },
      targetCustomer: { type: "string" },
      valueProposition: { type: "string" },
      revenueModel: { type: "string", enum: ["one_time", "subscription", "usage", "commission", "marketplace", "freemium", "service", "other"] },
      price: { type: "number" },
      pricePeriod: { type: "string" },
    },
    required: ["businessId"],
  },
  consequential: true,
  action: "update",
  describe: async (ctx, input) => {
    const business = await loadBusiness(ctx, input.businessId);
    if (!business) return { error: "I couldn't find that business." };
    const changes: string[] = [];
    if (input.stage) changes.push(`move to ${input.stage.replace(/_/g, " ")}`);
    if (input.status) changes.push(`set status to ${input.status}`);
    if (input.problem !== undefined) changes.push("update the problem statement");
    if (input.solution !== undefined) changes.push("update the solution");
    if (input.targetCustomer !== undefined) changes.push("update the target customer");
    if (input.valueProposition !== undefined) changes.push("update the value proposition");
    if (input.revenueModel) changes.push(`set revenue model to ${input.revenueModel}`);
    if (input.price !== undefined) changes.push(`set price to ${input.price}`);
    if (!changes.length) return { error: "Nothing to update." };
    return { summary: `Update "${business.name}" — ${changes.join(", ")}?` };
  },
  execute: async (ctx, input) => {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.stage) row.stage = input.stage;
    if (input.status) row.status = input.status;
    if (input.problem !== undefined) row.problem = input.problem;
    if (input.solution !== undefined) row.solution = input.solution;
    if (input.targetCustomer !== undefined) row.target_customer = input.targetCustomer;
    if (input.valueProposition !== undefined) row.value_proposition = input.valueProposition;
    if (input.revenueModel) row.revenue_model = input.revenueModel;
    if (input.price !== undefined) row.price = input.price;
    if (input.pricePeriod !== undefined) row.price_period = input.pricePeriod;
    const { error } = await ctx.supabase.from("businesses").update(row).eq("id", input.businessId).eq("user_id", ctx.userId);
    if (error) return { ok: false, error: error.message };
    if (input.stage) await logBusinessActivity(ctx, input.businessId, "stage_changed", `Moved to ${input.stage.replace(/_/g, " ")}`);
    return { ok: true, result: { businessId: input.businessId } };
  },
};

export const businessCreateMission: ToolSpec<{ businessId: string; title: string; missionDate?: string }> = {
  name: "business_create_mission",
  statusLabel: "Creating mission…",
  description: "Propose a daily mission for a business — one concrete action for today. Requires exact businessId.",
  inputSchema: { type: "object", properties: { businessId: { type: "string" }, title: { type: "string" }, missionDate: { type: "string", description: "ISO date, defaults to today." } }, required: ["businessId", "title"] },
  consequential: true,
  action: "create",
  describe: async (ctx, input) => {
    const business = await loadBusiness(ctx, input.businessId);
    if (!business) return { error: "I couldn't find that business." };
    return { summary: `Set today's mission for "${business.name}": ${input.title}?` };
  },
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase
      .from("business_missions")
      .insert({ user_id: ctx.userId, business_id: input.businessId, title: input.title, mission_date: input.missionDate ?? ctx.today })
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: { mission: data } };
  },
};

export const businessCompleteMission: ToolSpec<{ missionId: string }> = {
  name: "business_complete_mission",
  statusLabel: "Completing mission…",
  description: "Mark a business mission complete. Requires exact missionId.",
  inputSchema: { type: "object", properties: { missionId: { type: "string" } }, required: ["missionId"] },
  consequential: true,
  action: "complete",
  describe: async (ctx, input) => {
    const { data } = await ctx.supabase.from("business_missions").select("title,status,business_id").eq("id", input.missionId).eq("user_id", ctx.userId).maybeSingle();
    if (!data) return { error: "I couldn't find that mission." };
    if (data.status === "completed") return { error: "That mission is already complete." };
    return { summary: `Mark "${data.title}" complete?` };
  },
  execute: async (ctx, input) => {
    const { data: mission } = await ctx.supabase.from("business_missions").select("business_id,title").eq("id", input.missionId).eq("user_id", ctx.userId).maybeSingle();
    if (!mission) return { ok: false, error: "I couldn't find that mission." };
    const { error } = await ctx.supabase.from("business_missions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", input.missionId);
    if (error) return { ok: false, error: error.message };
    await logBusinessActivity(ctx, mission.business_id as string, "mission_completed", `Completed mission: "${mission.title}"`);
    return { ok: true, result: { missionId: input.missionId } };
  },
};

export const businessCreateExperiment: ToolSpec<{ businessId: string; question: string; hypothesis?: string; testDescription?: string }> = {
  name: "business_create_experiment",
  statusLabel: "Setting up experiment…",
  description: "Propose a new business experiment — a question to test, a hypothesis, and how to test it. Requires exact businessId.",
  inputSchema: {
    type: "object",
    properties: { businessId: { type: "string" }, question: { type: "string" }, hypothesis: { type: "string" }, testDescription: { type: "string" } },
    required: ["businessId", "question"],
  },
  consequential: true,
  action: "create",
  describe: async (ctx, input) => {
    const business = await loadBusiness(ctx, input.businessId);
    if (!business) return { error: "I couldn't find that business." };
    return { summary: `Start an experiment for "${business.name}": "${input.question}"?` };
  },
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase
      .from("business_experiments")
      .insert({ user_id: ctx.userId, business_id: input.businessId, question: input.question, hypothesis: input.hypothesis ?? "", test_description: input.testDescription ?? "" })
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    await logBusinessActivity(ctx, input.businessId, "experiment_created", `Started experiment: "${input.question}"`);
    return { ok: true, result: { experiment: data } };
  },
};

export const businessUpdateExperiment: ToolSpec<{ experimentId: string; status?: string; result?: string; conclusion?: string }> = {
  name: "business_update_experiment",
  statusLabel: "Recording experiment result…",
  description: "Record a result/conclusion for an experiment, or update its status. Requires exact experimentId.",
  inputSchema: {
    type: "object",
    properties: { experimentId: { type: "string" }, status: { type: "string", enum: ["planned", "running", "completed"] }, result: { type: "string" }, conclusion: { type: "string" } },
    required: ["experimentId"],
  },
  consequential: true,
  action: "update",
  describe: async (ctx, input) => {
    const { data } = await ctx.supabase.from("business_experiments").select("question,business_id").eq("id", input.experimentId).eq("user_id", ctx.userId).maybeSingle();
    if (!data) return { error: "I couldn't find that experiment." };
    return { summary: `Update experiment "${data.question}"?` };
  },
  execute: async (ctx, input) => {
    const { data: experiment } = await ctx.supabase.from("business_experiments").select("business_id,question").eq("id", input.experimentId).eq("user_id", ctx.userId).maybeSingle();
    if (!experiment) return { ok: false, error: "I couldn't find that experiment." };
    const row: Record<string, unknown> = {};
    if (input.status) row.status = input.status;
    if (input.result !== undefined) row.result = input.result;
    if (input.conclusion !== undefined) row.conclusion = input.conclusion;
    if (input.status === "completed") row.completed_at = new Date().toISOString();
    const { error } = await ctx.supabase.from("business_experiments").update(row).eq("id", input.experimentId);
    if (error) return { ok: false, error: error.message };
    if (input.status === "completed") await logBusinessActivity(ctx, experiment.business_id as string, "experiment_completed", `Completed experiment: "${experiment.question}"`);
    return { ok: true, result: { experimentId: input.experimentId } };
  },
};

export const businessRecordCustomer: ToolSpec<{ businessId: string; name: string; stage?: string; notes?: string }> = {
  name: "business_record_customer",
  statusLabel: "Recording customer…",
  description: "Record a lead, interview, trial, or customer for a business. Requires exact businessId.",
  inputSchema: {
    type: "object",
    properties: { businessId: { type: "string" }, name: { type: "string" }, stage: { type: "string", enum: ["lead", "interviewed", "trial", "customer", "churned"] }, notes: { type: "string" } },
    required: ["businessId", "name"],
  },
  consequential: true,
  action: "create",
  describe: async (ctx, input) => {
    const business = await loadBusiness(ctx, input.businessId);
    if (!business) return { error: "I couldn't find that business." };
    return { summary: `Add ${input.stage ?? "lead"} "${input.name}" to "${business.name}"?` };
  },
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase
      .from("business_customers")
      .insert({ user_id: ctx.userId, business_id: input.businessId, name: input.name, stage: input.stage ?? "lead", notes: input.notes ?? "" })
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    await logBusinessActivity(ctx, input.businessId, "customer_added", `Added ${input.stage ?? "lead"}: "${input.name}"`);
    return { ok: true, result: { customer: data } };
  },
};

export const businessRecordFeedback: ToolSpec<{ businessId: string; customerId?: string; kind: string; content: string }> = {
  name: "business_record_feedback",
  statusLabel: "Recording feedback…",
  description: "Record a pain point, feature request, objection, or piece of praise heard from a customer. Requires exact businessId.",
  inputSchema: {
    type: "object",
    properties: {
      businessId: { type: "string" },
      customerId: { type: "string" },
      kind: { type: "string", enum: ["pain_point", "feature_request", "objection", "praise", "other"] },
      content: { type: "string" },
    },
    required: ["businessId", "kind", "content"],
  },
  consequential: false,
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase
      .from("business_feedback")
      .insert({ user_id: ctx.userId, business_id: input.businessId, customer_id: input.customerId ?? null, kind: input.kind, content: input.content })
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    await logBusinessActivity(ctx, input.businessId, "feedback_recorded", `Recorded ${input.kind.replace(/_/g, " ")}`);
    return { ok: true, result: { feedback: data } };
  },
};

export const businessRecordMetrics: ToolSpec<{
  businessId: string;
  revenue?: number;
  expenses?: number;
  customers?: number;
  mrr?: number;
  orders?: number;
  conversionRate?: number;
  visitors?: number;
  leads?: number;
  trials?: number;
  note?: string;
}> = {
  name: "business_record_metrics",
  statusLabel: "Recording metrics…",
  description: "Record updated business numbers the user reports (revenue, expenses, customers, etc.). Only record what the user actually stated — never invent a number. Requires exact businessId.",
  inputSchema: {
    type: "object",
    properties: {
      businessId: { type: "string" },
      revenue: { type: "number" },
      expenses: { type: "number" },
      customers: { type: "number" },
      mrr: { type: "number" },
      orders: { type: "number" },
      conversionRate: { type: "number" },
      visitors: { type: "number" },
      leads: { type: "number" },
      trials: { type: "number" },
      note: { type: "string" },
    },
    required: ["businessId"],
  },
  consequential: false,
  execute: async (ctx, input) => {
    const business = await loadBusiness(ctx, input.businessId);
    if (!business) return { ok: false, error: "I couldn't find that business." };
    const { data, error } = await ctx.supabase
      .from("business_metrics")
      .insert({
        user_id: ctx.userId,
        business_id: input.businessId,
        revenue: input.revenue ?? null,
        expenses: input.expenses ?? null,
        customers: input.customers ?? null,
        mrr: input.mrr ?? null,
        orders: input.orders ?? null,
        conversion_rate: input.conversionRate ?? null,
        visitors: input.visitors ?? null,
        leads: input.leads ?? null,
        trials: input.trials ?? null,
        note: input.note ?? "",
      })
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    if (input.revenue !== undefined) {
      await ctx.supabase.from("goals").update({ measurement_current: input.revenue }).eq("id", business.goal_id as string).eq("user_id", ctx.userId);
    }
    await logBusinessActivity(ctx, input.businessId, "metrics_recorded", "Recorded updated business metrics");
    return { ok: true, result: { metrics: data } };
  },
};

export const businessAnalyzeMetrics: ToolSpec<{ businessId: string }> = {
  name: "business_analyze_metrics",
  statusLabel: "Analyzing metrics…",
  description: "Aggregate a business's recorded metrics into this-month totals and simple funnel conversion rates. Only uses real recorded data — never invents numbers. Requires exact businessId.",
  inputSchema: { type: "object", properties: { businessId: { type: "string" } }, required: ["businessId"] },
  consequential: false,
  execute: async (ctx, input) => {
    const startOfMonth = `${ctx.today.slice(0, 7)}-01`;
    const { data, error } = await ctx.supabase.from("business_metrics").select("*").eq("business_id", input.businessId).eq("user_id", ctx.userId).gte("recorded_at", startOfMonth);
    if (error) return { ok: false, error: error.message };
    const rows = data ?? [];
    if (rows.length === 0) return { ok: true, result: { hasData: false } };
    const sum = (key: string) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
    const latest = [...rows].sort((a, b) => String(a.recorded_at).localeCompare(String(b.recorded_at))).pop();
    const visitors = sum("visitors");
    const customers = sum("customers");
    return {
      ok: true,
      result: {
        hasData: true,
        thisMonthRevenue: sum("revenue"),
        thisMonthExpenses: sum("expenses"),
        latestCustomers: latest?.customers ?? null,
        latestMrr: latest?.mrr ?? null,
        totalVisitors: visitors,
        totalLeads: sum("leads"),
        totalOrders: sum("orders"),
        visitorToCustomerRate: visitors > 0 ? Math.round((customers / visitors) * 1000) / 10 : null,
      },
    };
  },
};

export const businessGenerateStrategy: ToolSpec<{ businessId: string }> = {
  name: "business_generate_strategy",
  statusLabel: "Generating marketing ideas…",
  description: "Generate realistic, prioritized marketing ideas for a business, grounded in its actual stated problem/solution/customer — never fabricated. Saves them as draft content ideas. Requires exact businessId.",
  inputSchema: { type: "object", properties: { businessId: { type: "string" } }, required: ["businessId"] },
  consequential: false,
  execute: async (ctx, input) => {
    const outcome = await generateMarketingIdeas(ctx.supabase, ctx.userId, input.businessId);
    if (!outcome.ok) return { ok: false, error: outcome.error };
    const rows = outcome.ideas.map((i) => ({ user_id: ctx.userId, business_id: input.businessId, idea: i.idea, platform: `${i.category}: ${i.platform}` }));
    if (rows.length) await ctx.supabase.from("business_content").insert(rows);
    await logBusinessActivity(ctx, input.businessId, "strategy_generated", `Generated ${outcome.ideas.length} marketing ideas`);
    return { ok: true, result: { ideas: outcome.ideas } };
  },
};

export const businessResearchCompetitors: ToolSpec<{ businessId: string }> = {
  name: "business_research_competitors",
  statusLabel: "Researching competitors…",
  description: "Research real competitors for a business using live web search. Never fabricates results — reports 'research unavailable' if nothing real is found. Requires exact businessId.",
  inputSchema: { type: "object", properties: { businessId: { type: "string" } }, required: ["businessId"] },
  consequential: false,
  execute: async (ctx, input) => {
    const outcome = await researchCompetitors(ctx.supabase, ctx.userId, input.businessId);
    if (!outcome.ok) return { ok: false, error: outcome.error };
    if (!outcome.available) return { ok: true, result: { available: false } };
    const rows = outcome.competitors.map((c) => ({
      user_id: ctx.userId,
      business_id: input.businessId,
      name: c.name,
      product: c.product,
      target_customer: c.targetCustomer,
      pricing: c.pricing,
      strengths: c.strengths,
      weaknesses: c.weaknesses,
      positioning: c.positioning,
      source: "ai_research",
    }));
    await ctx.supabase.from("business_competitors").insert(rows);
    await logBusinessActivity(ctx, input.businessId, "competitors_researched", `Found ${outcome.competitors.length} competitors`);
    return { ok: true, result: { available: true, competitors: outcome.competitors, opportunityNote: outcome.opportunityNote } };
  },
};

export const businessGetNextAction: ToolSpec<{ businessId: string }> = {
  name: "business_get_next_action",
  statusLabel: "Working out your next move…",
  description: "Determine the single highest-priority next action for a business, deterministically from real stage/milestone/insight/metrics data — never an invented suggestion. Requires exact businessId.",
  inputSchema: { type: "object", properties: { businessId: { type: "string" } }, required: ["businessId"] },
  consequential: false,
  execute: async (ctx, input) => {
    const business = await loadBusiness(ctx, input.businessId);
    if (!business) return { ok: false, error: "I couldn't find that business." };
    const [{ data: openRisks }, { data: milestones }, { data: customers }, { data: metrics }] = await Promise.all([
      ctx.supabase.from("business_insights").select("title").eq("business_id", input.businessId).eq("kind", "risk").eq("status", "open").order("created_at", { ascending: true }).limit(1),
      ctx.supabase.from("business_milestones").select("title,stage,done,sort_order").eq("business_id", input.businessId).order("sort_order", { ascending: true }),
      ctx.supabase.from("business_customers").select("id").eq("business_id", input.businessId),
      ctx.supabase.from("business_metrics").select("recorded_at").eq("business_id", input.businessId).order("recorded_at", { ascending: false }).limit(1),
    ]);

    const currentStageIdx = stageIndex(business.stage as BusinessStage);
    const nextMilestone = (milestones ?? []).find((m) => !m.done);
    const daysSinceLastMetric = metrics?.[0] ? Math.floor((Date.now() - new Date(metrics[0].recorded_at as string).getTime()) / 86400000) : null;

    // Deterministic priority: an open risk beats a stalled validation stage
    // beats missing metrics beats the next undone milestone. Never authored
    // by the model — it only phrases what's returned here.
    if (openRisks?.length) {
      return { ok: true, result: { reason: "open_risk", action: `Address this risk: "${openRisks[0].title}"`, detail: openRisks[0].title } };
    }
    if (currentStageIdx >= stageIndex("validation") && (customers ?? []).length === 0) {
      return { ok: true, result: { reason: "no_validation", action: "Talk to potential customers — nobody has been interviewed yet.", detail: null } };
    }
    if (currentStageIdx >= stageIndex("first_customers") && (daysSinceLastMetric === null || daysSinceLastMetric > 14)) {
      return { ok: true, result: { reason: "stale_metrics", action: "Record your latest numbers — it's been a while since metrics were updated.", detail: daysSinceLastMetric } };
    }
    if (nextMilestone) {
      return { ok: true, result: { reason: "next_milestone", action: `Work on: "${nextMilestone.title}" (${nextMilestone.stage.replace(/_/g, " ")} stage)`, detail: nextMilestone.title } };
    }
    return { ok: true, result: { reason: "all_done", action: "All current milestones are complete — consider moving to the next stage.", detail: null } };
  },
};

export const businessCreateInsight: ToolSpec<{ businessId: string; kind: string; title: string; rationale?: string; evidence?: string; suggestedAction?: string }> = {
  name: "business_create_insight",
  statusLabel: "Noting insight…",
  description: "Surface a decision, risk, or opportunity for the user to review — a suggestion only, never an action taken automatically. Requires exact businessId.",
  inputSchema: {
    type: "object",
    properties: {
      businessId: { type: "string" },
      kind: { type: "string", enum: ["decision", "risk", "opportunity"] },
      title: { type: "string" },
      rationale: { type: "string", description: "Why this matters." },
      evidence: { type: "string", description: "What real data or conversation prompted this — never invented." },
      suggestedAction: { type: "string" },
    },
    required: ["businessId", "kind", "title"],
  },
  consequential: false,
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase
      .from("business_insights")
      .insert({
        user_id: ctx.userId,
        business_id: input.businessId,
        kind: input.kind,
        title: input.title,
        rationale: input.rationale ?? "",
        evidence: input.evidence ?? "",
        suggested_action: input.suggestedAction ?? "",
      })
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: { insight: data } };
  },
};

export const businessInsightResolve: ToolSpec<{ insightId: string; status: string }> = {
  name: "business_insight_resolve",
  statusLabel: "Updating insight…",
  description: "Accept, ignore, or resolve a decision/risk/opportunity the user has reviewed. Requires exact insightId.",
  inputSchema: { type: "object", properties: { insightId: { type: "string" }, status: { type: "string", enum: ["accepted", "ignored", "resolved"] } }, required: ["insightId", "status"] },
  consequential: false,
  execute: async (ctx, input) => {
    const { data: insight } = await ctx.supabase.from("business_insights").select("business_id,kind,title").eq("id", input.insightId).eq("user_id", ctx.userId).maybeSingle();
    if (!insight) return { ok: false, error: "I couldn't find that insight." };
    const { error } = await ctx.supabase.from("business_insights").update({ status: input.status, resolved_at: new Date().toISOString() }).eq("id", input.insightId);
    if (error) return { ok: false, error: error.message };
    await logBusinessActivity(ctx, insight.business_id as string, `${insight.kind}_${input.status}`, `${input.status[0].toUpperCase()}${input.status.slice(1)} ${insight.kind}: "${insight.title}"`);
    return { ok: true, result: { insightId: input.insightId } };
  },
};

export const businessFindFreeTime: ToolSpec<{ durationMinutes?: number; fromDate?: string; daysAhead?: number }> = {
  name: "business_find_free_time",
  statusLabel: "Checking your calendar for open time…",
  description:
    "Find open slots on the user's calendar over the next several days, for scheduling dedicated business work. Read-only — creates nothing. Call this before business_schedule_block to pick a real, conflict-free time rather than guessing.",
  inputSchema: {
    type: "object",
    properties: {
      durationMinutes: { type: "number", description: "Length of the block needed, in minutes. Default 30." },
      fromDate: { type: "string", description: "ISO date to start scanning from. Defaults to today." },
      daysAhead: { type: "number", description: "How many days to scan ahead. Default 5, max 14." },
    },
  },
  consequential: false,
  execute: async (ctx, input) => {
    const duration = input.durationMinutes ?? 30;
    const days = Math.min(Math.max(input.daysAhead ?? 5, 1), 14);
    const startDate = new Date(`${input.fromDate ?? ctx.today}T00:00:00`);
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }
    let occurrences: { date: string; startTime: string; endTime: string }[];
    try {
      occurrences = await fetchOccurrencesInRange(ctx.supabase, ctx.userId, dates[0], dates[dates.length - 1]);
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Couldn't load your calendar just now." };
    }
    const byDate = new Map<string, { start: number; end: number }[]>();
    for (const e of occurrences) {
      const list = byDate.get(e.date) ?? [];
      list.push({ start: toMinutes(e.startTime), end: toMinutes(e.endTime) });
      byDate.set(e.date, list);
    }
    const slots: { date: string; startTime: string; endTime: string }[] = [];
    for (const date of dates) {
      const gap = findGap(byDate.get(date) ?? [], duration);
      if (gap) slots.push({ date, startTime: toHHMM(gap.start), endTime: toHHMM(gap.end) });
      if (slots.length >= 3) break;
    }
    return { ok: true, result: { slots } };
  },
};

export const businessScheduleBlock: ToolSpec<{ businessId: string; title: string; date: string; startTime: string; endTime: string; notes?: string }> = {
  name: "business_schedule_block",
  statusLabel: "Scheduling business time…",
  description:
    "Propose a calendar block of dedicated business work, linked to this business's goal. Requires exact businessId. Call business_find_free_time first to pick a real open slot rather than guessing.",
  inputSchema: {
    type: "object",
    properties: {
      businessId: { type: "string" },
      title: { type: "string" },
      date: { type: "string", description: "ISO date" },
      startTime: { type: "string", description: "HH:mm 24h" },
      endTime: { type: "string", description: "HH:mm 24h" },
      notes: { type: "string" },
    },
    required: ["businessId", "title", "date", "startTime", "endTime"],
  },
  consequential: true,
  action: "create",
  describe: async (ctx, input) => {
    if (input.endTime <= input.startTime) return { error: "End time must be after start time." };
    const business = await loadBusiness(ctx, input.businessId);
    if (!business) return { error: "I couldn't find that business." };
    let conflict: { title: string; startTime: string; endTime: string } | undefined;
    try {
      const occurrences = await fetchOccurrencesOnDate(ctx.supabase, ctx.userId, input.date);
      conflict = occurrences.find((e) => timeOverlap(input.startTime, input.endTime, e.startTime, e.endTime));
    } catch {
      // Conflict detection is best-effort — a lookup failure shouldn't block proposing the block.
    }
    const when = `${formatDayLabel(input.date)}, ${formatTime12(input.startTime)}–${formatTime12(input.endTime)}`;
    const conflictNote = conflict ? `\n\n⚠️ This overlaps with "${conflict.title}" (${formatTime12(conflict.startTime)}–${formatTime12(conflict.endTime)}).` : "";
    return { summary: `Schedule "${input.title}" for "${business.name}" — ${when}?${conflictNote}` };
  },
  execute: async (ctx, input) => {
    const business = await loadBusiness(ctx, input.businessId);
    if (!business) return { ok: false, error: "I couldn't find that business." };
    const { data, error } = await ctx.supabase
      .from("events")
      .insert({
        user_id: ctx.userId,
        title: input.title,
        date: input.date,
        start_time: input.startTime,
        end_time: input.endTime,
        type: "work",
        notes: input.notes ?? null,
        recurrence: "none",
        timezone: ctx.timezone,
        ai_generated: true,
        linked_goal_id: business.goal_id,
      })
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    pushEventToGoogle(ctx.supabase, ctx.userId, "create", {
      id: data.id,
      title: data.title,
      date: data.date,
      startTime: data.start_time,
      endTime: data.end_time,
      notes: data.notes ?? undefined,
      timezone: data.timezone ?? ctx.timezone,
      recurrence: "none",
      source: "alxioum",
    }).catch((err) => console.error("[business_schedule_block] google sync failed:", err));
    await logBusinessActivity(ctx, input.businessId, "time_scheduled", `Scheduled "${input.title}" for ${formatDayLabel(input.date)}`);
    return { ok: true, result: { event: data } };
  },
};

export const businessBootstrap: ToolSpec<{
  businessId: string;
  milestones?: { stage: string; title: string }[];
  missions?: { title: string; missionDate?: string }[];
}> = {
  name: "business_bootstrap",
  statusLabel: "Setting up your business plan…",
  description:
    "'Build With Me' — propose creating several milestones and/or daily missions for a business in ONE confirmation, instead of calling business_create_mission repeatedly. Use when the user wants Alxioum to lay out a starting plan for them. Requires exact businessId.",
  inputSchema: {
    type: "object",
    properties: {
      businessId: { type: "string" },
      milestones: {
        type: "array",
        items: {
          type: "object",
          properties: { stage: { type: "string", enum: JOURNEY_STAGES.map((s) => s.key) }, title: { type: "string" } },
          required: ["stage", "title"],
        },
      },
      missions: {
        type: "array",
        items: { type: "object", properties: { title: { type: "string" }, missionDate: { type: "string" } }, required: ["title"] },
      },
    },
    required: ["businessId"],
  },
  consequential: true,
  action: "create",
  describe: async (ctx, input) => {
    const business = await loadBusiness(ctx, input.businessId);
    if (!business) return { error: "I couldn't find that business." };
    const milestones = input.milestones ?? [];
    const missions = input.missions ?? [];
    if (milestones.length === 0 && missions.length === 0) return { error: "Nothing to set up — include at least one milestone or mission." };
    const parts: string[] = [];
    if (milestones.length) parts.push(`${milestones.length} milestone${milestones.length > 1 ? "s" : ""} (${milestones.map((m) => m.title).join(", ")})`);
    if (missions.length) parts.push(`${missions.length} mission${missions.length > 1 ? "s" : ""} (${missions.map((m) => m.title).join(", ")})`);
    return { summary: `Set up "${business.name}" with ${parts.join(" and ")}?` };
  },
  execute: async (ctx, input) => {
    const createdMilestones: unknown[] = [];
    const createdMissions: unknown[] = [];
    const failures: string[] = [];

    const { data: existing } = await ctx.supabase.from("business_milestones").select("sort_order").eq("business_id", input.businessId).order("sort_order", { ascending: false }).limit(1);
    let nextSort = (existing?.[0]?.sort_order ?? -1) + 1;

    for (const m of input.milestones ?? []) {
      const { data, error } = await ctx.supabase
        .from("business_milestones")
        .insert({ user_id: ctx.userId, business_id: input.businessId, stage: m.stage, title: m.title, sort_order: nextSort })
        .select("*")
        .single();
      if (error) {
        failures.push(`Milestone "${m.title}": ${error.message}`);
        continue;
      }
      nextSort += 1;
      createdMilestones.push(data);
    }

    for (const m of input.missions ?? []) {
      const { data, error } = await ctx.supabase
        .from("business_missions")
        .insert({ user_id: ctx.userId, business_id: input.businessId, title: m.title, mission_date: m.missionDate ?? ctx.today })
        .select("*")
        .single();
      if (error) {
        failures.push(`Mission "${m.title}": ${error.message}`);
        continue;
      }
      createdMissions.push(data);
    }

    if (createdMilestones.length === 0 && createdMissions.length === 0 && failures.length > 0) {
      return { ok: false, error: failures.join("; ") };
    }
    await logBusinessActivity(ctx, input.businessId, "bootstrapped", `Set up ${createdMilestones.length} milestone(s) and ${createdMissions.length} mission(s)`);
    return { ok: true, result: { milestones: createdMilestones, missions: createdMissions, failures } };
  },
};

export const businessWeeklyReviewGet: ToolSpec<{ businessId: string }> = {
  name: "business_weekly_review_get",
  statusLabel: "Pulling together this week…",
  description:
    "Aggregate the last 7 days of real activity for a business — new customers, revenue change, experiments started/completed, missions completed — for a weekly review. Never invents numbers; reports zero where nothing happened. Requires exact businessId.",
  inputSchema: { type: "object", properties: { businessId: { type: "string" } }, required: ["businessId"] },
  consequential: false,
  execute: async (ctx, input) => {
    const outcome = await getWeeklyReview(ctx.supabase, ctx.userId, input.businessId);
    if (!outcome.ok) return { ok: false, error: outcome.error };
    return { ok: true, result: outcome.review };
  },
};

export const businessTools = [
  businessSearch,
  businessGet,
  businessUpdate,
  businessCreateMission,
  businessCompleteMission,
  businessCreateExperiment,
  businessUpdateExperiment,
  businessRecordCustomer,
  businessRecordFeedback,
  businessRecordMetrics,
  businessAnalyzeMetrics,
  businessGenerateStrategy,
  businessResearchCompetitors,
  businessGetNextAction,
  businessCreateInsight,
  businessInsightResolve,
  businessFindFreeTime,
  businessScheduleBlock,
  businessBootstrap,
  businessWeeklyReviewGet,
];
