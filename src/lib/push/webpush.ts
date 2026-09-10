import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("VAPID keys are not configured on the server.");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:noreply@alxioum.net", publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  href?: string;
}

/**
 * Sends `payload` to every device `userId` has enabled push on. A device
 * that comes back 404/410 (browser unsubscribed, or the subscription
 * expired) is deleted so it stops being retried forever — same "clean up
 * dead rows on failure" approach as everywhere else in this codebase that
 * fans out to external endpoints.
 */
export async function sendPushToUser(client: SupabaseClient, userId: string, payload: PushPayload): Promise<void> {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  ensureConfigured();

  const { data: subs } = await client.from("push_subscriptions").select("*").eq("user_id", userId);
  if (!subs || subs.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          body
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await client.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );
}
