"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
      <path fill="#4285F4" d="M23.49 12.27c0-.82-.07-1.42-.22-2.04H12v3.93h6.5c-.13 1.06-.84 2.66-2.42 3.73l-.02.15 3.52 2.7.24.02c2.24-2.06 3.53-5.1 3.53-8.49z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.06 7.93-2.9l-3.78-2.92c-1.02.71-2.4 1.2-4.15 1.2-3.18 0-5.87-2.09-6.84-4.97l-.14.01-3.68 2.83-.05.13C3.36 21.3 7.36 24 12 24z" />
      <path fill="#FBBC05" d="M5.16 14.41A7.2 7.2 0 0 1 4.75 12c0-.84.15-1.65.4-2.41l-.01-.16-3.73-2.9-.12.06A12 12 0 0 0 0 12c0 1.93.46 3.76 1.28 5.38l3.88-2.97z" />
      <path fill="#EA4335" d="M12 4.75c2.25 0 3.77.97 4.64 1.78l3.39-3.3C17.94 1.19 15.24 0 12 0 7.36 0 3.36 2.7 1.28 6.62l3.87 3c.98-2.88 3.66-4.87 6.85-4.87z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current" aria-hidden>
      <path d="M16.365 1.43c0 1.14-.468 2.2-1.24 3.02-.83.9-2.18 1.6-3.3 1.51-.14-1.1.42-2.24 1.2-3.02.85-.86 2.28-1.51 3.34-1.51zm4.47 16.6c-.4.94-.6 1.36-1.13 2.19-.74 1.16-1.78 2.6-3.07 2.61-1.15.02-1.45-.75-3-.74-1.56.01-1.9.75-3.05.73-1.29-.02-2.28-1.32-3.02-2.48-2.07-3.2-2.29-6.96-1-8.97.9-1.4 2.32-2.22 3.66-2.22 1.36 0 2.22.75 3.35.75 1.09 0 1.76-.75 3.34-.75 1.19 0 2.45.65 3.35 1.77-2.95 1.62-2.47 5.83.57 7.11z" />
    </svg>
  );
}

/** Google/Apple OAuth entry points, shared by signup and login. Both call
 * signInWithOAuth and let Supabase redirect to the provider; the actual
 * session/profile handling happens on the way back at /auth/callback. */
export function OAuthButtons() {
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOAuth(provider: "google" | "apple") {
    if (!supabase || !isSupabaseConfigured) {
      setError("Sign-in isn't available right now — the backend isn't configured.");
      return;
    }
    setError(null);
    setLoading(provider);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(null);
    }
    // On success the browser navigates away to the provider's own consent
    // screen, so there's nothing further to render here.
  }

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={() => handleOAuth("google")}
        disabled={loading !== null}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-border bg-white text-[14px] font-semibold text-black transition-opacity disabled:opacity-60"
      >
        {loading === "google" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <GoogleIcon /> Continue with Google
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => handleOAuth("apple")}
        disabled={loading !== null}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-full bg-black text-[14px] font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {loading === "apple" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <AppleIcon /> Continue with Apple
          </>
        )}
      </button>
      {error && <p className="text-center text-sm text-danger">{error}</p>}
    </div>
  );
}
