import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServiceRole } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push/webpush";
import { buildDeadlineNotifications } from "@/lib/notifications";
import type { Exam, Homework, BusinessMilestone } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Daily push sweep for upcoming/overdue deadlines, for every user who has
 * push enabled on at least one device. Reuses buildDeadlineNotifications
 * (the same windowing logic the in-app notification bell uses) so "what
 * counts as due soon" never drifts between the bell and a push. Dedup'd via
 * push_sent_deadlines so a student only gets pushed once per deadline, not
 * once per day it stays in the window. Triggered by a Render Cron Job
 * hitting this route with a shared secret — never exposed to the browser.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const client = supabaseServiceRole();
  if (!client) return NextResponse.json({ error: "Service role not configured." }, { status: 503 });

  const { data: subs } = await client.from("push_subscriptions").select("user_id");
  const userIds = [...new Set((subs ?? []).map((s) => s.user_id as string))];
  if (userIds.length === 0) return NextResponse.json({ notified: 0 });

  const today = new Date().toISOString().slice(0, 10);
  let notified = 0;

  for (const userId of userIds) {
    const { data: profile } = await client.from("profiles").select("track").eq("id", userId).maybeSingle();
    const isBusiness = profile?.track === "business";

    const [{ data: exams }, { data: homework }, { data: milestones }, { data: alreadySent }] = await Promise.all([
      isBusiness
        ? Promise.resolve({ data: [] as Exam[] })
        : client.from("exams").select("*").eq("user_id", userId),
      isBusiness
        ? Promise.resolve({ data: [] as Homework[] })
        : client.from("homework").select("*").eq("user_id", userId),
      isBusiness
        ? client.from("business_milestones").select("*").eq("user_id", userId)
        : Promise.resolve({ data: [] as BusinessMilestone[] }),
      client.from("push_sent_deadlines").select("deadline_key").eq("user_id", userId),
    ]);

    const sentKeys = new Set((alreadySent ?? []).map((r) => r.deadline_key as string));

    const items = buildDeadlineNotifications({
      exams: (exams ?? []) as Exam[],
      homework: (homework ?? []) as Homework[],
      milestones: (milestones ?? []) as BusinessMilestone[],
      isBusiness,
      dismissedIds: sentKeys,
      today,
    });

    for (const item of items) {
      await sendPushToUser(client, userId, { title: item.title, body: item.body, href: item.href });
      await client.from("push_sent_deadlines").insert({ user_id: userId, deadline_key: item.id });
      notified++;
    }
  }

  return NextResponse.json({ notified });
}
