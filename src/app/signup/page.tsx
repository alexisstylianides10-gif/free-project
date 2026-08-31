"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { LogoMark } from "@/components/shared/LogoMark";
import { BrandPanel } from "@/components/shared/BrandPanel";
import { branding } from "@/lib/branding";

const RESEND_COOLDOWN_SECONDS = 45;

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const [code, setCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Shared by both the immediate-session signup path and the post-code-verify
  // path: creates the profiles row (known-absent in both cases) and routes
  // to plan selection. Plain insert, not upsert: PostgREST rejects upsert
  // (ON CONFLICT DO UPDATE) on profiles because its UPDATE grant is
  // column-restricted rather than table-wide.
  async function createProfileAndContinue(userId: string, fullName: string): Promise<boolean> {
    if (!supabase) return false;
    const { error: profileError } = await supabase.from("profiles").insert({ id: userId, full_name: fullName });
    if (profileError) {
      setError("Your account was created, but we couldn't set it up yet. Try logging in.");
      return false;
    }
    router.push("/choose-plan");
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase || !isSupabaseConfigured) {
      setError("Sign up isn't available right now — the backend isn't configured.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Enter your first name.");
      return;
    }
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session && data.user) {
      await createProfileAndContinue(data.user.id, name.trim());
      setLoading(false);
      return;
    }

    // Email confirmation required before a session exists — the user enters
    // the 6-digit code we emailed them (or, as a fallback, clicks the link
    // in the same email, which lands on /login).
    setNeedsConfirmation(true);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setLoading(false);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setVerifyError(null);
    if (!supabase || !isSupabaseConfigured) {
      setVerifyError("Verification isn't available right now — the backend isn't configured.");
      return;
    }
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setVerifyError("Enter the 6-digit code from your email.");
      return;
    }
    setVerifyLoading(true);
    const { data, error: verifyErr } = await supabase.auth.verifyOtp({
      email,
      token: trimmed,
      type: "signup",
    });
    if (verifyErr) {
      // Surface Supabase's actual message — covers both an expired code
      // ("Token has expired or is invalid") and a wrong code.
      setVerifyError(verifyErr.message);
      setVerifyLoading(false);
      return;
    }
    if (!data.session || !data.user) {
      setVerifyError("Couldn't verify that code. Try again or request a new one.");
      setVerifyLoading(false);
      return;
    }
    await createProfileAndContinue(data.user.id, name.trim() || (data.user.email?.split("@")[0] ?? "Student"));
    setVerifyLoading(false);
  }

  async function handleResend() {
    setResendMessage(null);
    setVerifyError(null);
    if (!supabase || !isSupabaseConfigured || resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    const { error: resendErr } = await supabase.auth.resend({ type: "signup", email });
    setResendLoading(false);
    if (resendErr) {
      setVerifyError(resendErr.message);
      return;
    }
    setResendMessage("New code sent.");
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  }

  if (needsConfirmation) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow-accent">
          <Mail className="h-6 w-6 text-white" />
        </span>
        <h1 className="mt-6 text-xl font-bold text-foreground">Check your email</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          We sent a 6-digit code to <span className="text-foreground">{email}</span>. Enter it below to confirm your
          account.
        </p>

        <form onSubmit={handleVerifyCode} className="mt-8 w-full max-w-xs space-y-3.5">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="input text-center text-lg tracking-[0.5em]"
            autoFocus
          />

          {verifyError && <p className="text-sm text-danger">{verifyError}</p>}
          {resendMessage && !verifyError && <p className="text-sm text-success">{resendMessage}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={verifyLoading}>
            {verifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Confirm account <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0 || resendLoading}
          className="mt-4 text-sm font-semibold text-foreground underline underline-offset-4 disabled:pointer-events-none disabled:opacity-40"
        >
          {resendLoading
            ? "Sending…"
            : resendCooldown > 0
              ? `Resend code (${resendCooldown}s)`
              : "Resend code"}
        </button>

        <p className="mt-6 text-xs text-muted-foreground">
          Prefer the link instead?{" "}
          <Link href="/login" className="font-semibold text-foreground underline underline-offset-4">
            Log in
          </Link>{" "}
          after clicking it in the email.
        </p>

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

  return (
    <main className="flex min-h-dvh bg-background">
      <div className="flex flex-1 flex-col justify-center px-6 py-10 lg:px-16 xl:px-20">
        <div className="mx-auto w-full max-w-sm">
          <LogoMark size={44} className="mx-auto shadow-glow-accent lg:mx-0" />
          <h1 className="mt-6 text-center text-2xl font-extrabold tracking-tight text-foreground lg:text-left">
            Create your account
          </h1>
          <p className="mt-1.5 text-center text-sm text-muted-foreground lg:text-left">
            Create an account, then pick your plan and build your future.
          </p>

          <div className="mt-8">
            <OAuthButtons />
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">or continue with email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <Field label="First name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex"
                autoComplete="given-name"
                className="input"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="input"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
                className="input"
              />
            </Field>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create account <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground lg:text-left">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-foreground underline underline-offset-4">
              Log in
            </Link>
          </p>
          <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground lg:text-left">
            By continuing you agree that {branding.name} is a study and career-exploration tool, not a substitute for
            school or a guarantee of any outcome.
          </p>
        </div>
      </div>

      <BrandPanel variant="signup" />

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
