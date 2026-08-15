// Deployed as a Supabase Edge Function ("send-notifications"). Invoked every
// 15 minutes by a pg_cron job (see supabase/schema.sql) via net.http_post.
// Not part of the Next.js build — deploy with:
//   supabase functions deploy send-notifications --project-ref <ref>
//
// For each user with at least one push subscription, checks their local time
// (from profiles.timezone) and notification_prefs before sending anything:
//   - Daily briefing: once per local day, during the 7am local hour, summarizing
//     today's events/tasks and (if scheduleGaps is on) the day's largest free block.
//   - Deadline reminders: tasks due today that haven't been reminded yet.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

interface Profile {
  id: string;
  timezone: string;
  notification_prefs: { deadlines: boolean; scheduleGaps: boolean; dailyBriefing: boolean };
  last_daily_briefing_sent_at: string | null;
}

interface Subscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToLabel(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${period}` : `${h12} ${period}`;
}

/** Largest free block within an 8am-8pm window, at least 90 minutes, between today's events. */
function findLargestGap(events: { start_time: string; end_time: string }[]): { start: number; end: number } | null {
  const DAY_START = 8 * 60;
  const DAY_END = 20 * 60;
  const MIN_GAP = 90;
  const sorted = [...events].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  let cursor = DAY_START;
  let best: { start: number; end: number } | null = null;
  for (const e of sorted) {
    const s = timeToMinutes(e.start_time);
    const en = timeToMinutes(e.end_time);
    if (s > cursor) {
      const gapLen = s - cursor;
      if (gapLen >= MIN_GAP && (!best || gapLen > best.end - best.start)) best = { start: cursor, end: s };
    }
    cursor = Math.max(cursor, en);
  }
  if (DAY_END > cursor) {
    const gapLen = DAY_END - cursor;
    if (gapLen >= MIN_GAP && (!best || gapLen > best.end - best.start)) best = { start: cursor, end: DAY_END };
  }
  return best;
}

function localParts(timezone: string): { date: string; hour: number } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = Number(get("hour")) % 24;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour };
}

async function sendToUser(admin: ReturnType<typeof createClient>, subs: Subscription[], userId: string, payload: { title: string; body: string; url?: string }) {
  const mine = subs.filter((s) => s.user_id === userId);
  await Promise.all(
    mine.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload));
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );
}

Deno.serve(async (req) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  const { data: secretRows, error: secretsError } = await admin.rpc("get_app_secrets");
  if (secretsError || !secretRows) {
    return new Response(JSON.stringify({ error: "Could not load secrets", detail: secretsError?.message }), { status: 500 });
  }
  const secrets = Object.fromEntries(secretRows.map((r: { key: string; value: string }) => [r.key, r.value]));
  webpush.setVapidDetails(secrets.vapid_subject, secrets.vapid_public_key, secrets.vapid_private_key);

  const { data: subs } = await admin.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth");
  const subscriptions = (subs ?? []) as Subscription[];
  if (subscriptions.length === 0) {
    return new Response(JSON.stringify({ ok: true, briefingsSent: 0, remindersSent: 0, note: "No subscribed devices." }), { status: 200 });
  }
  const subscribedUserIds = new Set(subscriptions.map((s) => s.user_id));

  const { data: profileRows } = await admin
    .from("profiles")
    .select("id,timezone,notification_prefs,last_daily_briefing_sent_at")
    .in("id", Array.from(subscribedUserIds));
  const profiles = (profileRows ?? []) as Profile[];

  let briefingsSent = 0;
  let remindersSent = 0;

  for (const profile of profiles) {
    const { date: localDate, hour: localHour } = localParts(profile.timezone);

    // Daily briefing: once per local day, in the 7am local hour.
    if (profile.notification_prefs?.dailyBriefing && localHour === 7 && profile.last_daily_briefing_sent_at !== localDate) {
      const [{ data: todaysEvents }, { data: openTasks }] = await Promise.all([
        admin.from("events").select("start_time,end_time").eq("user_id", profile.id).eq("date", localDate),
        admin.from("tasks").select("id").eq("user_id", profile.id).eq("done", false).eq("due_date", localDate),
      ]);
      const events = (todaysEvents ?? []) as { start_time: string; end_time: string }[];
      const eventCount = events.length;
      const taskCount = openTasks?.length ?? 0;

      // Only worth mentioning a gap when the day isn't already fully empty.
      const gap = profile.notification_prefs?.scheduleGaps && eventCount > 0 ? findLargestGap(events) : null;

      if (eventCount > 0 || taskCount > 0) {
        const parts: string[] = [];
        if (eventCount) parts.push(`${eventCount} event${eventCount === 1 ? "" : "s"}`);
        if (taskCount) parts.push(`${taskCount} task${taskCount === 1 ? "" : "s"} due`);
        const summary = `Today: ${parts.join(" and ")}.`;
        const gapNote = gap ? ` Free ~${Math.round(((gap.end - gap.start) / 60) * 10) / 10}h block ${minutesToLabel(gap.start)}–${minutesToLabel(gap.end)}.` : "";
        await sendToUser(admin, subscriptions, profile.id, {
          title: "Your day, briefly",
          body: `${summary}${gapNote}`,
          url: "/app/today",
        });
        briefingsSent++;
      }
      await admin.from("profiles").update({ last_daily_briefing_sent_at: localDate }).eq("id", profile.id);
    }

    // Deadline reminders: tasks due today, not yet reminded.
    if (profile.notification_prefs?.deadlines) {
      const { data: dueTasks } = await admin
        .from("tasks")
        .select("id,title")
        .eq("user_id", profile.id)
        .eq("done", false)
        .eq("due_date", localDate)
        .eq("deadline_reminder_sent", false);
      for (const task of (dueTasks ?? []) as { id: string; title: string }[]) {
        await sendToUser(admin, subscriptions, profile.id, {
          title: "Due today",
          body: task.title,
          url: "/app/tasks",
        });
        await admin.from("tasks").update({ deadline_reminder_sent: true }).eq("id", task.id);
        remindersSent++;
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, briefingsSent, remindersSent }), { status: 200, headers: { "Content-Type": "application/json" } });
});
