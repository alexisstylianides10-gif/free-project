"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { LogoMark } from "@/components/shared/LogoMark";
import { BrandPanel } from "@/components/shared/BrandPanel";
import { branding } from "@/lib/branding";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

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
      // Plain insert, not upsert: PostgREST rejects upsert (ON CONFLICT DO
      // UPDATE) on profiles because its UPDATE grant is column-restricted
      // rather than table-wide, and this is always a brand-new row.
      const { error: profileError } = await supabase.from("profiles").insert({ id: data.user.id, full_name: name.trim() });
      if (profileError) {
        setError("Your account was created, but we couldn't set it up yet. Try logging in.");
        setLoading(false);
        return;
      }
      router.push("/choose-plan");
      return;
    }

    // Email confirmation required before a session exists — the profile row
    // and choose-plan/onboarding steps happen on first login instead.
    setNeedsConfirmation(true);
    setLoading(false);
  }

  if (needsConfirmation) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow-accent">
          <Mail className="h-6 w-6 text-white" />
        </span>
        <h1 className="mt-6 text-xl font-bold text-foreground">Check your email</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          We sent a confirmation link to <span className="text-foreground">{email}</span>. Confirm it, then log in to
          see your plan.
        </p>
        <Link href="/login" className="mt-8">
          <Button size="lg">Go to log in</Button>
        </Link>
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
