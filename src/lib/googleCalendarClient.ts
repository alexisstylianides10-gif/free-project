"use client";

import type { CalendarEvent } from "./types";

/** Fire-and-forget push of a UI-driven calendar change out to the user's connected Google Calendar, if any. Never throws — a failed push just means the next full sync reconciles it. */
export async function pushEventToGoogleClient(token: string | null, action: "create" | "update" | "delete", event: CalendarEvent) {
  if (!token) return;
  try {
    await fetch("/api/calendar/google/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, event }),
    });
  } catch (err) {
    console.error("[google calendar] push failed:", err);
  }
}
