"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { LogoMark } from "@/components/shared/LogoMark";
import { Button } from "@/components/ui/Button";
import { branding } from "@/lib/branding";

/**
 * Custom root error boundary (Next.js App Router convention: must be a
 * client component receiving `error`/`reset`). Deliberately never renders
 * `error.message` or any stack detail to the user — that's an internal
 * detail that can leak implementation info and usually isn't actionable for
 * them anyway. It's logged to the console (visible in dev tools / any
 * client-error monitoring wired up later) but the on-screen copy stays
 * generic and friendly, matching the rest of the app's tone.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled app error:", error);
  }, [error]);

  return (
    <main className="bg-ambient-glow relative flex min-h-dvh flex-col items-center justify-center bg-background px-8">
      <div className="relative z-10 flex w-full max-w-xs flex-col items-center text-center">
        <LogoMark size={56} className="rounded-2xl shadow-glow-accent" />

        <h1 className="mt-8 text-heading font-extrabold tracking-tight text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          That&rsquo;s on us. Try again, and if it keeps happening, head back to your dashboard and pick up where
          you left off.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Button size="lg" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
          <Link href="/" className="text-sm font-semibold text-foreground underline underline-offset-4">
            Back to home
          </Link>
        </div>
      </div>

      <p className="absolute bottom-10 text-xs font-medium tracking-wide text-muted-foreground/60">{branding.name}</p>
    </main>
  );
}
