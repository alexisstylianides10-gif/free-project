import { supabase } from "@/lib/supabase/client";

/** Calls a same-origin API route with the current Supabase session's access
 * token attached, matching what `requireUser()` on the server expects. */
export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const token = data.session?.access_token;
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}
