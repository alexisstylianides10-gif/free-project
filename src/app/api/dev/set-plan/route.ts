import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, supabaseServiceRole } from "@/lib/supabase/server";
import { PLAN_SWITCHER_EMAILS } from "@/lib/billing/plans";

export const runtime = "nodejs";

const bodySchema = z.object({ plan: z.enum(["Free", "Student", "Pro", "Max"]) });

/**
 * Backs the dev-only plan switcher in Settings (src/app/app/settings/page.tsx).
 * profiles.plan is locked to service-role writes only (see the column-privilege
 * migration), so this route re-checks the same email allowlist server-side and
 * writes via service role — replacing the direct client update the switcher
 * used before that migration existed.
 */
export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  const { data: profile } = await client.from("profiles").select("email").eq("id", user.id).maybeSingle();
  if (!profile || !PLAN_SWITCHER_EMAILS.includes(profile.email)) {
    return NextResponse.json({ error: "Not available for this account." }, { status: 403 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan." }, { status: 400 });

  const serviceRole = supabaseServiceRole();
  if (!serviceRole) return NextResponse.json({ error: "Not configured." }, { status: 501 });
  const { error: updateError } = await serviceRole.from("profiles").update({ plan: parsed.data.plan }).eq("id", user.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
