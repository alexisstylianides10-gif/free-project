import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/shared/LogoMark";
import { branding } from "@/lib/branding";

/**
 * Minimal shell for standalone, unauthenticated content pages reached from
 * the landing page footer (Privacy, Terms, FAQ). Real legal/FAQ copy is a
 * later-wave CEO-provided content task (see PROJECT_STATE.md) — this shell
 * exists now so the footer links resolve to a real, on-brand page instead of
 * a 404 while that copy is pending.
 */
export function StaticContentPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col px-6 py-12 md:px-10 md:py-16">
        <Link href="/" className="flex w-fit items-center gap-2">
          <LogoMark size={32} className="shadow-glow-accent" />
          <span className="text-sm font-semibold tracking-wide text-muted-foreground">{branding.name}</span>
        </Link>

        <h1 className="mt-10 text-heading font-extrabold tracking-tight text-foreground">{title}</h1>

        <div className="mt-4 space-y-4 text-body leading-relaxed text-muted-foreground">{children}</div>

        <Link
          href="/"
          className="mt-10 flex w-fit items-center gap-1.5 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </main>
  );
}
