"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { useAlxioum } from "@/lib/store";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

export function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const authBusy = useAlxioum((s) => s.authBusy);
  const authError = useAlxioum((s) => s.authError);
  const signUp = useAlxioum((s) => s.signUp);
  const signIn = useAlxioum((s) => s.signIn);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (mode === "signup") signUp(email.trim(), password, name.trim() || email.split("@")[0]);
    else signIn(email.trim(), password);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-3" />
          <h1 className="text-[18px] font-semibold tracking-tight text-foreground">Alxioum</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {mode === "signup" ? "Create your account to get started." : "Welcome back."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
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
              {authBusy ? "One moment..." : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          {mode === "signup" && (
            <p className="mt-4 flex items-start gap-1.5 text-[12px] text-muted-foreground">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
              We&apos;ll populate your account with a realistic demo day so you can see Alxioum in action immediately — everything is yours to edit or clear.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
