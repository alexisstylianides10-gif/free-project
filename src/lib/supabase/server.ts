import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isBackendConfigured = Boolean(url && anonKey);

/**
 * A Supabase client scoped to the calling user's own JWT, forwarded from the
 * client as a Bearer token. Every query made through this client runs under
 * Postgres Row Level Security as that user — there is no service-role key
 * involved, so a bug here can never leak another user's data. The route
 * handler is responsible for verifying the token resolves to a real user
 * before trusting anything else in the request.
 */
export function authedSupabase(accessToken: string): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured on the server.");
  }
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getAuthedUser(accessToken: string) {
  const client = authedSupabase(accessToken);
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return { client, userId: data.user.id, email: data.user.email ?? "" };
}
