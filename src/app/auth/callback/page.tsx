"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

/**
 * Where Google sends the browser back after OAuth. Explicitly exchanges the
 * PKCE `code` query param for a session via exchangeCodeForSession() rather
 * than relying on supabase-js's implicit detectSessionInUrl auto-detection —
 * that path was silently failing to land a session in time (users ended up
 * bounced back to /login with no error shown). Falls back to checking for an
 * already-established session for any non-PKCE case.
 *
 * Then does the same "first sign-in" profile bookkeeping login.tsx does for
 * email/password: create the profile row if it's missing (plain insert, not
 * upsert — see the comment on that pattern in login.tsx) and route to
 * choose-plan/onboarding/app depending on what's already set.
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

    async function run() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const oauthError = params.get("error_description") || params.get("error");

      if (oauthError) {
        setError(`Google sign-in failed: ${oauthError}`);
        return;
      }

      if (code) {
        const { data, error: exchangeError } = await client.auth.exchangeCodeForSession(window.location.href);
        if (cancelled) return;
        if (exchangeError) {
          setError(`Couldn't complete sign-in: ${exchangeError.message}`);
          return;
        }
        if (data.session?.user) {
          await routeAfterSignIn(data.session.user);
          return;
        }
      }

      // No code param (or exchange didn't return a session) — fall back to
      // checking for an already-established session.
      const { data } = await client.auth.getSession();
      if (cancelled) return;
      if (data.session?.user) {
        await routeAfterSignIn(data.session.user);
      } else {
        setError("Couldn't complete sign-in — no session was returned. Try again.");
      }
    }

    run();

    // Also listen in case the session lands via the auth state change event
    // instead (covers any timing edge case run() doesn't).
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) routeAfterSignIn(session.user);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
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
