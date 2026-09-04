"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { branding } from "@/lib/branding";

const CONSENT_KEY = "alxioum_cookie_consent";

/**
 * A real, functional cookie-consent banner, not a decorative stub.
 *
 * Content note: as of Wave 3, this app has NO analytics or advertising
 * cookies wired up anywhere (no Google Analytics, no ad pixels, nothing) —
 * the only cookie in play is Supabase's own auth-session cookie, which is
 * strictly necessary for being logged in at all and isn't a choice a user
 * can opt out of and still use the app. The copy below says exactly that,
 * rather than generic "we use cookies to improve your experience and show
 * relevant ads" boilerplate that would imply tracking that doesn't exist.
 * If/when real analytics are added later, this copy (and the underlying
 * consent gate for whatever that new script is) needs to be revisited —
 * don't just leave this banner as-is once that's no longer true.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(CONSENT_KEY) !== "accepted") {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (privacy mode, blocked storage) — fail
      // silently and simply don't show the banner rather than throwing.
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(CONSENT_KEY, "accepted");
    } catch {
      // Storage blocked — banner still dismisses for this page view even
      // though the choice won't persist across a reload.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="animate-fade-in fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6" role="region" aria-label="Cookie notice">
      <div className="bg-surface border border-border mx-auto flex w-full max-w-2xl flex-col items-start gap-3 rounded-2xl border border-border p-4 shadow-pop sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <p className="flex-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {branding.name} only uses strictly necessary cookies, the ones that keep you signed in. We don&rsquo;t
          use analytics or advertising cookies today. See our{" "}
          <Link href="/privacy" className="font-semibold text-foreground underline underline-offset-4">
            Privacy Policy
          </Link>{" "}
          for details.
        </p>
        <Button size="sm" onClick={accept} className="w-full shrink-0 sm:w-auto">
          Accept
        </Button>
      </div>
    </div>
  );
}
