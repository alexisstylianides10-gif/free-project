# PRODUCT SPECS — WAVE 4

Author: Product. Source: Cato's Wave 4 scope in `PROJECT_STATE.md` (items 9 and 11 of the CEO's 17-item report; see "CATO — TRIAGE + PHASED PLAN" section, item-by-item findings and the "Wave 4" plan). Every file referenced below was read in full before writing this spec, not guessed at.

This is a new file, specific to Wave 4. It does not replace or touch `PRODUCT_SPECS.md` (the earlier UI-improvement initiative's spec) or `DEADLINES_SPEC.md`, both of which stay as-is per this project's established precedent of one spec file per initiative.

Ground rules I'm holding myself to, same as last time:
- No new design tokens or UI primitives beyond what's already shipped (`Modal`, `Button`, `Card`, the existing dot-progress-bar visual pattern from `OnboardingShell`). Both specs below extend existing components; neither invents a new one from scratch.
- No new database tables. Spec A adds one boolean column (following the exact precedent of `profiles.onboarding_completed`). Spec B adds zero schema — `roadmap_progress` already has everything it needs.
- Where an existing interaction pattern in this codebase already solves part of the problem (the missions page's "I completed this" self-report button, `Modal.tsx`'s built-in dismiss handling), I reuse it rather than inventing a parallel one.

---

## Spec A — New-user tutorial (Item 9)

### The decision: one-time interstitial, not a coachmark tour. Five cards, not three or four.

**Interstitial wins on cost, and the coachmark isn't actually a smaller build here.** I checked what exists to build on:
- `src/components/ui/Modal.tsx` is a real, generic Radix-Dialog-based modal (title/description/children, built-in overlay+content animation, built-in dismiss via X/overlay-click/Escape). A multi-card interstitial is a thin wrapper around this — no new primitive needed.
- `src/components/ui/Tooltip.tsx` is a **hover-triggered** tooltip (`RadixTooltip`, 300ms hover delay). It is not a coachmark/spotlight primitive — there's no anchored-positioning-relative-to-a-live-DOM-element logic, no dimming/highlighting of the rest of the UI, and critically, **the 5 tabs are 5 different routes** (`/app`, `/app/school`, `/app/future`, `/app/coach`, `/app/profile` — confirmed in `src/lib/navTabs.ts`). Next.js unmounts each page on navigation, so a real coachmark tour would need cross-page step-state persistence (localStorage or a URL param) driving the user through actual navigations, step re-anchoring per page, and a skip/exit affordance that works mid-navigation. That's a genuinely new, stateful subsystem, not a component wrapper.
- The onboarding results screen (`StudentOnboarding.tsx`'s `ResultsScreen`) establishes the visual tone I'm matching: `glass` cards, `bg-ambient-glow`, eyebrow label in `text-accent`, `text-heading font-extrabold` headline, full-width `Button size="lg"`, a small reassurance line under the CTA. I'm reusing this tone inside the interstitial, not the full-page `OnboardingShell` (that's a heavier, two-column desktop-split primitive built for a multi-question flow — wrong tool for a 5-card "here's what's here" tour).

Given Wave 4's "smaller, contained, mostly additive" framing, the interstitial is the right call and it isn't close.

**Five cards, not the "3-4" floated in the brief.** I'm deviating from that number deliberately: the actual gap named is "no guided introduction to the 5 tabs." Padding down to 3-4 cards means skipping a real tab, which undermines the point. Five short cards (one per tab, ~20 seconds to skim, each just an icon + one-line title + one-sentence body, no forced reading) is still genuinely light — it's not 5 screens of dense copy, it's 5 near-identical, near-instant cards. I'm making this call rather than defaulting to the number in the brief because the number was illustrative ("e.g."), not a requirement.

### 1. Schema change

Follows the exact precedent set by `profiles.onboarding_completed` (plain boolean, client-writable, added to the explicit column grant list).

`supabase/schema.sql` — add immediately after the `onboarding_completed` column definition (or anywhere in the `profiles` block — ordering doesn't matter, keeping it near `onboarding_completed` is just for readability):

```sql
alter table public.profiles add column if not exists tutorial_seen boolean not null default false;
```

And update the existing column-grant statement (search for `revoke update on public.profiles from authenticated;` — this is the **one gotcha to not miss**, a new boolean column on `profiles` is invisible to client writes until it's added to this explicit list):

```sql
revoke update on public.profiles from authenticated;
grant update (
  full_name, year_group, country, avatar_emoji, xp_school, xp_career,
  xp_skill, xp_project, streak_count, longest_streak, last_active_date,
  onboarding_completed, track, billing_interval, tutorial_seen
) on public.profiles to authenticated;
```

`src/lib/types.ts` — add to the `Profile` interface, right after `onboarding_completed: boolean;`:

```ts
tutorial_seen: boolean;
```

### 2. New component: `src/components/shared/NewUserTutorial.tsx`

Exact prop interface and implementation:

```tsx
"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Home, GraduationCap, Target, Compass, TrendingUp, Sparkles, CircleUserRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface TutorialStep {
  icon: LucideIcon;
  title: string;
  body: string;
}

/** Copy is track-specific, not shared/reused across tracks — same rule this
 * project already applies to onboarding question catalogs. One card per
 * nav tab (src/lib/navTabs.ts), same order, same icons as the real nav. */
function getTutorialSteps(track: "student" | "business"): TutorialStep[] {
  if (track === "business") {
    return [
      {
        icon: Home,
        title: "Home — your daily snapshot",
        body: "Your streak, XP, and today's plan, pulled from Plan and Grow, so you always know what to do first.",
      },
      {
        icon: Target,
        title: "Plan — your milestones",
        body: "Track the milestones that move your business forward, one at a time.",
      },
      {
        icon: TrendingUp,
        title: "Grow — your numbers and market",
        body: "Log your metrics and expenses, draft content, and keep an eye on your market.",
      },
      {
        icon: Sparkles,
        title: "Coach — ask it anything",
        body: "Not sure what to do next, or need to think through a decision? Your AI coach knows your business and your plan.",
      },
      {
        icon: CircleUserRound,
        title: "Profile — everything you've built",
        body: "Your stats, streak, and achievements, plus billing and account settings.",
      },
    ];
  }
  return [
    {
      icon: Home,
      title: "Home — your daily snapshot",
      body: "Your streak, XP, and today's plan, pulled from School and Future, so you always know what to do first.",
    },
    {
      icon: GraduationCap,
      title: "School — everything school-related",
      body: "Your classes, homework, exams, and an AI study coach that knows your subjects.",
    },
    {
      icon: Compass,
      title: "Future — where this is heading",
      body: "See your top career matches and follow a 6-level roadmap from exploring to building something real.",
    },
    {
      icon: Sparkles,
      title: "Coach — ask it anything",
      body: "Stuck on homework or not sure what's next? Your AI coach knows your subjects and your plan.",
    },
    {
      icon: CircleUserRound,
      title: "Profile — everything you've built",
      body: "Your stats, skills, streak, and achievements, plus billing and account settings.",
    },
  ];
}

export function NewUserTutorial({
  open,
  track,
  onFinish,
}: {
  open: boolean;
  track: "student" | "business";
  onFinish: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = getTutorialSteps(track);
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const Icon = step.icon;

  // Any dismissal — X, overlay click, Escape, or reaching "Get started" on
  // the last card — is an equally valid "seen it" signal for a one-time
  // tour, so they all route through the same handler.
  function handleOpenChange(next: boolean) {
    if (!next) {
      setStepIndex(0);
      onFinish();
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Quick tour"
      description="Here's where everything lives. Takes about 20 seconds."
    >
      <div className="flex flex-col items-center py-2 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow-accent">
          <Icon className="h-6 w-6 text-white" />
        </span>
        <h3 className="mt-4 text-base font-bold text-foreground">{step.title}</h3>
        <p className="mt-2 max-w-[32ch] text-sm leading-relaxed text-muted-foreground">{step.body}</p>
      </div>

      <div className="mt-6 flex gap-1.5">
        {steps.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              i <= stepIndex ? "bg-gradient-brand" : "bg-muted"
            )}
          />
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="md"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          className={stepIndex === 0 ? "invisible" : undefined}
        >
          Back
        </Button>
        {isLast ? (
          <Button size="md" onClick={() => handleOpenChange(false)}>
            Get started
          </Button>
        ) : (
          <Button size="md" onClick={() => setStepIndex((i) => i + 1)}>
            Next
          </Button>
        )}
      </div>
    </Modal>
  );
}
```

Notes for Dev:
- The dot progress bar reuses the exact visual pattern already shipped in `OnboardingShell.tsx` (`h-1.5 flex-1 rounded-full`, `bg-gradient-brand` active / `bg-muted` inactive) — not a new token, just the same 3 classes.
- No `framer-motion` step-transition animation. `OnboardingShell` uses `AnimatePresence` for its step transitions, but that's a heavier full-page flow; a plain conditional re-render inside a modal shown once ever doesn't need it. If Dev wants a subtle transition between cards, `framer-motion` is already a dependency and fine to use, but it is not required — don't block on it.
- "Back" on the first card is `invisible` (not `hidden`) so the "Next"/"Get started" button doesn't shift position as the user steps through — same layout-stability reasoning as any button-visibility toggle elsewhere in this codebase.

### 3. Wiring into `src/app/app/layout.tsx`

This is the single mount point for the whole `/app/*` tree, already gates on `profile.onboarding_completed` — the right place to check `tutorial_seen` once, for every entry into the app post-onboarding, regardless of which tab the user lands on first.

Changes:
1. Add `refreshProfile` to the existing `useAuth()` destructure (currently `const { user, profile, loading, profileLoading } = useAuth();` — add `refreshProfile`).
2. Add imports: `import { useState } from "react";` (extend the existing `react` import), `import { NewUserTutorial } from "@/components/shared/NewUserTutorial";`, `import { supabase } from "@/lib/supabase/client";`.
3. Add state + effect, inside the component body, before the early returns:

```tsx
const [showTutorial, setShowTutorial] = useState(false);

useEffect(() => {
  if (profile && profile.onboarding_completed && !profile.tutorial_seen) {
    setShowTutorial(true);
  }
}, [profile]);

async function dismissTutorial() {
  setShowTutorial(false); // flip immediately, don't wait on the network round trip
  if (!user || !supabase) return;
  await supabase.from("profiles").update({ tutorial_seen: true }).eq("id", user.id);
  refreshProfile();
}
```

4. Render `<NewUserTutorial open={showTutorial} track={profile.track} onFinish={dismissTutorial} />` as a plain sibling anywhere inside the final returned root `<div className="min-h-dvh bg-background md:flex">` (it's a Radix Portal under the hood, so exact DOM position inside that tree doesn't matter — e.g. right before the closing `</div>`, after `<BottomNav />`).

This only ever mounts/checks `showTutorial` for a fully onboarded user with a loaded profile (both early-return guards above it in the file are unaffected), so it can't fire mid-onboarding or before the profile exists.

### 4. What NOT to build here (explicitly out of scope for Wave 4)

- No anchored/spotlight coachmarks, no per-tab overlay triggered by actual navigation.
- No "replay tour" entry point in Profile/Settings. Legitimate future add (one boolean flip + reopening the same component), but not required for this pass — flagging it so it isn't silently assumed to exist.
- No server-side/API route for marking `tutorial_seen` — this is a plain client-side profile update through the existing browser Supabase client, same as every other own-row profile write in this codebase (RLS backstops it: `profiles_update_own` policy, `id = auth.uid()`).

---

## Spec B — Roadmap progression mechanism (Item 11)

### What's actually in `src/lib/catalog/roadmap.ts` today

```
Level 1 (Discover): "Discover your interests" — complete onboarding, explore top career matches.
Level 2 (Learn):    "Learn the basics" — build one core skill: coding, design, writing, or numbers.
Level 3 (Build):    "Build your first project" — turn what you're learning into something real you can show.
Level 4 (Launch):   "Launch it" — share your project or idea with a real audience, even a small one.
Level 5 (Grow):     "Get your first users or feedback" — get real feedback from people outside your immediate circle.
Level 6 (Grow):     "Build something bigger" — turn an early win into a bigger project, portfolio, or small business.
```

`roadmap_progress` schema (confirmed, `supabase/schema.sql`): `user_id, level_number, unlocked boolean, completed_at timestamptz`, PK `(user_id, level_number)`, RLS `user_id = auth.uid()`. **No new columns needed — this already has everything the mechanism below requires.** Only `completeOnboarding.ts` writes to it today (level 1 completed + level 2 unlocked, at signup, unchanged by this spec).

**Scope note, stated plainly: this feature is student-track only, and stays that way.** `RoadmapTimeline`/`ROADMAP_LEVELS`/`roadmap_progress`-reading UI exists exclusively in `StudentFutureHome.tsx` — confirmed by reading `BusinessGrowHome.tsx` in full and grepping the codebase for "roadmap": zero hits outside the student path. Business track has no roadmap UI at all today, and Cato's Wave 4 scope didn't ask for one. I'm not building a business-track roadmap here — that would be a new feature, not fixing this one, and business signups are currently paused per this session's own history. One consequence of this, called out explicitly below in the mission-completion hook: business-track users completing "business"-category missions will still, harmlessly, get `roadmap_progress` rows written (see "Known accepted tradeoff" below) — those rows are simply never rendered to them.

### Tracking primitives already in place (what I'm wiring into, not inventing)

- **XP buckets** (`src/lib/xp.ts`, `profiles.xp_school/xp_career/xp_skill/xp_project`) — a running total, no per-event log. Not granular enough to know *which* mission was completed, only a bucket sum. Not what I'm using for the rule (see below — a total is a worse signal than the actual completion event it's built from).
- **Missions** (`src/lib/catalog/missions.ts` + `user_missions` table + `src/lib/actions/missions.ts`'s `completeMission()`) — this is the real hook. Every mission completion already flows through one function, already computes `isFirstOfCategory(category)` (used today to award the `first_career_mission` and `first_project` achievements), and mission categories (`school, skill, career, business, creative`) map cleanly onto roadmap language:
  - Roadmap Level 2 ("build one core skill: coding, design, writing, or numbers") ↔ the **`skill`** mission category (`skill-coding-concept`, `skill-public-speaking`, `skill-design-basics` — xp bucket `xp_skill`). This is an approximation (roadmap copy also says "writing, numbers" which the 3 shipped skill missions don't literally cover), but it's the closest real, already-tracked bucket to "core skill" — not something invented for this spec.
  - Roadmap Level 3 ("turn what you're learning into something real you can show") ↔ first mission in **`business`** or **`creative`** category — this is *exactly* the existing `first_project` achievement's trigger condition ("Built your first real project"), already coded at `src/lib/actions/missions.ts:50-52`. Reusing this signal, not adding a new one.
- **Achievements** (`user_achievements`, `src/lib/actions/achievements.ts`) — confirms the "first X" idempotency pattern I'm reusing (`isFirstOfCategory`), but achievements themselves are a separate, parallel system (their own table) — I'm not writing to `user_achievements` from the roadmap logic, just reusing the same trigger *moment*.
- **Self-report precedent** — `src/app/app/missions/[id]/page.tsx` already has a real, shipped pattern for "the app can't verify this, the user confirms it themselves": the "I completed this" button, with the caption "Be honest. Missions only count for something if you actually did them." This is the exact right precedent for Levels 4-6 below, not a new interaction pattern.

### The decision: hybrid — automatic for Levels 2-3, manual self-report for Levels 4-6

Not presenting both and punting — here's the actual call, level by level, and why:

- **Levels 2 and 3 map onto real, already-tracked, in-app actions** (completing a skill mission; completing a business/creative mission). The app genuinely knows these happened. Auto-advancing here is honest, not "magic" — it's the same completion event already firing an achievement, just also advancing the roadmap.
- **Levels 4, 5, 6 describe real-world, out-of-app actions the product has no way to verify**: "share it with an audience," "get feedback from people outside your circle," "build something bigger." There is no existing tracked action that's a faithful proxy for any of these (the closest candidate I considered — counting a *second* business/creative mission completion as a proxy for "Launch it" — is a stretch that overclaims a signal the app doesn't actually have; I'm not shipping a fake-automatic trigger that silently claims to know something it doesn't). Manual self-report is the more honest choice here, and it's not a fallback/compromise — it's already this app's established pattern for exactly this situation (missions), so building the same interaction for the roadmap is the *smaller*, not the *lesser*, engineering choice.

This is a deliberate per-level split, not "automatic where easy, manual where hard" — it's automatic where the app has a real signal, manual where it doesn't.

### Where it's evaluated

**Automatic (Levels 2-3): at the moment of mission completion**, inside `completeMission()` — not polled on app-load, not re-evaluated elsewhere. This is the same place the achievement awards already happen, so it's one extra function call at an existing call site, not a new evaluation loop.

**Manual (Levels 4-6): a "Mark as done" button on the roadmap timeline itself**, shown only on the single current frontier step (the lowest-numbered `unlocked`-but-not-`completed` level whose catalog entry says `advancement: "manual"`). Same self-report pattern as the missions page, including the honesty caption — no new interaction invented.

### New file: `src/lib/actions/roadmap.ts`

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_LEVEL = 6;

/**
 * Marks `level` (and any earlier level not already completed) as completed,
 * and unlocks the next level if one exists.
 *
 * Backfill-safe by design: this fetches the user's actual current
 * roadmap_progress rows first rather than trusting a level-by-level
 * sequential assumption, so an out-of-order trigger (e.g. a business/
 * creative mission completes and fires Level 3 before any skill mission has
 * ever fired Level 2) never leaves an earlier level showing "locked" while
 * a later one shows "completed" on the timeline — every level from 1 up to
 * `level` gets marked completed together. Backfilled levels all share the
 * same completed_at timestamp (the moment of the triggering action) rather
 * than a fabricated earlier date — acceptable because nothing in the UI
 * displays roadmap_progress.completed_at as an absolute date today, only
 * as a completed/unlocked/locked status.
 *
 * Idempotent: safe to call more than once for the same level (an already-
 * completed level is left untouched, never re-dated).
 */
export async function advanceRoadmapLevel(supabase: SupabaseClient, userId: string, level: number) {
  if (level < 1 || level > MAX_LEVEL) return;

  const { data: existingRows } = await supabase
    .from("roadmap_progress")
    .select("level_number, unlocked, completed_at")
    .eq("user_id", userId);

  const byLevel = new Map((existingRows ?? []).map((r) => [r.level_number, r]));
  const now = new Date().toISOString();

  const toComplete = [];
  for (let n = 1; n <= level; n++) {
    const existing = byLevel.get(n);
    if (existing?.completed_at) continue; // already completed — don't touch, preserves original completed_at
    toComplete.push({ user_id: userId, level_number: n, unlocked: true, completed_at: now });
  }

  if (toComplete.length) {
    await supabase.from("roadmap_progress").upsert(toComplete, { onConflict: "user_id,level_number" });
  }

  if (level < MAX_LEVEL) {
    const next = byLevel.get(level + 1);
    if (!next?.unlocked) {
      // completed_at deliberately omitted from this payload so an
      // already-completed next level (shouldn't happen sequentially, but
      // be defensive) is never reset to null/overwritten.
      await supabase
        .from("roadmap_progress")
        .upsert({ user_id: userId, level_number: level + 1, unlocked: true }, { onConflict: "user_id,level_number" });
    }
  }
}
```

Self-contained (does its own read before writing) so it works identically whether called from a context that already has roadmap data loaded (the Future tab) or one that doesn't (the missions detail page, which has no reason to also load `useRoadmapProgress` just for this).

### Catalog change: `src/lib/catalog/roadmap.ts`

Add an `advancement` field so the UI (Spec below) knows which levels get the auto hook vs. the manual button, without hardcoding level numbers in component logic:

```ts
export interface RoadmapLevelDef {
  level: number;
  stage: "Discover" | "Learn" | "Build" | "Launch" | "Grow";
  title: string;
  description: string;
  /** "auto" = the app advances this level itself, from a real tracked
   * action (see src/lib/actions/roadmap.ts callers). "manual" = the
   * underlying action is real-world and unverifiable by the app, so the
   * student self-reports it via "Mark as done" — same honesty-based
   * pattern already used for mission completion. */
  advancement: "auto" | "manual";
}

export const ROADMAP_LEVELS: RoadmapLevelDef[] = [
  { level: 1, stage: "Discover", title: "Discover your interests", description: "Complete onboarding and explore your top career matches.", advancement: "auto" },
  { level: 2, stage: "Learn", title: "Learn the basics", description: "Build one core skill your top career needs: coding, design, writing, or numbers.", advancement: "auto" },
  { level: 3, stage: "Build", title: "Build your first project", description: "Turn what you're learning into something real you can show.", advancement: "auto" },
  { level: 4, stage: "Launch", title: "Launch it", description: "Share your project or idea with a real audience, even a small one.", advancement: "manual" },
  { level: 5, stage: "Grow", title: "Get your first users or feedback", description: "Get real feedback from people outside your immediate circle.", advancement: "manual" },
  { level: 6, stage: "Grow", title: "Build something bigger", description: "Turn an early win into a bigger project, portfolio, or small business.", advancement: "manual" },
];
```

(Only the new `advancement` field and its per-level values are additions — every `title`/`description`/`stage` string is unchanged from the existing file.)

Level 1 is marked `advancement: "auto"` for documentation consistency, but its actual mechanism (set at onboarding in `completeOnboarding.ts`) is unchanged by this spec — don't route it through the new `advanceRoadmapLevel()` helper, it already works.

### Hook into `src/lib/actions/missions.ts`'s `completeMission()`

Add one import and two calls, at the exact existing achievement-award call sites (minimal diff, same guard conditions already in the file):

```ts
import { advanceRoadmapLevel } from "@/lib/actions/roadmap";

// ...inside completeMission(), replacing the existing block:

if (mission.category === "skill" && isFirstOfCategory("skill")) {
  await advanceRoadmapLevel(supabase, userId, 2);
}
if (mission.category === "career" && isFirstOfCategory("career")) {
  await awardAchievementOnce(supabase, userId, "first_career_mission");
}
if ((mission.category === "business" || mission.category === "creative") && isFirstOfCategory(mission.category)) {
  await awardAchievementOnce(supabase, userId, "first_project");
  await advanceRoadmapLevel(supabase, userId, 3);
}
```

**Known accepted tradeoff, stated explicitly:** `completeMission()` is shared by both tracks (business-track users complete "business"-category missions too). This means a business-track user's first business-category mission will also write `roadmap_progress` rows for them, even though — per the scope note above — there is no roadmap UI on the business track to ever show it. This is harmless (invisible, unread data, no behavior change for that user) but worth stating rather than silently letting it happen unremarked. The alternative (widening `completeMission()`'s `profile` parameter type to include `track` just to gate this invisible side effect) is more plumbing than the tradeoff is worth for Wave 4's "small, contained" framing — flagging this explicitly rather than quietly adding scope.

### `RoadmapTimeline.tsx` change — add the manual "Mark as done" action

Extend the existing `RoadmapStep` interface with an optional `action`, and render it under the description for the one step that has it:

```tsx
export interface RoadmapStep {
  level: number;
  title: string;
  description?: string;
  status: "completed" | "unlocked" | "locked";
  /** Only ever set on the single current frontier "unlocked" step whose
   * catalog entry is advancement: "manual" — see StudentFutureHome. */
  action?: { label: string; pending: boolean; onClick: () => void };
}
```

Inside the `<div className="pt-0.5">` block, after the existing `{step.description && ...}` line, add:

```tsx
{step.action && (
  <div className="mt-3">
    <Button size="sm" variant="mission" onClick={step.action.onClick} disabled={step.action.pending}>
      <CheckCircle2 className="h-3.5 w-3.5" />
      {step.action.pending ? "Saving…" : step.action.label}
    </Button>
    <p className="mt-1.5 text-xs text-muted-foreground">Be honest — this one's on you to confirm.</p>
  </div>
)}
```

Add `import { Button } from "@/components/ui/Button";` and `CheckCircle2` to the existing `lucide-react` import in `RoadmapTimeline.tsx`. `variant="mission"` and the `CheckCircle2` icon + "Saving…" pending copy deliberately mirror the mission-detail page's own completion button exactly (`src/app/app/missions/[id]/page.tsx` lines 88-95) — same interaction, same visual language, not a new one.

### `StudentFutureHome.tsx` change — compute and pass the action

```tsx
const [markingLevel, setMarkingLevel] = useState<number | null>(null);

async function handleMarkComplete(level: number) {
  if (!user || !supabase) return;
  setMarkingLevel(level);
  await advanceRoadmapLevel(supabase, user.id, level);
  await refetchRoadmap();
  setMarkingLevel(null);
}

const manualUnlockedLevels = ROADMAP_LEVELS.filter((l) => {
  const progress = roadmapProgress.find((p) => p.level_number === l.level);
  return l.advancement === "manual" && progress?.unlocked && !progress.completed_at;
}).map((l) => l.level);
const frontierManualLevel = manualUnlockedLevels.length ? Math.min(...manualUnlockedLevels) : null;

const roadmapSteps: RoadmapStep[] = useMemo(
  () =>
    ROADMAP_LEVELS.map((level) => {
      const progress = roadmapProgress.find((p) => p.level_number === level.level);
      const status: RoadmapStep["status"] = progress?.completed_at ? "completed" : progress?.unlocked ? "unlocked" : "locked";
      const action =
        level.level === frontierManualLevel
          ? { label: "Mark as done", pending: markingLevel === level.level, onClick: () => handleMarkComplete(level.level) }
          : undefined;
      return { level: level.level, title: level.title, description: level.description, status, action };
    }),
  [roadmapProgress, frontierManualLevel, markingLevel]
);
```

Requires:
- `import { supabase } from "@/lib/supabase/client";` and `import { advanceRoadmapLevel } from "@/lib/actions/roadmap";` added to `StudentFutureHome.tsx`.
- `useRoadmapProgress`'s returned `refetch` destructured and renamed (e.g. `const { data: roadmapProgress, refetch: refetchRoadmap } = useRoadmapProgress(user?.id);`) so the component can refresh after a manual mark-complete.

`Math.min(...manualUnlockedLevels)` is the defensive guard that only ever one step is actionable at a time even if the backfill logic somehow left more than one manual level unlocked-and-incomplete simultaneously (shouldn't happen given the sequential design, but cheap to guard against rather than assume).

### Edge cases covered

- **Out-of-order completion** (business/creative mission completed before any skill mission): handled by the backfill loop in `advanceRoadmapLevel` — Level 2 gets backfilled to completed alongside Level 3, so the timeline never shows a locked level before a completed one.
- **Double-completion / repeat calls**: idempotent by construction (already-`completed_at` rows are skipped in the backfill loop; the manual button only ever renders on an incomplete frontier level, so it can't be double-clicked into a bad state — the `pending` disabled-state during the round trip covers the network-race case).
- **Level 6 (terminal)**: `if (level < MAX_LEVEL)` guard means completing Level 6 marks it completed and stops — no Level 7 row is ever attempted.
- **A user who already has Level 1/2 rows from onboarding (all existing users)**: the mechanism reads existing rows first, so it layers on top of the current data with no migration/backfill script needed for already-signed-up users — their existing Level 1 (completed) / Level 2 (unlocked) rows are read and respected exactly as `advanceRoadmapLevel` would have left them itself.

---

## Handoff notes for Dev

Files to touch, Spec A: `supabase/schema.sql`, `src/lib/types.ts`, `src/components/shared/NewUserTutorial.tsx` (new), `src/app/app/layout.tsx`.

Files to touch, Spec B: `src/lib/actions/roadmap.ts` (new), `src/lib/catalog/roadmap.ts`, `src/lib/actions/missions.ts`, `src/components/shared/RoadmapTimeline.tsx`, `src/app/app/future/StudentFutureHome.tsx`.

Both specs are additive — no existing function signatures change shape in a breaking way (`RoadmapStep.action` and `RoadmapLevelDef.advancement` are both new optional/required-but-additive fields, not replacements), and neither touches the business track's Home/Plan/Grow files at all.

Both are ready for Dev to build directly from this document — no further Product clarification needed before implementation. QA should verify, in addition to the usual `tsc`/`build`/RLS checks: (1) the tutorial shows exactly once per account across a real sign-out/sign-in cycle, (2) dismissing via X vs. finishing the last card both set `tutorial_seen` correctly, (3) the roadmap backfill logic with an out-of-order completion (complete a business/creative mission before any skill mission, confirm Level 2 and Level 3 both show completed, not just Level 3), (4) the manual mark-complete button only ever appears on one level at a time and disappears after confirming.
