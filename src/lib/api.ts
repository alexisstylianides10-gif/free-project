import { supabase } from "@/lib/supabase/client";

/** Calls a same-origin API route with the current Supabase session's access
 * token attached, matching what `requireUser()` on the server expects.
 * Pass `timeoutMs` to abort (and reject) a call that's taking too long —
 * used by the onboarding AI-research calls so a slow or flaky connection
 * can't leave the caller waiting indefinitely; leave it unset for routes
 * where a long-running AI response is expected and fine to wait out. */
export async function authedFetch(path: string, init: RequestInit = {}, timeoutMs?: number): Promise<Response> {
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const token = data.session?.access_token;
  const controller = timeoutMs ? new AbortController() : undefined;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  try {
    return await fetch(path, {
      ...init,
      signal: controller?.signal ?? init.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
