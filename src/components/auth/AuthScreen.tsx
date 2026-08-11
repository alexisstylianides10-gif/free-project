"use client";

import { useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { useAlxioum } from "@/lib/store";

export function AuthScreen() {
  const [name, setName] = useState("");

  const authBusy = useAlxioum((s) => s.authBusy);
  const authError = useAlxioum((s) => s.authError);
  const enterWithName = useAlxioum((s) => s.enterWithName);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || authBusy) return;
    enterWithName(name.trim());
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-3" />
          <h1 className="text-[18px] font-semibold tracking-tight text-foreground">Alxioum</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">What&apos;s your name?</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <form onSubmit={submit} className="space-y-3">
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />

            {authError && <p className="text-[12.5px] text-danger">{authError}</p>}

            <Button type="submit" className="w-full" disabled={authBusy || !name.trim()}>
              {authBusy ? "One moment..." : "Continue"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
