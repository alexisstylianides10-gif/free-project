import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { checkEntitlement } from "@/lib/billing/entitlement";
import { callStudyAIForText } from "@/lib/study/ai";

export const runtime = "nodejs";

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "an Instagram caption",
  blog: "a short blog post",
  email: "a marketing email",
  other: "a short piece of marketing copy",
};

/** Drafts a short piece of marketing/content copy for the Business track's
 * content helper — same requireUser + checkEntitlement gate as every other
 * AI route, since this is one of the paid Business Plus features. */
export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error }, { status: 401 });
  if (!(await checkEntitlement(client, user.id))) {
    return NextResponse.json({ error: "This feature requires Alxioum Plus." }, { status: 402 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  let body: { platform?: string; topic?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const platform = (body.platform ?? "other").trim();
  const topic = (body.topic ?? "").trim();
  if (!topic) return NextResponse.json({ error: "Missing topic." }, { status: 400 });

  const { data: businessProfile } = await client
    .from("business_profiles")
    .select("business_idea, target_customer")
    .eq("user_id", user.id)
    .maybeSingle();

  const system = `You are a sharp marketing copywriter for early-stage founders. Write ${PLATFORM_LABEL[platform] ?? PLATFORM_LABEL.other} — concise, specific, no generic filler, no hashtag spam, no guaranteed-results claims. Match the founder's actual business and audience.`;
  const userText = `Business: ${businessProfile?.business_idea || "not specified"}\nTarget customer: ${businessProfile?.target_customer || "not specified"}\nTopic: ${topic}`;

  let content: string;
  try {
    content = await callStudyAIForText({ system, messages: [{ role: "user", content: userText }], maxTokens: 600, effort: "medium" });
  } catch {
    return NextResponse.json({ error: "Couldn't generate content right now. Try again in a moment." }, { status: 502 });
  }

  const { data: saved, error: insertError } = await client
    .from("business_content_ideas")
    .insert({ user_id: user.id, platform, topic, generated_content: content, status: "draft" })
    .select("*")
    .single();

  if (insertError || !saved) {
    return NextResponse.json({ error: "Couldn't save the generated content." }, { status: 500 });
  }

  return NextResponse.json({ idea: saved });
}
