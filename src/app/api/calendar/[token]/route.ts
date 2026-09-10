import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServiceRole } from "@/lib/supabase/server";
import { buildICSFeed, type CalendarEvent } from "@/lib/calendar/ics";
import type { Exam, Homework, BusinessMilestone } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Public, unauthenticated by design — calendar apps (Google/Apple/Outlook
 * Calendar) fetch a webcal:// URL on their own schedule with no way to send
 * an Authorization header, so the random `token` in the URL itself is what
 * stands in for auth here. It's a uuid (effectively unguessable) rather
 * than the user's own id, and regenerable from Settings if it ever leaks.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const client = supabaseServiceRole();
  if (!client) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const { data: profile } = await client.from("profiles").select("id, track").eq("calendar_token", token).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const events: CalendarEvent[] = [];

  if (profile.track === "business") {
    const { data: milestones } = await client
      .from("business_milestones")
      .select("*")
      .eq("user_id", profile.id)
      .not("due_date", "is", null)
      .neq("status", "done");
    for (const m of (milestones ?? []) as BusinessMilestone[]) {
      if (!m.due_date) continue;
      events.push({ uid: `milestone-${m.id}`, title: m.title, date: m.due_date, description: m.description ?? undefined });
    }
  } else {
    const [{ data: exams }, { data: homework }] = await Promise.all([
      client.from("exams").select("*").eq("user_id", profile.id),
      client.from("homework").select("*").eq("user_id", profile.id).eq("status", "pending"),
    ]);
    for (const e of (exams ?? []) as Exam[]) {
      events.push({ uid: `exam-${e.id}`, title: `${e.subject} Exam${e.title ? `: ${e.title}` : ""}`, date: e.exam_date });
    }
    for (const h of (homework ?? []) as Homework[]) {
      events.push({ uid: `homework-${h.id}`, title: `${h.subject}: ${h.title}`, date: h.due_date });
    }
  }

  const ics = buildICSFeed(events);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="deadlines.ics"',
      "Cache-Control": "no-cache, max-age=0",
    },
  });
}
