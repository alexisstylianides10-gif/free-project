import Link from "next/link";
import {
  ArrowRight,
  Brain,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  Compass,
  Flame,
  Layers,
  MapPin,
  Receipt,
  Sparkles,
  Target,
  TrendingUp,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// Extracted verbatim from features/page.tsx's body (eyebrow through closing
// CTA) so the exact same JSX/copy renders on both the standalone /features
// route and inline on / — see PRODUCT_SPECS_SCROLL_LANDING.md §2, §7.

type FeatureCard = { icon: LucideIcon; title: string; description: string };

const STUDENT_FEATURES: FeatureCard[] = [
  {
    icon: CalendarClock,
    title: "Timetable",
    description: "Add your classes once and see today's schedule every morning, room numbers included.",
  },
  {
    icon: ClipboardCheck,
    title: "Homework tracking",
    description: "Every assignment with a real due-date countdown, so nothing quietly goes overdue.",
  },
  {
    icon: Target,
    title: "Exams & readiness",
    description:
      "A live countdown per exam, plus an honest readiness % built from how you're actually doing on that subject's topics.",
  },
  {
    icon: BookOpen,
    title: "Weekly study plan",
    description: "A real Monday-Friday plan, session by session, that you check off as you go.",
  },
  {
    icon: Sparkles,
    title: "AI study plans",
    description: "Generate a study plan for a specific subject or topic instead of guessing where to start.",
  },
  {
    icon: Layers,
    title: "Flashcards",
    description: "Spaced-repetition flashcards that resurface exactly when you're about to forget them, not on a random schedule.",
  },
  {
    icon: Brain,
    title: "AI-generated quizzes",
    description: "Pick a subject, a difficulty (Easy through Exam Level), and a question count — get a real quiz, not a static bank.",
  },
  {
    icon: TriangleAlert,
    title: "Weak topics",
    description: "The topics you're actually struggling with, surfaced plainly with your real attempt history — no vague advice.",
  },
  {
    icon: Compass,
    title: "Career matches",
    description: "Career suggestions matched to the subjects, interests, and strengths you gave at onboarding, each with a real % match.",
  },
  {
    icon: MapPin,
    title: "Future Map (roadmap)",
    description:
      "A 6-level Discover → Learn → Build → Launch → Grow roadmap. The first steps advance automatically from what you actually do in the app; later ones you mark done yourself, honestly.",
  },
  {
    icon: TrendingUp,
    title: "Weekly review",
    description: "A real weekly recap: study time, quiz accuracy, topics mastered, and how your week actually went.",
  },
  {
    icon: Flame,
    title: "XP, streaks & achievements",
    description: "Real actions earn real XP and unlock achievements — no filler gamification.",
  },
];

const BUSINESS_FEATURES: FeatureCard[] = [
  {
    icon: Target,
    title: "Milestone tracking",
    description: "Your idea, its stage (Idea → Validating → Building → Launched), and a milestone checklist you actually complete.",
  },
  {
    icon: Sparkles,
    title: "AI business snapshot",
    description: "A short AI-written snapshot of your idea, generated from what you tell it at onboarding.",
  },
  {
    icon: TrendingUp,
    title: "Metrics log",
    description: "Log revenue, customers, or signups over time and see the trend versus your last entry.",
  },
  {
    icon: Receipt,
    title: "Expense tracking",
    description: "Log spend by category (software, marketing, contractors, and more) and see your running total.",
  },
  {
    icon: Sparkles,
    title: "AI content helper",
    description: "Generate a first draft of Instagram, blog, or email content for a topic you give it.",
  },
  {
    icon: Users,
    title: "Competitor tracker",
    description: "Keep a running list of who else is in your market, with notes.",
  },
];

function FeatureGrid({ items }: { items: FeatureCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.title}>
            <CardContent className="p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-body font-bold text-foreground">{item.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/**
 * `withSectionBreak` (default `false`) opts this section into the top
 * divider used when it's rendered inline on the scrolling `/` page — a plain
 * `border-t border-border`. Standalone `/features` renders with the prop
 * omitted so it stays pixel-identical to the QA-signed-off `ba9001d` version
 * (PRODUCT_SPECS_SCROLL_LANDING.md §2). This is an opt-in prop, not a
 * pathname check, so the component can't silently diverge if rendered
 * somewhere new later.
 *
 * The section also owns its own local `relative overflow-hidden` wrapping
 * (rather than relying on a shared ancestor `<main>`) so its `bg-ambient-glow`
 * band is scoped to this section wherever it's mounted — required so the glow
 * appears at Features' own position when scrolled to on `/`, not pinned to
 * the top of the whole homepage behind the Hero.
 */
export function FeaturesSection({ withSectionBreak = false }: { withSectionBreak?: boolean }) {
  return (
    <section
      id="features"
      className={cn("relative scroll-mt-20 overflow-hidden", withSectionBreak && "border-t border-border")}
    >
      <div className="bg-ambient-glow pointer-events-none absolute inset-x-0 top-0 h-72" aria-hidden />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-14 md:px-10 lg:px-16">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Features</p>
        <h1 className="mt-2 max-w-2xl text-display font-extrabold leading-[1.15] tracking-tight text-foreground">
          One plan. Built around what you&rsquo;re actually doing.
        </h1>
        <p className="mt-4 max-w-2xl text-body leading-relaxed text-muted-foreground">
          Alxioum tracks the real details of school or your business, then turns them into a daily plan, an AI Coach
          that knows your context, and a long-term roadmap you can watch move. Two tracks, one app &mdash; you pick
          yours once, at signup, and everything below is built around it.
        </p>

        <section className="mt-14">
          <h2 className="text-heading font-extrabold tracking-tight text-foreground">Student track</h2>
          <p className="mt-1 text-sm text-muted-foreground">Live today.</p>
          <div className="mt-6">
            <FeatureGrid items={STUDENT_FEATURES} />
          </div>
        </section>

        <section className="mt-16">
          <Card className="border-accent/30">
            <CardContent className="p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">AI Coach</p>
              <h3 className="mt-2 text-heading font-extrabold tracking-tight text-foreground">
                A coach that actually knows what&rsquo;s on your plate
              </h3>
              <p className="mt-3 max-w-2xl text-body leading-relaxed text-muted-foreground">
                Ask about a subject, your career options, or what to do today, and the Coach answers using your real
                homework, exams, and career match &mdash; not generic advice. Keeps full conversation history across
                as many threads as you want, and (for students) always keeps school first.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-16">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-heading font-extrabold tracking-tight text-foreground">For founders</h2>
            <Badge tone="neutral">Coming soon</Badge>
          </div>
          <h3 className="mt-3 max-w-2xl text-body font-semibold text-foreground">
            Everything above, rebuilt for a business instead of a transcript
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The founder track is currently paused for new signups while we polish it. Here&rsquo;s what it already
            builds:
          </p>
          <div className="mt-6">
            <FeatureGrid items={BUSINESS_FEATURES} />
          </div>
        </section>

        <section className="mt-20 rounded-3xl border border-border bg-surface px-6 py-10 text-center md:px-12 md:py-14">
          <h2 className="text-heading font-extrabold tracking-tight text-foreground">
            Pick your track. We&rsquo;ll build around it.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Alxioum is a planning and study tool that helps you stay organized and explore your options &mdash;
            it&rsquo;s not a guarantee of grades, a job, or a business outcome.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup">
              <Button size="lg">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/#pricing">
              <Button size="lg" variant="outline">
                See pricing
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}
