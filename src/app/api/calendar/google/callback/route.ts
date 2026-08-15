import { NextRequest, NextResponse } from "next/server";
import { requireUserFromToken } from "@/lib/supabase/server";
import { exchangeCodeForTokens, saveConnection, pullEventsFromGoogle } from "@/lib/google/calendar";

export const runtime = "nodejs";

function settingsRedirect(req: NextRequest, params: Record<string, string>) {
  const url = new URL("/app/settings", req.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");

  if (oauthError) return settingsRedirect(req, { calendar: "error", message: oauthError });
  if (!code) return settingsRedirect(req, { calendar: "error", message: "Missing authorization code." });

  const { client, user } = await requireUserFromToken(state);
  if (!client || !user) return settingsRedirect(req, { calendar: "error", message: "Your session expired — please try connecting again." });

  try {
    const tokens = await exchangeCodeForTokens(code);
    await saveConnection(client, user.id, tokens);
    // Best-effort initial sync so the calendar isn't empty on first look;
    // a failure here doesn't block the connection itself.
    await pullEventsFromGoogle(client, user.id).catch((err) => console.error("[google calendar] initial sync failed:", err));
  } catch (err) {
    console.error("[google calendar] connect failed:", err);
    return settingsRedirect(req, { calendar: "error", message: err instanceof Error ? err.message : "Something went wrong." });
  }

  return settingsRedirect(req, { calendar: "connected" });
}
