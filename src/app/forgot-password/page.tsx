"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ArrowRight, ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { LogoMark } from "@/components/shared/LogoMark";
import { BrandPanel } from "@/components/shared/BrandPanel";
import { branding } from "@/lib/branding";

/**
 * Entry point for self-service password recovery — reachable from the
 * "Forgot password?" link next to the password field on /login. Always
 * shows the same generic success copy regardless of whether the email
 * actually matches an account: `resetPasswordForEmail` itself doesn't leak
 * that (Supabase returns success either way), but even so, deliberately not
 * branching UI copy on the response shape either, so there's no way for
 * this screen's behavior to ever reveal account existence — standard
 * practice, and consistent with how carefully this codebase already treats
 * auth (see AuthProvider.tsx's own staleness-guard comments).
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase || !isSupabaseConfigured) {
      setError("Password reset isn't available right now. The backend isn't configured.");
      return;
    }
    setLoading(true);
    // Intentionally ignore the response's error field for anything that
    // would leak whether this email has an account (e.g. "user not found"
    // equivalents) — only a genuinely broken request (backend unreachable,
    // rate limited) is worth surfacing differently, and Supabase's own
    // resetPasswordForEmail already returns success uniformly for
    // known/unknown emails, so in practice this is a straight pass-through.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <main className="flex min-h-dvh bg-background">
      <div className="flex flex-1 flex-col justify-center px-6 py-10 lg:px-16 xl:px-20">
        <div className="mx-auto w-full max-w-sm">
          <LogoMark size={44} className="mx-auto shadow-glow-accent lg:mx-0" />

          {sent ? (
            <>
              <span className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow-accent lg:mx-0">
                <MailCheck className="h-6 w-6 text-white" />
              </span>
              <h1 className="mt-6 text-center text-2xl font-extrabold tracking-tight text-foreground lg:text-left">
                Check your email
              </h1>
              <p className="mt-1.5 text-center text-sm text-muted-foreground lg:text-left">
                If an account exists for <span className="text-foreground">{email}</span>, we sent a link to reset
                your password. It expires after a while, so use it soon.
              </p>
              <p className="mt-1.5 text-center text-xs text-muted-foreground lg:text-left">
                The email will arrive from Supabase (our account infrastructure provider), not {branding.name}
                directly. That&rsquo;s expected. Check spam if you don&rsquo;t see it within a minute.
              </p>
              <Link
                href="/login"
                className="mt-8 flex items-center justify-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-4 lg:justify-start"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to log in
              </Link>
            </>
          ) : (
            <>
              <h1 className="mt-6 text-center text-2xl font-extrabold tracking-tight text-foreground lg:text-left">
                Forgot your password?
              </h1>
              <p className="mt-1.5 text-center text-sm text-muted-foreground lg:text-left">
                Enter the email on your {branding.name} account and we&rsquo;ll send you a link to reset it.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-3.5">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    autoFocus
                    className="input"
                  />
                </label>

                {error && <p className="text-sm text-danger">{error}</p>}

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send reset link <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground lg:text-left">
                Remembered it?{" "}
                <Link href="/login" className="font-semibold text-foreground underline underline-offset-4">
                  Log in
                </Link>
              </p>
            </>
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
