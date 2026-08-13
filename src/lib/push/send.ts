import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@alxioum.app";
  if (!publicKey || !privateKey) throw new Error("VAPID keys are not configured.");
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Sends a push notification to every device the user has subscribed. Drops subscriptions the browser has revoked. */
export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: { title: string; body: string; url?: string }
): Promise<{ sent: number; failed: number }> {
  ensureConfigured();

  const { data, error } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  if (error) throw error;
  const subs = (data ?? []) as SubscriptionRow[];

  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );

  return { sent, failed };
}
