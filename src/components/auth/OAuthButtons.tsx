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

/** Google OAuth entry point, shared by signup and login. Calls
 * signInWithOAuth and lets Supabase redirect to the provider; the actual
 * session/profile handling happens on the way back at /auth/callback. */
export function OAuthButtons() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    if (!supabase || !isSupabaseConfigured) {
      setError("Sign-in isn't available right now — the backend isn't configured.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
    // On success the browser navigates away to Google's own consent
    // screen, so there's nothing further to render here.
  }

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-border bg-white text-sm font-semibold text-black transition-opacity disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <GoogleIcon /> Continue with Google
          </>
        )}
      </button>
      {error && <p className="text-center text-sm text-danger">{error}</p>}
    </div>
  );
}
