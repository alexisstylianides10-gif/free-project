"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

type Status = "idle" | "loading" | "success" | "error";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!isValidEmail(value)) {
      setError("Enter a valid email address.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError("");

    if (!isSupabaseConfigured || !supabase) {
      // No backend wired up yet — this is expected in preview builds.
      await new Promise((r) => setTimeout(r, 400));
      setStatus("success");
      return;
    }

    const { error: insertError } = await supabase.from("waitlist").insert({ email: value });

    if (insertError && insertError.code !== "23505") {
      setError("Something went wrong. Try again in a moment.");
      setStatus("error");
      return;
    }

    setStatus("success");
  }

  if (status === "success") {
    return (
      <div className="flex items-center justify-center gap-2.5 rounded-xl border border-sage/25 bg-sage/10 px-5 py-4 text-[14.5px] font-medium text-sage">
        <Check className="h-4 w-4" />
        You&apos;re on the list. We&apos;ll be in touch.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          id="waitlist-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="Enter your email"
          className="flex-1 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-[15px] text-paper placeholder:text-paper/35 outline-none transition-colors focus:border-brand-400/60 focus:bg-white/[0.06]"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-[14.5px] font-semibold text-ink-950 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
        >
          {status === "loading" ? "Joining..." : "Join the Waitlist"}
          {status !== "loading" && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
      {status === "error" && error && <p className="mt-2.5 text-[13px] text-terracotta">{error}</p>}
    </form>
  );
}
