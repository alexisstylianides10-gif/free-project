"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { useAlxioum, backendConfigured } from "@/lib/store";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const authStatus = useAlxioum((s) => s.authStatus);
  const authBusy = useAlxioum((s) => s.authBusy);
  const authError = useAlxioum((s) => s.authError);
  const signUp = useAlxioum((s) => s.signUp);
  const signIn = useAlxioum((s) => s.signIn);
  const verifySignupCode = useAlxioum((s) => s.verifySignupCode);
  const resendSignupCode = useAlxioum((s) => s.resendSignupCode);
  const forgotPassword = useAlxioum((s) => s.forgotPassword);
  const initAuth = useAlxioum((s) => s.initAuth);

  useEffect(() => {
    if (backendConfigured) initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authStatus === "signed_in") {
      router.replace(params.get("next") || "/app/today");
    }
  }, [authStatus, params, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (mode === "signup") {
      const result = await signUp(email.trim(), password, name.trim() || email.split("@")[0]);
      if (result === "check_code") setStep("verify");
      else if (result === "already_registered") setMode("signin");
    } else {
      signIn(email.trim(), password);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    await verifySignupCode(email.trim(), code.trim());
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    const ok = await forgotPassword(email.trim());
    if (ok) setForgotSent(true);
  }

  if (step === "verify") {
    return (
      <AuthShell title="Check your email" subtitle={`Enter the 6-digit code we sent to ${email}.`}>
        <form onSubmit={submitCode} className="space-y-3">
          <input
            autoFocus
            className={`${inputClass} text-center text-lg tracking-[0.4em]`}
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          {authError && <p className="text-[12.5px] text-danger">{authError}</p>}
          <Button type="submit" className="w-full" disabled={authBusy || code.trim().length < 6}>
            {authBusy ? "Verifying…" : "Verify & continue"}
          </Button>
          <button
            type="button"
            onClick={() => resendSignupCode(email.trim())}
            disabled={authBusy}
            className="w-full text-center text-[12.5px] font-medium text-accent hover:underline"
          >
            Resend code
          </button>
          <button type="button" onClick={() => setStep("form")} className="w-full text-center text-[12px] text-muted-foreground hover:underline">
            Use a different email
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Alxioum" subtitle={mode === "signup" ? "Create your account." : "Welcome back."}>
      <div className="mb-5 flex rounded-lg bg-muted p-1">
        <button
          onClick={() => {
            setMode("signup");
            setForgotOpen(false);
          }}
          className={`flex-1 rounded-md py-1.5 text-[13px] font-medium transition-colors ${mode === "signup" ? "bg-surface text-foreground shadow-subtle" : "text-muted-foreground"}`}
        >
          Sign up
        </button>
        <button
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-md py-1.5 text-[13px] font-medium transition-colors ${mode === "signin" ? "bg-surface text-foreground shadow-subtle" : "text-muted-foreground"}`}
        >
          Sign in
        </button>
      </div>

      {forgotOpen ? (
        forgotSent ? (
          <div className="space-y-3 text-center">
            <p className="text-[13.5px] text-foreground">Check <strong>{email}</strong> for a password reset link.</p>
            <button onClick={() => { setForgotOpen(false); setForgotSent(false); }} className="text-[12.5px] font-medium text-accent hover:underline">
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={submitForgot} className="space-y-3">
            <input className={inputClass} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            {authError && <p className="text-[12.5px] text-danger">{authError}</p>}
            <Button type="submit" className="w-full" disabled={authBusy || !email.trim()}>
              {authBusy ? "Sending…" : "Send reset link"}
            </Button>
            <button type="button" onClick={() => setForgotOpen(false)} className="w-full text-center text-[12px] text-muted-foreground hover:underline">
              Cancel
            </button>
          </form>
        )
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && <input className={inputClass} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />}
          <input className={inputClass} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <input
            className={inputClass}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={6}
          />

          {authError && <p className="text-[12.5px] text-danger">{authError}</p>}

          <Button type="submit" className="w-full" disabled={authBusy}>
            {authBusy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
          </Button>

          {mode === "signin" && (
            <button type="button" onClick={() => { setForgotOpen(true); setForgotSent(false); }} className="w-full text-center text-[12.5px] font-medium text-accent hover:underline">
              Forgot password?
            </button>
          )}
        </form>
      )}

      {!forgotOpen && mode === "signup" && (
        <p className="mt-4 flex items-start gap-1.5 text-[12px] text-muted-foreground">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
          Your account starts empty — Alxioum only acts on what you actually add or tell it. We&apos;ll email you a 6-digit code to confirm it&apos;s you.
        </p>
      )}
    </AuthShell>
  );
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-3" />
          <h1 className="text-[18px] font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">{children}</div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
