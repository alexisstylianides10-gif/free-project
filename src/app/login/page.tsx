"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { branding } from "@/lib/branding";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase || !isSupabaseConfigured) {
      setError("Log in isn't available right now — the backend isn't configured.");
      return;
    }
    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !data.user) {
      setError(signInError?.message ?? "Couldn't log you in.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed, billing_interval")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile) {
      // First login after email confirmation — no profile row yet. Plain
      // insert, not upsert: PostgREST rejects upsert (ON CONFLICT DO UPDATE)
      // on profiles because its UPDATE grant is column-restricted rather
      // than table-wide, and the row is confirmed absent by the select above.
      await supabase.from("profiles").insert({ id: data.user.id, full_name: data.user.email?.split("@")[0] ?? "Student" });
      router.push("/choose-plan");
      return;
    }

    if (!profile.onboarding_completed) {
      router.push(profile.billing_interval ? "/onboarding" : "/choose-plan");
      return;
    }

    router.push("/app");
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-background px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-base font-extrabold text-white shadow-glow-accent">
          {branding.markLetter}
        </span>
        <h1 className="mt-6 text-center text-2xl font-extrabold tracking-tight text-foreground">Welcome back</h1>
        <p className="mt-1.5 text-center text-sm text-muted-foreground">Log in to {branding.name} to see your plan.</p>

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
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              required
              className="input"
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Log in <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-foreground underline underline-offset-4">
            Sign up
          </Link>
        </p>
      </div>

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
