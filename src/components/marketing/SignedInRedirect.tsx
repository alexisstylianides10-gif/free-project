"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { backendConfigured } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";

/**
 * Reopening the installed PWA (or just revisiting alxioum.app while already
 * signed in) should land you in the app, not back on the marketing pitch.
 * Runs only on the root landing page — a signed-in visitor browsing
 * /pricing or /privacy on purpose isn't bounced away from it.
 */
export function SignedInRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (!backendConfigured || !supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/app/today");
    });
  }, [router]);

  return null;
}
