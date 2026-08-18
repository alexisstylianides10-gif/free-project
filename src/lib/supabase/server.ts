import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Builds a Supabase client scoped to the *caller's own* access token, never
 * a service-role key. Every query this client makes runs through Postgres
 * Row Level Security as that specific authenticated user — there is no way
 * for a request to read or write another user's rows, because we never
 * trust a client-supplied user id. If the token is missing or invalid,
 * `auth.getUser()` fails and the caller gets 401.
 */
export function supabaseForRequest(req: NextRequest): SupabaseClient | null {
  if (!url || !anonKey) return null;
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireUser(req: NextRequest) {
  const client = supabaseForRequest(req);
  if (!client) return { client: null, user: null, error: "Not signed in." } as const;
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return { client: null, user: null, error: "Session expired. Please sign in again." } as const;
  return { client, user, error: null } as const;
}

/**
 * Same idea as `requireUser`, but resolves the caller from a raw access
 * token instead of an Authorization header. Needed for the Google Calendar
 * OAuth connect/callback routes, which are plain browser redirects (Google
 * won't carry our Authorization header) — the token round-trips through the
 * `state` param instead.
 */
export async function requireUserFromToken(token: string | null) {
  if (!url || !anonKey || !token) return { client: null, user: null, error: "Not signed in." } as const;
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return { client: null, user: null, error: "Session expired. Please sign in again." } as const;
  return { client, user, error: null } as const;
}

/**
 * A privileged client that bypasses Row Level Security (and the profiles
 * column-privilege lock — see supabase/schema.sql) entirely. Reserved for a
 * short, explicit list of server-side writes to profiles' billing/usage
 * columns (plan, credits_balance, stripe_*, trial_*, ai_*_used), which are
 * no longer writable by the user-scoped `authenticated` role at all:
 * the Stripe webhook handler (no user session — verified instead via
 * `stripe.webhooks.constructEvent()`'s signature check), the checkout/cancel
 * routes' profile writes, and chat's usage-counter increment — each of these
 * has already verified the calling user's identity via their JWT (or, for
 * the webhook, Stripe's signature) before reaching for this client. Never use
 * this for anything else, and never let it touch a column a user should be
 * able to self-edit (those stay on the normal per-request client).
 */
export function supabaseServiceRole(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
