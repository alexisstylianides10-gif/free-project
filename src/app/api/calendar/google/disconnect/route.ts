import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { disconnect } from "@/lib/google/calendar";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  await disconnect(client, user.id);
  return NextResponse.json({ ok: true });
}
