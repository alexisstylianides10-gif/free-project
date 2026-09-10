import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { checkEntitlement } from "@/lib/billing/entitlement";
import { StudyAIError } from "@/lib/study/ai";
import { getUserLanguage } from "@/lib/i18n/serverLocale";
import { generateWeakAreaPlan } from "@/lib/study/weakArea";

export const runtime = "nodejs";

const MAX_DESCRIPTION_LENGTH = 1000;

interface WeakAreaPlanBody {
  subjectId?: string;
  description?: string;
}

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error }, { status: 401 });
  if (!(await checkEntitlement(client, user.id))) {
    return NextResponse.json({ error: "This feature requires Alxioum Plus." }, { status: 402 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "This isn't configured yet. Add ANTHROPIC_API_KEY on the server." }, { status: 503 });
  }

  let body: WeakAreaPlanBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { subjectId } = body;
  const description = (body.description ?? "").trim();
  if (!subjectId) return NextResponse.json({ error: "subjectId is required." }, { status: 400 });
  if (!description) return NextResponse.json({ error: "Describe the problem you're having." }, { status: 400 });
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json({ error: `Keep the description under ${MAX_DESCRIPTION_LENGTH} characters.` }, { status: 400 });
  }

  const { data: subject } = await client.from("study_subjects").select("*").eq("id", subjectId).maybeSingle();
  if (!subject) return NextResponse.json({ error: "Subject not found." }, { status: 404 });

  try {
    const plan = await generateWeakAreaPlan({
      client,
      userId: user.id,
      subjectId,
      subjectName: subject.name,
      description,
      language: await getUserLanguage(client, user.id),
    });
    return NextResponse.json({ plan });
  } catch (err) {
    const message = err instanceof StudyAIError ? err.message : "Couldn't build a plan for that. Try again in a moment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
