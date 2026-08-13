"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { useAlxioum, backendConfigured } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const authBusy = useAlxioum((s) => s.authBusy);
  const authError = useAlxioum((s) => s.authError);
  const updatePassword = useAlxioum((s) => s.updatePassword);

  useEffect(() => {
    if (!backendConfigured || !supabase) return;
    // The recovery link's token is in the URL fragment; supabase-js parses
    // it automatically (detectSessionInUrl: true) and establishes a
    // temporary session we can use to set a new password.
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.trim().length < 6) return;
    const ok = await updatePassword(password.trim());
    if (ok) {
      setDone(true);
      setTimeout(() => router.replace("/app/today"), 1200);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-3" />
          <h1 className="text-[18px] font-semibold tracking-tight text-foreground">Set a new password</h1>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          {done ? (
            <p className="text-center text-[13.5px] text-foreground">Password updated — taking you to Alxioum…</p>
          ) : !ready ? (
            <p className="text-center text-[13px] text-muted-foreground">
              Open this page from the reset link in your email. If you just clicked it, one moment…
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                autoFocus
                className={inputClass}
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
              />
              {authError && <p className="text-[12.5px] text-danger">{authError}</p>}
              <Button type="submit" className="w-full" disabled={authBusy || password.trim().length < 6}>
                {authBusy ? "Saving…" : "Save new password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
