"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
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
  const signInWithGoogle = useAlxioum((s) => s.signInWithGoogle);
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

      {!forgotOpen && (
        <>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="mb-4 flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-surface px-4 py-2.5 text-[13.5px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11.5px] text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

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

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.6 34.8 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5C41.9 35.4 44 30.1 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-3" />
          <h1 className="text-[18px] font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">{children}</div>
      </motion.div>
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
