"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

/**
 * Where Google/Apple send the browser back after OAuth. supabase-js parses
 * the redirect (PKCE `code` param) and establishes a session automatically
 * (detectSessionInUrl: true on the client) — this page just waits for that,
 * then does the same "first sign-in" profile bookkeeping login.tsx does for
 * email/password: create the profile row if it's missing (plain insert, not
 * upsert — see the comment on that pattern in login.tsx) and route to
 * choose-plan/onboarding/app depending on what's already set.
 *
 * Doesn't rely on AuthProvider's `loading`/`profile` state, which can lag a
 * beat behind the OAuth session actually landing — this reads the session
 * and profile directly to avoid a race with that.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!supabase) {
      setError("Sign-in isn't available right now — the backend isn't configured.");
      return;
    }
    const client = supabase;
    let cancelled = false;

    async function routeAfterSignIn(user: User) {
      if (handledRef.current || cancelled) return;
      handledRef.current = true;

      const { data: profile } = await client
        .from("profiles")
        .select("onboarding_completed, billing_interval")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        const fullName =
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          user.email?.split("@")[0] ||
          "Student";
        const { error: insertError } = await client.from("profiles").insert({ id: user.id, full_name: fullName });
        if (insertError) {
          setError("Signed in, but we couldn't set up your account. Try again.");
          return;
        }
        router.replace("/choose-plan");
        return;
      }

      if (!profile.onboarding_completed) {
        router.replace(profile.billing_interval ? "/onboarding" : "/choose-plan");
        return;
      }
      router.replace("/app");
    }

    client.auth.getSession().then(({ data }) => {
      if (data.session?.user) routeAfterSignIn(data.session.user);
    });

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) routeAfterSignIn(session.user);
    });

    // Nothing signed in within a few seconds — the OAuth attempt was likely
    // canceled or failed silently. Send them back rather than hanging on
    // this screen forever (same "never hang on an external call" lesson as
    // the onboarding research timeout).
    const timeout = setTimeout(() => {
      if (!handledRef.current && !cancelled) router.replace("/login");
    }, 10000);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  if (error) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-sm text-danger">{error}</p>
        <button
          onClick={() => router.replace("/login")}
          className="text-sm font-semibold text-foreground underline underline-offset-4"
        >
          Back to log in
        </button>
      </main>
    );
  }

  return <LoadingScreen message="Finishing sign-in…" />;
}
