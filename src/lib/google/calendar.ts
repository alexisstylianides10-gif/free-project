import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEvent } from "@/lib/types";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const API_BASE = "https://www.googleapis.com/calendar/v3";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

function redirectUri(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return `${site}/api/calendar/google/callback`;
}

function requireClientCreds(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google Calendar isn't configured on the server yet.");
  return { clientId, clientSecret };
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.NEXT_PUBLIC_SITE_URL);
}

/** Builds the URL to send the user's browser to for Google's consent screen. `state` round-trips back to our callback so it can identify who's connecting. */
export function buildAuthUrl(state: string): string {
  const { clientId } = requireClientCreds();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPE,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export async function exchangeCodeForTokens(code: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: string }> {
  const { clientId, clientSecret } = requireClientCreds();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  const body = (await res.json()) as GoogleTokenResponse;
  if (!body.refresh_token) {
    throw new Error("Google didn't return a refresh token. Try disconnecting any prior access at myaccount.google.com/permissions and connecting again.");
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: new Date(Date.now() + body.expires_in * 1000).toISOString(),
  };
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
  const { clientId, clientSecret } = requireClientCreds();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  const body = (await res.json()) as GoogleTokenResponse;
  return { accessToken: body.access_token, expiresAt: new Date(Date.now() + body.expires_in * 1000).toISOString() };
}

interface ConnectionRow {
  google_calendar_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  sync_token: string | null;
  connected_at: string;
  last_synced_at: string | null;
}

async function getConnection(supabase: SupabaseClient, userId: string): Promise<ConnectionRow | null> {
  const { data, error } = await supabase.from("calendar_connections").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data as ConnectionRow | null;
}

/** Returns a valid access token for the user's connection, refreshing (and persisting the refresh) if it's expired. Returns null if not connected. */
async function getValidAccessToken(supabase: SupabaseClient, userId: string): Promise<{ accessToken: string; calendarId: string } | null> {
  const connection = await getConnection(supabase, userId);
  if (!connection) return null;
  const expiresInMs = new Date(connection.token_expires_at).getTime() - Date.now();
  if (expiresInMs > 60_000) {
    return { accessToken: connection.access_token, calendarId: connection.google_calendar_id };
  }
  const refreshed = await refreshAccessToken(connection.refresh_token);
  await supabase.from("calendar_connections").update({ access_token: refreshed.accessToken, token_expires_at: refreshed.expiresAt }).eq("user_id", userId);
  return { accessToken: refreshed.accessToken, calendarId: connection.google_calendar_id };
}

export async function getConnectionStatus(supabase: SupabaseClient, userId: string) {
  const connection = await getConnection(supabase, userId);
  if (!connection) return { connected: false as const };
  return {
    connected: true as const,
    googleCalendarId: connection.google_calendar_id,
    connectedAt: connection.connected_at,
    lastSyncedAt: connection.last_synced_at ?? undefined,
  };
}

export async function saveConnection(supabase: SupabaseClient, userId: string, tokens: { accessToken: string; refreshToken: string; expiresAt: string }) {
  const { error } = await supabase.from("calendar_connections").upsert({
    user_id: userId,
    google_calendar_id: "primary",
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    token_expires_at: tokens.expiresAt,
    connected_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function disconnect(supabase: SupabaseClient, userId: string) {
  const connection = await getConnection(supabase, userId);
  if (connection) {
    // Best effort — a failed revoke shouldn't block the user from disconnecting locally.
    await fetch(`${REVOKE_URL}?token=${encodeURIComponent(connection.refresh_token)}`, { method: "POST" }).catch(() => {});
  }
  const { error } = await supabase.from("calendar_connections").delete().eq("user_id", userId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Event mapping — Alxioum <-> Google Calendar
// ---------------------------------------------------------------------------

interface GoogleEventBody {
  summary: string;
  location?: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

function toGoogleEventBody(event: Pick<CalendarEvent, "title" | "date" | "startTime" | "endTime" | "location" | "notes" | "timezone">): GoogleEventBody {
  return {
    summary: event.title,
    location: event.location,
    description: event.notes,
    start: { dateTime: `${event.date}T${event.startTime}:00`, timeZone: event.timezone },
    end: { dateTime: `${event.date}T${event.endTime}:00`, timeZone: event.timezone },
  };
}

interface GoogleEvent {
  id: string;
  status?: string;
  summary?: string;
  location?: string;
  description?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  recurringEventId?: string;
}

/** Maps a Google event (already expanded via singleEvents=true) to Alxioum's shape. Returns null for events we deliberately don't import. */
function fromGoogleEvent(g: GoogleEvent): (Pick<CalendarEvent, "title" | "date" | "startTime" | "endTime" | "location" | "notes" | "timezone"> & { type: CalendarEvent["type"] }) | null {
  if (!g.start || !g.end) return null;
  const allDay = Boolean(g.start.date && !g.start.dateTime);
  const date = allDay ? g.start.date! : g.start.dateTime!.slice(0, 10);
  const startTime = allDay ? "00:00" : g.start.dateTime!.slice(11, 16);
  const endTime = allDay ? "23:59" : g.end.dateTime!.slice(11, 16);
  return {
    title: g.summary || "(No title)",
    date,
    startTime,
    endTime,
    location: g.location || undefined,
    notes: g.description || undefined,
    timezone: g.start.timeZone || "UTC",
    type: "personal",
  };
}

/** Pushes a single Alxioum-native event change out to Google. Silently returns on events we don't sync (recurring, or no connection) — best-effort, never throws into the caller's write path. */
export async function pushEventToGoogle(
  supabase: SupabaseClient,
  userId: string,
  action: "create" | "update" | "delete",
  event: Pick<CalendarEvent, "id" | "title" | "date" | "startTime" | "endTime" | "location" | "notes" | "timezone" | "recurrence" | "source" | "googleEventId">
): Promise<void> {
  try {
    if (event.source === "google" && action === "create") return; // already came from Google
    if (event.recurrence !== "none") return; // recurring events aren't synced in this MVP
    const conn = await getValidAccessToken(supabase, userId);
    if (!conn) return;
    const headers = { Authorization: `Bearer ${conn.accessToken}`, "Content-Type": "application/json" };

    if (action === "delete") {
      if (!event.googleEventId) return;
      await fetch(`${API_BASE}/calendars/${encodeURIComponent(conn.calendarId)}/events/${event.googleEventId}`, { method: "DELETE", headers });
      return;
    }

    const body = JSON.stringify(toGoogleEventBody(event));
    if (action === "create" || !event.googleEventId) {
      const res = await fetch(`${API_BASE}/calendars/${encodeURIComponent(conn.calendarId)}/events`, { method: "POST", headers, body });
      if (!res.ok) return;
      const created = (await res.json()) as GoogleEvent;
      await supabase.from("events").update({ google_event_id: created.id }).eq("id", event.id).eq("user_id", userId);
    } else {
      await fetch(`${API_BASE}/calendars/${encodeURIComponent(conn.calendarId)}/events/${event.googleEventId}`, { method: "PATCH", headers, body });
    }
  } catch (err) {
    console.error("[google calendar] push failed:", err);
  }
}

/** Pulls new/changed/deleted events from Google into Alxioum. Uses the stored sync token for an incremental fetch when available, otherwise a bounded full sync (-30/+180 days). */
export async function pullEventsFromGoogle(supabase: SupabaseClient, userId: string): Promise<{ imported: number; updated: number; removed: number }> {
  const connection = await getConnection(supabase, userId);
  if (!connection) return { imported: 0, updated: 0, removed: 0 };
  const conn = await getValidAccessToken(supabase, userId);
  if (!conn) return { imported: 0, updated: 0, removed: 0 };

  let imported = 0;
  let updated = 0;
  let removed = 0;
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;

  do {
    const params = new URLSearchParams({ singleEvents: "true", maxResults: "250" });
    if (connection.sync_token) {
      params.set("syncToken", connection.sync_token);
    } else {
      params.set("orderBy", "startTime");
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      const to = new Date(now);
      to.setDate(to.getDate() + 180);
      params.set("timeMin", from.toISOString());
      params.set("timeMax", to.toISOString());
    }
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${API_BASE}/calendars/${encodeURIComponent(conn.calendarId)}/events?${params.toString()}`, {
      headers: { Authorization: `Bearer ${conn.accessToken}` },
    });
    if (res.status === 410) {
      // Sync token expired/invalid — Google wants a full resync.
      await supabase.from("calendar_connections").update({ sync_token: null }).eq("user_id", userId);
      return pullEventsFromGoogle(supabase, userId);
    }
    if (!res.ok) throw new Error(`Google events.list failed: ${await res.text()}`);
    const body = (await res.json()) as { items: GoogleEvent[]; nextPageToken?: string; nextSyncToken?: string };

    for (const g of body.items) {
      if (g.status === "cancelled") {
        const { data } = await supabase.from("events").delete().eq("user_id", userId).eq("google_event_id", g.id).select("id").maybeSingle();
        if (data) removed++;
        continue;
      }
      const mapped = fromGoogleEvent(g);
      if (!mapped) continue;
      const { data: existing } = await supabase.from("events").select("id").eq("user_id", userId).eq("google_event_id", g.id).maybeSingle();
      if (existing) {
        await supabase
          .from("events")
          .update({ title: mapped.title, date: mapped.date, start_time: mapped.startTime, end_time: mapped.endTime, location: mapped.location ?? null, notes: mapped.notes ?? null, timezone: mapped.timezone })
          .eq("id", existing.id);
        updated++;
      } else {
        await supabase.from("events").insert({
          user_id: userId,
          title: mapped.title,
          date: mapped.date,
          start_time: mapped.startTime,
          end_time: mapped.endTime,
          type: mapped.type,
          location: mapped.location ?? null,
          notes: mapped.notes ?? null,
          timezone: mapped.timezone,
          source: "google",
          google_event_id: g.id,
        });
        imported++;
      }
    }

    pageToken = body.nextPageToken;
    if (body.nextSyncToken) nextSyncToken = body.nextSyncToken;
  } while (pageToken);

  await supabase.from("calendar_connections").update({ sync_token: nextSyncToken ?? connection.sync_token, last_synced_at: new Date().toISOString() }).eq("user_id", userId);
  return { imported, updated, removed };
}
