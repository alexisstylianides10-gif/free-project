"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { useTriply } from "@/lib/store";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

export function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const authBusy = useTriply((s) => s.authBusy);
  const authError = useTriply((s) => s.authError);
  const authInfo = useTriply((s) => s.authInfo);
  const signUp = useTriply((s) => s.signUp);
  const signIn = useTriply((s) => s.signIn);
  const signInWithProvider = useTriply((s) => s.signInWithProvider);
  const resetPassword = useTriply((s) => s.resetPassword);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "reset") {
      if (!email.trim()) return;
      resetPassword(email.trim());
      return;
    }
    if (!email.trim() || !password.trim()) return;
    if (mode === "signup") signUp(email.trim(), password, name.trim() || email.split("@")[0]);
    else signIn(email.trim(), password);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-3" />
          <h1 className="text-[18px] font-semibold tracking-tight text-foreground">Triply</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {mode === "signup" ? "Your group's entire trip, organized in one place." : mode === "reset" ? "Reset your password." : "Welcome back."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          {mode !== "reset" && (
            <div className="mb-5 flex rounded-lg bg-muted p-1">
              <button
                onClick={() => setMode("signup")}
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
          )}

          {mode !== "reset" && (
            <div className="mb-4 space-y-2">
              <Button variant="outline" className="w-full justify-center gap-2" onClick={() => signInWithProvider("apple")}>
                <AppleMark /> Continue with Apple
              </Button>
              <Button variant="outline" className="w-full justify-center gap-2" onClick={() => signInWithProvider("google")}>
                <GoogleMark /> Continue with Google
              </Button>
              <div className="flex items-center gap-3 pt-1">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11.5px] text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <input className={inputClass} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <input
              className={inputClass}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            {mode !== "reset" && (
              <input
                className={inputClass}
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={6}
              />
            )}

            {authError && <p className="text-[12.5px] text-danger">{authError}</p>}
            {authInfo && <p className="text-[12.5px] text-success">{authInfo}</p>}

            <Button type="submit" className="w-full" disabled={authBusy}>
              {authBusy ? "One moment..." : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}
            </Button>
          </form>

          {mode === "signin" && (
            <button onClick={() => setMode("reset")} className="mt-3 w-full text-center text-[12.5px] font-medium text-accent hover:opacity-80">
              Forgot password?
            </button>
          )}
          {mode === "reset" && (
            <button onClick={() => setMode("signin")} className="mt-3 w-full text-center text-[12.5px] font-medium text-accent hover:opacity-80">
              Back to sign in
            </button>
          )}

          {mode === "signup" && (
            <p className="mt-4 flex items-start gap-1.5 text-[12px] text-muted-foreground">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
              We&apos;ll populate your account with a sample trip so you can see Triply in action immediately — everything is yours to edit or clear.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AppleMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.365 1.43c0 1.14-.462 2.13-1.15 2.87-.74.8-1.94 1.42-3.08 1.33-.13-1.1.44-2.24 1.13-2.96.75-.8 2.03-1.4 3.1-1.24Zm2.9 17.15c-.4.93-.88 1.83-1.5 2.68-.86 1.16-1.75 2.32-3.15 2.34-1.35.03-1.79-.8-3.33-.8-1.55 0-2.03.78-3.31.83-1.35.05-2.38-1.25-3.25-2.4-1.78-2.35-3.14-6.65-1.31-9.55.9-1.44 2.52-2.36 4.27-2.38 1.33-.03 2.58.9 3.39.9.8 0 2.32-1.11 3.91-.95.67.03 2.55.27 3.76 2.03-.1.06-2.24 1.31-2.22 3.9.03 3.1 2.72 4.13 2.75 4.14-.02.08-.42 1.5-1.01 2.86Z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.85Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.85C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}
