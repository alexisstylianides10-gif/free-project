"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "@/components/shared/LogoMark";
import { branding } from "@/lib/branding";

/**
 * Full-screen branded loading state — used for every "the app itself isn't
 * ready yet" moment (auth resolving, onboarding recovery, a page waiting on
 * several data sources). The percentage is a deliberately fake, ease-out
 * climb (never claims 100 until the caller unmounts it) rather than a
 * literal progress measurement — there's usually nothing granular to
 * measure, but a static spinner reads as stuck. This gives the same "it's
 * working" reassurance as a real progress bar without lying about it.
 */
export function LoadingScreen({
  message = "Getting things ready…",
  fullScreen = true,
}: {
  message?: string;
  fullScreen?: boolean;
}) {
  const [percent, setPercent] = useState(8);

  useEffect(() => {
    const interval = setInterval(() => {
      setPercent((p) => {
        if (p >= 92) return p;
        const step = Math.max(0.4, (92 - p) * 0.06);
        return Math.min(92, p + step);
      });
    }, 90);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={
        fullScreen
          ? "bg-ambient-glow relative flex min-h-dvh flex-col items-center justify-center bg-background px-8"
          : "flex flex-col items-center justify-center px-8 py-20"
      }
    >
      <div className="relative z-10 flex w-full max-w-xs flex-col items-center">
        <LogoMark size={56} className="rounded-2xl animate-pulse-glow" />

        <p className="mt-8 text-3xl font-bold tabular-nums tracking-tight text-foreground">{Math.round(percent)}%</p>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-brand transition-[width] duration-150 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="mt-5 text-sm text-muted-foreground">{message}</p>
      </div>

      {fullScreen && <p className="absolute bottom-10 text-xs font-medium tracking-wide text-muted-foreground/60">{branding.name}</p>}
    </div>
  );
}
