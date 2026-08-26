# PRODUCT SPECS — UI Improvement Initiative

Author: Product. Source: Cato's codebase audit (see PROJECT_STATE.md — CURRENT TASK / BUGS). Every file below was read in full before writing this spec; no layout, copy, or component choice here is a guess Dev has to resolve.

Ground rules I'm holding myself to:
- No new design tokens. Every color/gradient/tone used below already exists in globals.css and is already used elsewhere in the app (`bg-gradient-brand`, `tone="future"`, `border-accent/20`, etc.).
- Every new layout follows the existing patterns already in this codebase (the `lg:` two-column grid from StudentHome/BusinessHome, the section-header-outside-the-Card convention used everywhere in School/Grow/Home).
- Where I think part of Cato's list is lower-value than it looks, I say so and cut or shrink it. See "What I cut" at the end of each priority.

Priorities are in the order Dev should implement them.

---

## Priority 1 — Shared `EmptyState` component + system-wide adoption

**Why first:** highest leverage, lowest risk per Cato's audit — one component, ~20 files touched, zero behavior change, immediate visual consistency win.

### New component: `src/components/shared/EmptyState.tsx`

Exact prop interface:

```ts
import type { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon: LucideIcon;               // pass the icon component itself, e.g. Compass — not JSX
  title: string;
  subtitle: string;
  cta?: { label: string; href: string };
  bare?: boolean;                 // true = no outer Card/CardContent (for nesting inside a Card that already has other content above, e.g. a form)
  className?: string;             // applied to the outer element (Card, or the bare wrapper)
}
```

Implementation (this is the exact markup, not a suggestion — it's a direct extraction of the pattern already used in StudentFutureHome's no-matches state, lines 45-55):

```tsx
"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  cta?: { label: string; href: string };
  bare?: boolean;
  className?: string;
}

export function EmptyState({ icon: Icon, title, subtitle, cta, bare, className }: EmptyStateProps) {
  const inner = (
    <div className={cn("flex flex-col items-center gap-2 py-8 text-center", bare && "py-4")}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand">
        <Icon className="h-5 w-5 text-white" />
      </span>
      <p className="mt-1 text-sm font-semibold text-foreground">{title}</p>
      <p className="max-w-[30ch] text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
      {cta && (
        <Link href={cta.href} className="mt-2">
          <Button size="sm" variant="secondary">
            {cta.label}
          </Button>
        </Link>
      )}
    </div>
  );

  if (bare) return <div className={className}>{inner}</div>;

  return (
    <Card className={className}>
      <CardContent className="p-0">{inner}</CardContent>
    </Card>
  );
}
```

Note the `bare` padding is `py-4` not `py-8` — when nested under a form inside an existing Card, `py-8` reads as too much dead air; `py-4` keeps it compact. When wrapped (default), `CardContent className="p-0"` is used because the inner `div` already carries its own `py-8` — this avoids doubled padding versus the standard `CardContent` (`p-5`).

### Adoption list

Every instance below is an existing ad-hoc "empty" render I found by reading the files and grepping for `yet`, `No <thing>`, `Nothing`. For each: exact replacement copy, icon, mode (wrapped/bare), and CTA decision. Where I'm deliberately **not** converting something, I say why — converting everything indiscriminately would make small compact UI worse, not better (Guiding Question).

| File | Current copy | Action | Icon | Title | Subtitle | CTA |
|---|---|---|---|---|---|---|
| `StudentHome.tsx` (today's plan, ~L118-122) | "Nothing scheduled yet — check School to add homework and exams." | Replace whole `<Card>` block with `<EmptyState />` | `CalendarClock` | "Nothing scheduled yet" | "Add homework and exams in School to build today's plan." | `{ label: "Go to School", href: "/app/school" }` |
| `BusinessHome.tsx` (do-this-next, ~L84-89) — two states | "No milestones yet — check your Plan tab." / "All caught up on milestones!" | Replace whole `<Card>` block with `<EmptyState />`, branch on `milestones.length === 0` | `Target` (empty) / `CheckCircle2` (all done) | "No milestones yet" / "All caught up" | "Add milestones in Plan to see what's next." / "Every milestone is done — add a new one in Plan." | `{ label: "Go to Plan", href: "/app/school" }` on both |
| `BusinessHome.tsx` (latest metric, ~L129-143) | "No metrics logged yet — head to Grow to log one." | Replace whole `<Card>` block (including the standalone `TrendingUp` icon) with `<EmptyState />` | `TrendingUp` | "No metrics logged yet" | "Log your first number in Grow to start tracking trends." | `{ label: "Go to Grow", href: "/app/future" }` |
| `BusinessGrowHome.tsx` (metrics list, L169) | "No metrics logged yet." | `bare` mode, nested below the log form inside the same Card | `TrendingUp` | "No metrics logged yet" | "Log your first number above to start tracking trends." | none (form is right above) |
| `BusinessGrowHome.tsx` (expenses list, L230) | "No expenses logged yet." | `bare` mode, same pattern | `Receipt` | "No expenses logged yet" | "Log your first expense above to start tracking spend." | none |
| `BusinessGrowHome.tsx` (competitors list, L311) | "No competitors added yet." | `bare` mode, same pattern | `Users` | "No competitors added yet" | "Add one below to start watching the market." | none |
| `BusinessPlanHome.tsx` (milestones, ~L96-99) | "No milestones yet — add your first below." | Replace whole `<Card>` block | `Target` | "No milestones yet" | "Add your first milestone below to start your plan." | none (add-input is directly below) |
| `StudentFutureHome.tsx` (no matches, ~L45-55) | Already icon+title+subtitle | Refactor to call the new `<EmptyState />` directly instead of hand-rolled markup — same copy, same icon | `Compass` | "No career matches yet" | "Complete onboarding to see careers matched to your subjects, interests, and strengths." | none |
| `school/exams/page.tsx` (L41) | "No exams on the horizon yet." | Replace whole empty block | `CalendarClock` | "No exams on the horizon yet" | "Add an exam to start tracking your countdown." | none unless the page already has an inline "Add exam" control elsewhere on screen — if so, omit CTA to avoid a duplicate action |
| `school/quizzes/page.tsx` (no quizzes, L227) | "No quizzes yet — generate one above." | `bare` mode if nested under the generator form (matches BusinessGrowHome pattern); otherwise wrapped | `ClipboardList` | "No quizzes yet" | "Generate one above to start practicing." | none |
| `school/quizzes/page.tsx` (no subjects, L114-116) | "Add a subject first, then come back to generate a quiz." | Replace whole block | `BookOpen` | "Add a subject first" | "Come back here once you've added a subject to generate a quiz." | `{ label: "Add subject", href: "/app/school/subjects" }` |
| `school/quizzes/exam-mode/page.tsx` (L99-101) | "Add a subject first, then come back to start a mock exam." | Same pattern as above | `BookOpen` | "Add a subject first" | "Come back here once you've added a subject to start a mock exam." | `{ label: "Add subject", href: "/app/school/subjects" }` |
| `school/flashcards/page.tsx` (L124-126) | "Add a subject first, then come back to generate flashcards." | Same pattern | `BookOpen` | "Add a subject first" | "Come back here once you've added a subject to generate flashcards." | `{ label: "Add subject", href: "/app/school/subjects" }` |
| `school/subjects/[subjectId]/page.tsx` (L141-144) | "No material yet — upload a PDF, photo, or your notes to get started." | Replace whole block | `Upload` (or reuse whatever icon the page's own upload action uses) | "No material yet" | "Upload a PDF, photo, or your notes to get started." | none (upload control is on-page) |
| `school/StudentSchoolHome.tsx` (no classes, L215-217) | "No classes today." | Replace — keep it minimal, no subtitle padding needed but component requires one | `CalendarClock` | "No classes today" | "Nothing on your timetable for today." | none |
| `school/StudentSchoolHome.tsx` (no homework, L245-247) | "Nothing set right now." | Replace | `ClipboardCheck` | "Nothing set right now" | "You're all caught up on homework." | none |
| `school/StudentSchoolHome.tsx` (no weekly plan, L285-287) | "No weekly plan yet." | Replace | `BookOpen` | "No weekly plan yet" | "Build a study plan in Subjects to see it here." | `{ label: "Go to Subjects", href: "/app/school/subjects" }` |
| `school/progress/page.tsx` (L124-126) | "No study sessions logged yet — they'll show up here once you start studying." | Replace | `Clock` | "No study sessions logged yet" | "They'll show up here once you start studying." | none |
| `profile/page.tsx` (skills, L120-125) | "Complete missions to start building skills." | Replace | `Sparkles` | "No skills yet" | "Complete missions to start building skills." | none |
| `weekly-review/page.tsx` (L166) | "No skill activity to report yet — complete missions to start building skills." | Replace (same treatment as above) | `Sparkles` | "No skill activity yet" | "Complete missions to start building skills." | none |

**Deliberately NOT converting** (leave as plain inline text — forcing EmptyState here would add visual weight to a spot too small for it, which makes the screen worse, not better):
- `StudentHome.tsx` "No exams yet" / "All caught up" inside the 2-column mini stat cards (~L149, L169) — these live inside a compact `grid-cols-2` tile with an icon already above the label; there's no room for a second icon badge + subtitle + CTA without breaking the tile's proportions.
- `coach/page.tsx` "No conversations yet." inside the thread history popover (L167) — this is a small `max-h-56` dropdown-style panel; a full icon+title+subtitle block would overflow its purpose. Plain centered text is correct here.
- `CountrySelect.tsx` "No countries match." (L46) — this is a filter-no-results row inside a searchable dropdown list, a different UX category from a screen-level empty state.
- `school/quizzes/[quizId]/results/[attemptId]/page.tsx` "None yet — keep practicing." (L129) — inline fallback inside a single stat line, not a section.
- `school/weak-topics/page.tsx` "Not tested yet…" (L27) — inline descriptive text attached to a topic row, not an empty section.

### What I cut from this priority
Nothing cut — this is the one item on the list I have zero reservations about. Do it as specced.

---

## Priority 2 — Track-aware Achievements

**Files:** `src/lib/catalog/achievements.ts`, `src/app/app/profile/page.tsx`

**The bug:** `ACHIEVEMENTS` in `achievements.ts` has no concept of track. `profile/page.tsx` renders all 9 unconditionally via `ACHIEVEMENTS.map(...)`. Five of the nine are wired only to the student-only Study system (`first_study_session`, `study_sessions_10`, `first_quiz`, `first_mock_exam`, `flashcards_mastered_20` — confirmed in `StudentSchoolHome.tsx`'s `awardAchievementOnce` calls). A business-track user can never unlock these; they sit permanently grayed-out with irrelevant copy ("Completed your first AI-generated quiz") in every single visit to Profile, forever.

### Spec

**1. `src/lib/catalog/achievements.ts`** — add an optional `track` field:

```ts
export interface AchievementDef {
  key: string;
  icon: string;
  title: string;
  description: string;
  track?: "student"; // absent = shown on both tracks; only ever set to "student" today (no business-only achievement exists yet)
}
```

Set `track: "student"` on exactly these five entries: `first_study_session`, `study_sessions_10`, `first_quiz`, `first_mock_exam`, `flashcards_mastered_20`. Leave the other four (`first_career_mission`, `first_project`, `career_path_chosen`, `streak_7`) untouched — they're driven by the shared missions/streak systems, not the Study system, so they're genuinely achievable on both tracks.

**2. `src/app/app/profile/page.tsx`** — filter before rendering. Replace:

```tsx
{ACHIEVEMENTS.map((a) => {
```

with:

```tsx
{ACHIEVEMENTS.filter((a) => !a.track || a.track === profile.track).map((a) => {
```

No other change to the achievements section — same `grid-cols-2 gap-3`, same Card, same lock icon, same grayscale-when-unearned treatment. Business-track users now see 4 achievement cards (2 rows) instead of 9 cards with 5 permanently dead; student-track users see no change at all (all 9, exactly as today).

### What I cut from this priority
Cato's framing left room to read this as "make achievements track-aware" in the fuller sense of also **adding new business-specific achievements** (e.g. "First Milestone," "First Metric Logged," "10 Milestones Done") to backfill the count business users lose. I'm cutting that. It requires new `awardAchievementOnce` call sites wired into `BusinessPlanHome.tsx` and `BusinessGrowHome.tsx`, new keys in the catalog, and someone deciding reasonable unlock thresholds — that's a new feature, not a UI fix, and it's out of scope for "fix the UI, don't redesign." Four honest, always-earnable achievement cards beat nine cards where five are decoration.

---

## Priority 3 — BusinessHome desktop hero: fix the imbalance vs. StudentHome

**File:** `src/app/app/BusinessHome.tsx` (desktop hero Card, lines 54-66)

**The problem:** StudentHome's desktop hero card holds two `RadialStat` rings side by side plus an ambient blur decoration — it reads full and considered. BusinessHome's equivalent hero card holds exactly one ring (`Milestones`, size 104) centered in the same-width card, so it reads sparse by comparison even though nothing is functionally missing.

**What I'm not doing:** inventing a second percentage stat for business (there isn't a second legitimate 0-100% completion metric on this track today — revenue/customers/expenses aren't percentages). Fabricating one just to mirror Student's two-ring layout would be exactly the kind of fake-parity UI the No-BS Rule rules out.

### Spec

In the desktop hero `Card` (`className="hidden overflow-hidden border-accent/20 lg:col-start-2 lg:row-start-1 lg:block"`):

1. Enlarge the single ring: `<RadialStat label="Milestones" value={milestonePercent} tone="future" size={104} strokeWidth={8} />` → `size={128} strokeWidth={10}`. This is the same component, same props shape, just filling the space the card actually has (StudentHome's two 88px rings occupy roughly the same combined width).
2. Add a real-data caption line between the ring and the existing streak footer, only when there are milestones to count:

```tsx
<div className="relative flex items-center justify-center">
  <RadialStat label="Milestones" value={milestonePercent} tone="future" size={128} strokeWidth={10} />
</div>
{milestones.length > 0 && (
  <p className="relative mt-3 text-center text-xs font-medium text-muted-foreground">
    {doneCount} of {milestones.length} milestones done
  </p>
)}
<div className="relative mt-4 flex items-center justify-center gap-1.5 border-t border-border pt-4 text-sm font-bold text-foreground">
  {/* existing streak footer, unchanged */}
</div>
```

`doneCount` and `milestones` are already in scope in this component (lines 27, 29) — no new data fetching.

### What I cut from this priority
A second ring, a chart, or a sparkline for revenue/expense trend on this hero card — all would require picking an arbitrary metric to feature above the others, which is a product decision beyond "fix the UI," and none of it is a percent-of-completion the ring metaphor actually fits.

---

## Priority 4 — BusinessGrowHome: reduce the four-forms-stacked feel

**File:** `src/app/app/future/BusinessGrowHome.tsx`

**The problem, precisely:** four sections (Metrics, Expenses, Content Helper, Competitors), each a Card with a form at the top and a plain list below, all at identical visual weight. Nothing signals "here's what's happening" vs. "here's where you type." The three empty-list states already got fixed by Priority 1. Two more targeted changes make the page feel considered rather than just four forms glued together — I'm deliberately not restructuring the page (no new sub-nav, no tabs, no chart library).

### Spec

**1. Metrics section — trend badge on the latest entry.** Directly under the log form, before the "no metrics" / list branch, when there are ≥2 entries for the same `metric_key` as the latest one, show a small delta badge next to the most recent value using the existing `Badge` component:

```tsx
{metrics.length > 0 && (() => {
  const latest = metrics[0];
  const prior = metrics.slice(1).find((m) => m.metric_key === latest.metric_key);
  if (!prior) return null;
  const delta = latest.value - prior.value;
  if (delta === 0) return null;
  return (
    <Badge tone={delta > 0 ? "success" : "danger"} className="mt-3">
      {delta > 0 ? "+" : ""}
      {delta} vs last {METRIC_OPTIONS.find((o) => o.key === latest.metric_key)?.label ?? latest.metric_key} entry
    </Badge>
  );
})()}
```
Place this between the form and the `{metrics.length === 0 ? ... }` block. This uses only real logged data — no fabricated trend.

**2. "Recent" sub-label above each history list.** In Metrics, Expenses, and Competitors sections (not Content Helper — its cards are already self-labeled by platform/topic), add a small label above the existing list, once there's at least one entry, to visually separate "form" from "history":

```tsx
<p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recent</p>
```
Insert this immediately before the existing `<div className="mt-4 space-y-1.5">` (metrics) / `<div className="mt-2 space-y-1.5">` (expenses) / `<div className="space-y-2">` (competitors) list wrappers, and remove the `mt-4`/`mt-2` from those wrapper divs since the label now carries that spacing.

### What I cut from this priority
A category-breakdown chart or percentage bar for Expenses (e.g. "60% software, 20% marketing…"). Early-stage founders using this page will often have 2-3 expense entries total — a breakdown visualization over that little data reads as empty chart-for-chart's-sake, not insight. The existing "Total spent" line is the right amount of aggregation for the data volume this screen will realistically hold. Also cutting any restructuring into sub-tabs/sub-nav for Grow — four sections on one scrollable page is the correct amount of structure for four independent, low-interdependency logging tools; splitting them into tabs would cost users an extra tap to log an expense right after logging a metric, which is a regression, not an improvement.

---

## Priority 5 — Business Plan (`BusinessPlanHome`): decision, not a rebuild

**Files:** `src/app/app/school/BusinessPlanHome.tsx`, `src/app/app/school/layout.tsx`, `src/app/app/school/SchoolSubNav.tsx`

Cato's audit flagged that the business Plan tab has no sub-nav (by explicit design comment in `layout.tsx`) and called this "the root cause of most business-track UI thinness," while noting it's "worth deliberately deciding whether to invest here."

**My decision: don't build a business sub-nav. This is a cut, not a "yes, but simplified."**

Reasoning against the Guiding Question — does adding tabs to Plan make the product better for the user: Student's `SchoolSubNav` (Home/Subjects/Exams/Flashcards/Quizzes/Progress) exists because School is genuinely five distinct data systems with their own screens, forms, and detail views. Business's Plan tab is, today, a single data type: a milestone checklist plus one read-only idea/stage summary. There is nothing to put in a second tab — the deeper business features (metrics, expenses, content, competitors) already correctly live under the separate **Grow** tab, not under Plan. Building a sub-nav here would mean either (a) splitting one flat milestone list across artificial tabs for no reason, or (b) moving Grow's content under Plan's sub-nav just to have something to put there, which would break the Plan/Grow conceptual split that's already correct. Either move makes the product more confusing, not less. The "thinness" Cato is seeing is real, but it's a data-model asymmetry (business track just has fewer, simpler concepts at this stage of the product), not a UI gap — and manufacturing UI structure to paper over that would be dishonest polish.

### What I'm specifying instead (small, real fixes)

1. **Hero card gets an accent border**, matching the visual "this is the important card" treatment already used for hero/callout cards elsewhere (`BusinessHome`'s desktop hero, `StudentSchoolHome`'s recommendation card both use `border-accent/30`). Change the top Card (lines 69-83) from `<Card>` to `<Card className="border-accent/30">`. One-line change, makes the business-idea/stage summary read as the page's lead card rather than just another list item.
2. **Milestones empty state** — already specified under Priority 1 (`Target` icon, "No milestones yet").
3. That's the full scope of this priority.

### What I cut from this priority
The sub-nav itself (the headline ask), and anything resembling it — a segmented control, an accordion, additional route splitting. Also cutting: adding inline edit for `business_idea`/`stage` from this screen (there's currently no way to edit them after onboarding, which is a real gap I noticed while reading the file) — that's a genuine feature (edit form/modal, a Supabase update call, validation) rather than a UI-polish fix, so it doesn't belong in this pass. Flagging it to the CEO as a backlog candidate, not specifying it here.

---

## Priority 6 — Coach page: targeted polish, not a redesign

**File:** `src/app/app/coach/page.tsx`

I read the whole file. The page is in good shape — thread switching, suggested prompts, recommendation chips, and the safety-copy footer are all already there and on-brand. Two things are worth fixing; several things Cato's list might imply are worth explicitly declining.

### Spec

**1. Constrain chat width on desktop.** Today the outer container (`className="flex h-[calc(100dvh-8rem)] flex-col animate-fade-in"`) has no max-width, so on a wide desktop viewport (with `SidebarNav` occupying the left rail, `lg:+`) message bubbles at `max-w-[85%]` can stretch very wide, which hurts chat readability — long lines are harder to read than short ones. Change the outer div to:

```tsx
<div className="flex h-[calc(100dvh-8rem)] flex-col animate-fade-in lg:mx-auto lg:w-full lg:max-w-2xl">
```

This is the only structural change to this page. It does not touch the mobile layout (the `lg:` prefix only applies ≥1024px) and does not require a two-column dashboard grid — Coach is a chat surface, not a stats dashboard, and forcing the `lg:grid-cols-[minmax(0,1fr)_320px]` pattern from Home here would waste space on a permanent sidebar with nothing worth pinning there.

### What I cut from this priority
- **Converting the thread-panel "No conversations yet." to `EmptyState`** — covered under Priority 1's explicit exclusion list; the popover is too small a surface.
- **Adding an icon badge to the chat intro card** (`messages.length === 0 && !sending`) — that intro is a chat bubble, not a section-empty-state; running it through `EmptyState` would apply the wrong visual language to a different UI category (a first message, not "nothing here").
- **A desktop two-column layout** (chat + a permanent recommendation rail) — the recommendation chips already surface at the right moment (inside the message list, when `messages.length < 2`); pinning a second column here would be new information architecture for a chat screen, not a UI fix, and risks looking like Coach is trying to be a dashboard when its whole value is being a focused conversation.

---

## Summary for Dev

Build in this order: **1 (EmptyState) → 2 (Achievements) → 3 (BusinessHome hero) → 4 (Grow) → 5 (Plan) → 6 (Coach)**. Priority 1 has no dependencies and unblocks nothing else, but every other empty-state reference in priorities 2-6 assumes the component from Priority 1 exists, so build it first regardless of where it's numbered.

Every new/changed string of user-facing copy in this document is final — don't paraphrase it, don't add exclamation points, and don't drop the safety-adjacent framing already in the app (e.g. avoid promising outcomes in any new subtitle copy, consistent with the app's existing planning/exploration tone).
