"use client";

import { useEffect, useState } from "react";
import { Share, MoreVertical, Smartphone, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { branding } from "@/lib/branding";

const DISMISSED_KEY = "alxioum:install-prompt-dismissed";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function isAlreadyInstalled(): boolean {
  if (typeof window === "undefined") return false;
  // Standard PWA check (Android/desktop Chrome) plus iOS Safari's own flag —
  // neither is available everywhere, so this is best-effort, not exhaustive.
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return !!standalone || !!iosStandalone;
}

/**
 * A small, dismissible card teaching a mobile visitor how to add Alxioum to
 * their home screen. The PWA plumbing (manifest, service worker, apple-
 * web-app meta) already works — this is purely the missing in-app UI, not a
 * blocking modal. Desktop-hidden (lg:hidden) since "add to home screen" is a
 * mobile-only concept, matching the app's existing lg: responsive
 * convention. Instructions differ by platform since neither iOS Safari nor
 * Android Chrome exposes install the same way, so this branches on a simple
 * user-agent check — good enough for the common cases, not bulletproof.
 */
export function InstallAppCard() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => {
    if (isAlreadyInstalled()) return;
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      // localStorage can throw (private browsing, disabled storage) — treat
      // as not-dismissed rather than crash.
    }
    if (dismissed) return;
    setPlatform(detectPlatform());
    setVisible(true);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Nothing to do if storage is unavailable — it'll just show again
      // next visit, which is an acceptable fallback, not a broken feature.
    }
  }

  if (!visible || platform === "other") return null;

  return (
    <Card className="border-accent/30 lg:hidden">
      <CardContent className="flex items-start gap-3 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Smartphone className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Get the {branding.name} app</p>
          {platform === "ios" ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Tap <Share className="inline h-3 w-3 -translate-y-px" aria-hidden /> Share in Safari, then choose{" "}
              <span className="font-medium text-foreground">&ldquo;Add to Home Screen.&rdquo;</span>
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Tap <MoreVertical className="inline h-3 w-3 -translate-y-px" aria-hidden /> the menu in Chrome, then choose{" "}
              <span className="font-medium text-foreground">&ldquo;Install app&rdquo;</span> (or &ldquo;Add to Home screen&rdquo;).
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </CardContent>
    </Card>
  );
}
