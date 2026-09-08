"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Mail, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { LogoMark } from "@/components/shared/LogoMark";
import { BrandPanel } from "@/components/shared/BrandPanel";
import { branding } from "@/lib/branding";

const RESEND_COOLDOWN_SECONDS = 45;

export function SignupClient() {
  const router = useRouter();
  const t = useTranslations("SignupPage");
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
  // Set once verifyOtp succeeds (a real session now exists). Distinguishes
  // "still entering the code" from "code was correct, but the follow-up
  // profile-creation insert failed" — the latter needs its own recovery UI,
  // not another attempt at a now-already-consumed code.
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);

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
      setError(t("profileSetupFailed"));
      return false;
    }
    router.push("/choose-plan");
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase || !isSupabaseConfigured) {
      setError(t("backendUnavailable"));
      return;
    }
    if (name.trim().length < 2) {
      setError(t("enterFirstName"));
      return;
    }
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
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
    // the 6-digit code we emailed them, or clicks the link in the same
    // email, which now routes through /auth/callback (same handler as
    // Google sign-in) so it lands straight in the app instead of dumping
    // them on /login requiring a manual re-submit.
    setNeedsConfirmation(true);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setLoading(false);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setVerifyError(null);
    setError(null);
    if (!supabase || !isSupabaseConfigured) {
      setVerifyError(t("verificationUnavailable"));
      return;
    }
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setVerifyError(t("enterCode"));
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
      setVerifyError(t("couldntVerifyCode"));
      setVerifyLoading(false);
      return;
    }
    // Code was correct — a real session now exists. From here on, any
    // failure is a profile-creation failure, not a code-verification one;
    // remember the user id so a retry doesn't need (and can't reuse) the
    // now-consumed code.
    setVerifiedUserId(data.user.id);
    await createProfileAndContinue(data.user.id, name.trim() || (data.user.email?.split("@")[0] ?? "Student"));
    setVerifyLoading(false);
  }

  // Retries just the profile-creation step using the session already
  // established by a successful verifyOtp — no code re-entry needed (and
  // re-submitting the same code would just fail as "already used").
  async function handleRetryProfile() {
    if (!verifiedUserId) return;
    setVerifyLoading(true);
    setError(null);
    await createProfileAndContinue(verifiedUserId, name.trim() || (email.split("@")[0] || "Student"));
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
    setResendMessage(t("newCodeSent"));
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  }

  if (needsConfirmation) {
    // The code was verified (a real session exists) but the follow-up
    // profile-creation insert failed. This is not a "wrong code" state —
    // re-entering/resubmitting the code would just fail as already-used —
    // so it gets its own recovery view instead of falling through silently.
    if (verifiedUserId && error) {
      return (
        <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/15">
            <AlertTriangle className="h-6 w-6 text-danger" />
          </span>
          <h1 className="mt-6 text-xl font-bold text-foreground">{t("almostThere")}</h1>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            {t.rich("setupProblem", { email: () => <span className="text-foreground">{email}</span> })}
          </p>
          <p className="mt-2 max-w-xs text-sm text-danger">{error}</p>

          <div className="mt-8 w-full max-w-xs space-y-3">
            <Button type="button" size="lg" className="w-full" onClick={handleRetryProfile} disabled={verifyLoading}>
              {verifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("tryAgain")}
            </Button>
            <Link href="/login">
              <Button type="button" size="lg" variant="secondary" className="w-full">
                {t("logInInstead")}
              </Button>
            </Link>
          </div>
        </main>
      );
    }

    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand">
          <Mail className="h-6 w-6 text-white" />
        </span>
        <h1 className="mt-6 text-xl font-bold text-foreground">{t("checkEmail")}</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          {t.rich("codeSentTo", { email: () => <span className="text-foreground">{email}</span> })}
        </p>
        <form onSubmit={handleVerifyCode} className="mt-8 w-full max-w-xs space-y-3.5">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="text-center text-lg tracking-[0.5em]"
            autoFocus
          />

          {(verifyError || error) && <p className="text-sm text-danger">{verifyError || error}</p>}
          {resendMessage && !verifyError && !error && <p className="text-sm text-success">{resendMessage}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={verifyLoading}>
            {verifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("confirmAccount")} <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0 || resendLoading}
          className="mt-4 text-sm font-semibold text-foreground underline underline-offset-4 disabled:pointer-events-none disabled:opacity-40"
        >
          {resendLoading ? t("sending") : resendCooldown > 0 ? t("resendCodeCooldown", { seconds: resendCooldown }) : t("resendCode")}
        </button>

        <p className="mt-6 text-xs text-muted-foreground">{t("preferLink")}</p>

      </main>
    );
  }

  return (
    <main className="flex min-h-dvh bg-background">
      <div className="flex flex-1 flex-col justify-center px-6 py-10 lg:px-16 xl:px-20">
        <div className="mx-auto w-full max-w-sm">
          <LogoMark size={44} className="mx-auto lg:mx-0" />
          <h1 className="mt-6 text-center text-2xl font-extrabold tracking-tight text-foreground lg:text-left">
            {t("title")}
          </h1>
          <p className="mt-1.5 text-center text-sm text-muted-foreground lg:text-left">{t("subtitle")}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-3.5">
            <Field label={t("firstName")}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex"
                autoComplete="given-name"
              />
            </Field>
            <Field label={t("email")}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </Field>
            <Field label={t("password")}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwordPlaceholder")}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("createAccount")} <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground lg:text-left">
            {t("alreadyHaveAccount")}{" "}
            <Link href="/login" className="font-semibold text-foreground underline underline-offset-4">
              {t("logIn")}
            </Link>
          </p>
          <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground lg:text-left">
            {t("agreeNotice", { name: branding.name })}
          </p>
        </div>
      </div>

      <BrandPanel variant="signup" />
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
