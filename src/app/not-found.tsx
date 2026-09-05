import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/shared/LogoMark";
import { Button } from "@/components/ui/Button";
import { branding } from "@/lib/branding";

/**
 * Custom 404, matching the app's existing full-screen branded-empty-state
 * pattern (`LoadingScreen`'s `bg-ambient-glow` + centered `LogoMark` shell)
 * rather than falling through to Next's bare default.
 */
export default function NotFound() {
  return (
    <main className="bg-ambient-glow relative flex min-h-dvh flex-col items-center justify-center bg-background px-8">
      <div className="relative z-10 flex w-full max-w-xs flex-col items-center text-center">
        <LogoMark size={56} className="rounded-2xl" />

        <p className="mt-8 text-display font-extrabold tracking-tight text-gradient-brand">404</p>

        <h1 className="mt-2 text-heading font-extrabold tracking-tight text-foreground">Page not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          We couldn&rsquo;t find what you were looking for. It may have moved, or the link might be off.
        </p>

        <Link href="/" className="mt-8">
          <Button size="lg">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Button>
        </Link>
      </div>

      <p className="absolute bottom-10 text-xs font-medium tracking-wide text-muted-foreground/60">{branding.name}</p>
    </main>
  );
}
