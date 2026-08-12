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
