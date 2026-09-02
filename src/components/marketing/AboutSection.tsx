import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { branding } from "@/lib/branding";
import { cn } from "@/lib/utils";

// Extracted verbatim from about/page.tsx's body so the exact same JSX/copy
// renders on both the standalone /about route and inline on / — see
// PRODUCT_SPECS_SCROLL_LANDING.md §2, §7.

/**
 * `sectionBreak` (default `false`) — opts this section into the inline-on-/
 * treatment: a top `border-t border-border` plus a full-bleed `bg-surface`
 * band (About has no card grid/glow of its own, so a flat background shift
 * is the cleanest way to read it as its own zone). Standalone `/about`
 * renders with it omitted so it stays pixel-identical to the QA-signed-off
 * `ba9001d` version. Inner content stays the existing narrow `max-w-2xl`
 * centered column regardless — a deliberate width contrast against the
 * `max-w-6xl` grid sections around it when inline on `/`.
 */
export function AboutSection({ sectionBreak = false }: { sectionBreak?: boolean }) {
  return (
    <section id="about" className={cn("scroll-mt-20", sectionBreak && "border-t border-border bg-surface")}>
      <div className="mx-auto flex w-full max-w-2xl flex-col px-6 py-12 md:px-10 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">About</p>
        <h1 className="mt-2 text-heading font-extrabold tracking-tight text-foreground">
          Built for the two groups everyone else designs around.
        </h1>

        <div className="mt-4 space-y-4 text-body leading-relaxed text-muted-foreground">
          <p>
            Most productivity apps are built for people who already have their life figured out: a stable job, a
            clear five-year plan, deadlines set by someone else. {branding.name} is built for two groups who
            don&rsquo;t have that yet &mdash; students still building their transcript and their sense of what&rsquo;s
            next, and early founders still building a business with no one telling them what to do next either.
          </p>

          <h2 className="!mt-8 text-body font-bold text-foreground">Why one app, two tracks</h2>
          <p>
            We didn&rsquo;t want a generic to-do list with a school skin and a business skin bolted on. So{" "}
            {branding.name} asks you, once, at signup: are you building a transcript or a business? Whichever you
            pick locks in and the entire app &mdash; your Home, your daily plan, your AI Coach&rsquo;s context, your
            long-term roadmap &mdash; is built around that answer from day one. No mode-switching, no half-built
            middle ground. (The founder track is currently paused for new signups while we finish polishing it
            &mdash; see our{" "}
            <Link href="/faq" className="font-semibold text-foreground underline underline-offset-4">
              FAQ
            </Link>{" "}
            for details.)
          </p>

          <h2 className="!mt-8 text-body font-bold text-foreground">What we actually believe</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-semibold text-foreground">No tracking, no ads.</strong> {branding.name}{" "}
              doesn&rsquo;t run behavioral-advertising tracking or third-party ad pixels. The only cookie in play is
              the one that keeps you signed in. See our{" "}
              <Link href="/privacy" className="font-semibold text-foreground underline underline-offset-4">
                Privacy Policy
              </Link>{" "}
              for the specifics.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Honesty over gamification.</strong> Some parts of
              your roadmap you can only advance by telling us you actually did the real-world thing &mdash; we
              can&rsquo;t verify you launched a project or shipped a business milestone, so we don&rsquo;t pretend
              to. You mark it done because you did it, not because the app tricked you into a streak.
            </li>
            <li>
              <strong className="font-semibold text-foreground">This is a planning tool, not a promise.</strong>{" "}
              {branding.name} helps you organize your school work or your business and explore your options with AI
              support &mdash; it doesn&rsquo;t guarantee your grades, a job, or a business outcome. Any AI-generated
              content (study plans, quizzes, business drafts) is a starting point, not a substitute for your
              teacher, your own judgment, or a qualified professional.
            </li>
          </ul>

          <h2 className="!mt-8 text-body font-bold text-foreground">Who&rsquo;s behind it</h2>
          <p>
            {branding.name} is built by [COMPANY NAME]. [FOUNDING STORY / TEAM PLACEHOLDER &mdash; add real detail
            here once there&rsquo;s a public-facing story to tell; nothing in this codebase currently establishes a
            founding date, team size, or company history, so nothing is invented here].
          </p>
          <p>Questions? Reach us at [CONTACT EMAIL] &mdash; same address as our Privacy Policy and Terms of Service.</p>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/signup">
            <Button size="lg" className="w-full sm:w-auto">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/#features">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              See what it does
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
