import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { ClaudeProvider } from "@/lib/ai/claudeProvider";
import { isRateLimited } from "@/lib/ai/rateLimit";

export const runtime = "nodejs";

const provider = new ClaudeProvider();

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: "Give it a moment before trying again." }, { status: 429 });
  }

  const { data: profileRow } = await client.from("profiles").select("plan").eq("id", user.id).maybeSingle();
  const plan = profileRow?.plan;
  if (plan !== "Student" && plan !== "Max") {
    return NextResponse.json({ error: "School research is part of the Study section (Student and Max plans)." }, { status: 403 });
  }

  const { data: studentRow } = await client
    .from("student_profiles")
    .select("school_name, country, education_level")
    .eq("user_id", user.id)
    .maybeSingle();

  const schoolName = studentRow?.school_name?.trim();
  const country = studentRow?.country?.trim();
  if (!schoolName || !country) {
    return NextResponse.json({ error: "Add your school name and country first." }, { status: 400 });
  }

  const prompt = `Research the school "${schoolName}" in ${country}${
    studentRow?.education_level ? ` (${studentRow.education_level})` : ""
  }. Look for: the typical academic calendar or term dates, the exam board or grading/curriculum system it uses, and any other genuinely useful facts for a student there. If you can't find reliable information about this specific school, say so plainly instead of guessing or inventing details. Keep it to a short, factual summary under 130 words, and mention your sources by name where relevant.`;

  let text: string;
  try {
    const response = await provider.createMessage({
      system:
        "You are a careful research assistant. Only state facts you found via search or are highly confident about. If information about a specific school can't be found, say so directly rather than fabricating details.",
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      tools: [],
      maxTokens: 700,
      enableWebSearch: true,
    });
    text = response.content
      .filter((b): b is Extract<typeof response.content[number], { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("\n\n")
      .trim();
    if (!text) text = "Alxioum couldn't find reliable information about this school.";
  } catch (err) {
    console.error("[research-school] failed:", err);
    return NextResponse.json({ error: "Couldn't research that school right now. Try again shortly." }, { status: 502 });
  }

  const researchedAt = new Date().toISOString();
  const { error: upsertError } = await client
    .from("student_profiles")
    .update({ research_summary: text, researched_at: researchedAt })
    .eq("user_id", user.id);
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  await client.from("memory").insert({
    user_id: user.id,
    category: "Facts",
    content: `${schoolName} (${country}): ${text}`,
    reason: "Researched by Alxioum during Study setup.",
    source: "ai",
    active: true,
  });

  return NextResponse.json({ researchSummary: text, researchedAt });
}
