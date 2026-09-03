"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase/client";
import { LogoMark } from "@/components/shared/LogoMark";
import { BrandPanel } from "@/components/shared/BrandPanel";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { branding } from "@/lib/branding";

/**
 * Where Supabase redirects the browser after a user clicks the link emailed
 * by /forgot-password (`resetPasswordForEmail`'s `redirectTo`). Depending on
 * the project's email-link flow, the recovery session can land here in one
 * of two shapes:
 *   1. A `?code=` PKCE param — exchanged for a session via
 *      exchangeCodeForSession(), the exact same mechanism
 *      auth/callback/page.tsx already uses for OAuth/email-confirmation
 *      links.
 *   2. A `#access_token=...&type=recovery` URL fragment, which the shared
 *      Supabase client's own `detectSessionInUrl: true` option (see
 *      lib/supabase/client.ts) parses automatically on load and fires as a
 *      PASSWORD_RECOVERY (or, on some client versions, a plain SIGNED_IN)
 *      auth event.
 *
 * Rather than assume one specific mechanism, this page covers all three
 * ways a session can end up established here — the code exchange, the auth
 * event, and an already-established session found via getSession() (which
 * covers the exact timing race auth/callback/page.tsx's own comment
 * documents: detectSessionInUrl can finish parsing the hash before this
 * page's own listener has attached) — mirroring auth/callback/page.tsx's
 * own defensive pattern instead of inventing a new one.
 *
 * Deliberately does NOT touch AuthProvider.tsx. The session this page
 * establishes is a real session for the recovering user, on the same shared
 * `supabase` client instance the whole app uses — AuthProvider's own
 * onAuthStateChange listener picks it up independently and runs it through
 * its existing lastUserIdRef staleness-guard exactly like any other sign-in
 * (new user id -> profileLoading true -> profile loads -> profileLoading
 * false). No new interaction with that logic was found; see PROJECT_STATE.md
 * for the full trace.
 */
export default function ResetPasswordPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Guards against the code-exchange path and the auth-event/getSession
  // fallback path both resolving "ready" — only the first one to land
  // should flip state, the rest are harmless no-ops.
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (!supabase) {
      setLinkError("Password reset isn't available right now. The backend isn't configured.");
      setChecking(false);
      return;
    }
    const client = supabase;
    let cancelled = false;

    function markReady() {
      if (resolvedRef.current || cancelled) return;
      resolvedRef.current = true;
      // Clear any linkError a previous 4-second timeout may already have
      // set — a genuine late-arriving recovery success (via the
      // PASSWORD_RECOVERY/SIGNED_IN auth-event fallback) must always win
      // over an earlier timeout-driven "link expired" state, since the
      // render logic checks linkError before sessionReady.
      setLinkError(null);
      setSessionReady(true);
      setChecking(false);
    }

    async function run() {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const code = params.get("code");
      const urlError =
        params.get("error_description") ||
        params.get("error") ||
        hashParams.get("error_description") ||
        hashParams.get("error");

      if (urlError) {
        setLinkError(decodeURIComponent(urlError.replace(/\+/g, " ")));
        setChecking(false);
        return;
      }

      if (code) {
        const { data, error: exchangeError } = await client.auth.exchangeCodeForSession(window.location.href);
        if (cancelled) return;
        if (exchangeError) {
          if (resolvedRef.current || cancelled) return;
          setLinkError(`This reset link is invalid or has expired. ${exchangeError.message}`);
          setChecking(false);
          return;
        }
        if (data.session) {
          markReady();
          return;
        }
      }

      // No code param (or the exchange didn't return a session) — the
      // hash-based recovery flow may already have been handled by the
      // shared client's own detectSessionInUrl before this effect ran.
      // Check for an already-established session first...
      const { data: sessionData } = await client.auth.getSession();
      if (cancelled) return;
      if (sessionData.session) {
        markReady();
        return;
      }

      // ...and if there's genuinely nothing yet, wait for the
      // PASSWORD_RECOVERY event below. If it never fires (a dead/reused/
      // malformed link with no token at all), stop spinning and show a real
      // error instead of hanging forever.
      setTimeout(() => {
        if (!resolvedRef.current && !cancelled) {
          setChecking(false);
          setLinkError("This reset link is invalid or has expired. Request a new one below.");
        }
      }, 4000);
    }

    run();

    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (!session) return;
      if (event === "PASSWORD_RECOVERY") {
        markReady();
      } else if (event === "SIGNED_IN" && !resolvedRef.current) {
        // Some client versions fire SIGNED_IN rather than PASSWORD_RECOVERY
        // for the hash-based recovery flow — nobody is meant to already be
        // signed in on this page, so treat either event as "a recovery
        // session is now active."
        markReady();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!supabase) {
      setFormError("Password reset isn't available right now. The backend isn't configured.");
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setFormError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/app"), 1200);
  }

  if (checking) {
    return <LoadingScreen message="Verifying your reset link…" />;
  }

  if (linkError) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/15">
          <AlertTriangle className="h-6 w-6 text-danger" />
        </span>
        <h1 className="text-xl font-bold text-foreground">Link expired</h1>
        <p className="max-w-xs text-sm text-muted-foreground">{linkError}</p>
        <div className="mt-4 flex w-full max-w-xs flex-col gap-3">
          <Link href="/forgot-password">
            <Button size="lg" className="w-full">
              Request a new link
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="secondary" className="w-full">
              Back to log in
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  if (!sessionReady) return null;

  return (
    <main className="flex min-h-dvh bg-background">
      <div className="flex flex-1 flex-col justify-center px-6 py-10 lg:px-16 xl:px-20">
        <div className="mx-auto w-full max-w-sm">
          <LogoMark size={44} className="mx-auto lg:mx-0" />
          <h1 className="mt-6 text-center text-2xl font-extrabold tracking-tight text-foreground lg:text-left">
            Set a new password
          </h1>
          <p className="mt-1.5 text-center text-sm text-muted-foreground lg:text-left">
            Choose a new password for your {branding.name} account.
          </p>

          {done ? (
            <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-success/40 bg-success/10 p-5 text-center lg:items-start lg:text-left">
              <CheckCircle2 className="h-6 w-6 text-success" />
              <p className="text-sm text-foreground">Password updated. Taking you into the app…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-3.5">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">New password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  autoFocus
                  className="input"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="input"
                />
              </label>

              {formError && <p className="text-sm text-danger">{formError}</p>}

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Update password <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>
          )}
        </div>
      </div>

      <BrandPanel variant="login" />

      <style jsx global>{`
        .input {
          height: 46px;
          width: 100%;
          border-radius: 14px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--surface));
          padding: 0 16px;
          font-size: 14px;
          color: hsl(var(--foreground));
          outline: none;
        }
        .input:focus {
          border-color: hsl(var(--accent) / 0.6);
        }
        .input::placeholder {
          color: hsl(var(--muted-foreground));
        }
      `}</style>
    </main>
  );
}
