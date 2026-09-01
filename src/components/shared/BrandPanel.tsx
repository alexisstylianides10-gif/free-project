import { cn } from "@/lib/utils";

type Variant = "landing" | "login" | "signup" | "onboarding-student" | "onboarding-business";

const COPY: Record<Variant, { quote: string; cardEyebrow: string; cardTitle: string; cardBody: string }> = {
  landing: {
    quote: "Every subject, every deadline, every next step: one plan that actually knows what you're working toward.",
    cardEyebrow: "TODAY'S MISSION",
    cardTitle: "Explore 3 real job postings",
    cardBody: "+45 XP · 15 min",
  },
  login: {
    quote: "Pick up exactly where you left off: your plan, your streak, your Future Map.",
    cardEyebrow: "WELCOME BACK",
    cardTitle: "6 day streak",
    cardBody: "Your plan for today is already built.",
  },
  signup: {
    quote: "Two tracks, one app. Whichever you're building, a transcript or a business, Alxioum locks in and builds around it.",
    cardEyebrow: "CHOOSE YOUR TRACK",
    cardTitle: "Student or Founder",
    cardBody: "Locked in at signup, built around from day one.",
  },
  "onboarding-student": {
    quote: "Every question builds toward your Future Map: real career directions, matched to how you actually think.",
    cardEyebrow: "PREVIEW",
    cardTitle: "Software Engineer · 82% match",
    cardBody: "Based on the subjects, interests and strengths you're about to tell us.",
  },
  "onboarding-business": {
    quote: "We turn your answers into a starter milestone checklist: not generic advice, but an actual plan for this idea.",
    cardEyebrow: "PREVIEW",
    cardTitle: "Launch landing page",
    cardBody: "Milestone 1 of your starter checklist, built from what you tell us next.",
  },
};

/** Desktop-only (`lg:` and up) visual anchor for the pre-app screens — landing,
 * login, signup, onboarding. Replaces what used to be a narrow mobile-width
 * column dead-centered in a huge empty desktop canvas: every one of those
 * screens now gets a real, purposeful right-hand panel instead of the brand
 * gradient only ever touching one word and one button. Content is
 * illustrative (no live user data exists pre-auth), not real — labelled
 * "PREVIEW" on the two onboarding variants for that reason. Hidden below
 * `lg` entirely; mobile composition is unaffected by this component. */
export function BrandPanel({ variant, className }: { variant: Variant; className?: string }) {
  const c = COPY[variant];
  return (
    <div
      className={cn(
        "relative hidden overflow-hidden bg-gradient-brand lg:flex lg:w-[40%] lg:shrink-0 lg:flex-col lg:justify-between lg:p-12 xl:w-[36%] xl:p-14",
        className
      )}
      aria-hidden
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-14 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

      <p className="relative z-10 text-title-lg font-extrabold leading-[1.25] text-white text-balance">{c.quote}</p>

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center gap-5 rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
          <MiniRing pct={64} />
          <MiniRing pct={37} />
          <div className="ml-auto text-right">
            <p className="text-lg font-bold text-white">🔥 6</p>
            <p className="text-2xs font-semibold uppercase tracking-wide text-white/70">day streak</p>
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-mission p-5 text-white shadow-glow-mission">
          <p className="text-2xs font-bold uppercase tracking-wide text-white/80">{c.cardEyebrow}</p>
          <p className="mt-2 text-body font-bold leading-snug">{c.cardTitle}</p>
          <p className="mt-1 text-caption text-white/80">{c.cardBody}</p>
        </div>
      </div>
    </div>
  );
}

function MiniRing({ pct }: { pct: number }) {
  const size = 56;
  const strokeWidth = 5;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={strokeWidth} className="stroke-white/25" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={strokeWidth}
          stroke="white"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{pct}%</div>
    </div>
  );
}
