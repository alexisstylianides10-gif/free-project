# DEADLINES SPEC — Deadlines Initiative

Author: Product. Source: Cato's feature pick + rough shape (see `PROJECT_STATE.md`, "Deadlines initiative" section, top of file). Every file referenced below was read in full before writing this spec — the same rigor `PRODUCT_SPECS.md` was held to for the UI initiative. No layout, copy, threshold, or component choice here is a guess Dev has to resolve.

Ground rules I'm holding myself to (same as last time):
- No new design tokens, no new components beyond one small shared lib file. `Badge` (`danger`/`warning`/`success`/`neutral`), `Card`, `Button` (`outline` variant), `EmptyState`, `ScreenHeader`, `LoadingScreen` — all already exist and are reused as-is.
- No new tables, columns, API routes, or AI calls — confirmed against `src/lib/hooks/domain.ts` and `src/lib/types.ts`, both read in full.
- Where I think part of Cato's rough shape needs a precision fix or should be cut, I say so explicitly under "What I decided / cut" — not silently.

---

## 0. New shared lib: `src/lib/deadlines.ts`

This is the one new file. It holds the union type and the grouping/urgency logic so the three touch-points (new page, `BusinessPlanHome.tsx`, `BusinessHome.tsx`) all compute urgency identically — no duplicated date math.

```ts
import { daysBetween, todayISO } from "@/lib/utils";

export type DeadlineSource = "exam" | "homework" | "milestone";

export interface DeadlineItem {
  id: string;
  source: DeadlineSource;
  title: string; // exam: "{subject} Exam" · homework: subject · milestone: title
  subtitle?: string; // exam: title (if it differs from subject) · homework: title · milestone: description
  dueDate: string; // ISO date (YYYY-MM-DD) — always present; items without one never become a DeadlineItem
  href: string; // tap-through destination (the source list page — see §2)
}

export type UrgencyBucket = "overdue" | "today" | "this-week" | "later";

export const BUCKET_ORDER: UrgencyBucket[] = ["overdue", "today", "this-week", "later"];

export const BUCKET_LABEL: Record<UrgencyBucket, string> = {
  overdue: "Overdue",
  today: "Today",
  "this-week": "This week",
  later: "Later",
};

/** Overdue: due date before today. Today: due today. This week: due in the
 * next 1-7 days inclusive. Later: due in 8+ days. */
export function bucketForDate(dueDateISO: string, referenceTodayISO: string = todayISO()): UrgencyBucket {
  const diff = daysBetween(referenceTodayISO, dueDateISO);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 7) return "this-week";
  return "later";
}

/** Only ever danger/warning/success — the 3 urgency tones Badge already
 * supports, per Cato's brief. Overdue and Today share "danger" (both need
 * action now); This week is "warning"; Later is "success" (nothing urgent
 * yet — reads as "you're fine," consistent with how BusinessGrowHome's
 * trend badge already uses success for a good state, not just "done"). */
export function badgeToneForBucket(bucket: UrgencyBucket): "danger" | "warning" | "success" {
  if (bucket === "overdue" || bucket === "today") return "danger";
  if (bucket === "this-week") return "warning";
  return "success";
}

export interface DeadlineGroup {
  bucket: UrgencyBucket;
  label: string;
  items: DeadlineItem[];
}

/** Groups + sorts a flat list of DeadlineItems into the 4 urgency buckets,
 * soonest-first within each bucket. Buckets with zero items are omitted
 * entirely — the page never renders an "Overdue" heading with nothing
 * under it. */
export function groupDeadlines(items: DeadlineItem[]): DeadlineGroup[] {
  const sorted = [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return BUCKET_ORDER.map((bucket) => ({
    bucket,
    label: BUCKET_LABEL[bucket],
    items: sorted.filter((item) => bucketForDate(item.dueDate) === bucket),
  })).filter((group) => group.items.length > 0);
}
```

---

## 1. Milestone due dates — `src/app/app/school/BusinessPlanHome.tsx`

**Field type:** native `<input type="date">`. There is no date-picker library anywhere in this codebase (grepped — zero hits for `type="date"` or any date-picker import before this change) and no precedent to follow other than "plain native inputs styled with the app's own pill classes," which is exactly what the existing milestone-title `<input>` already does two lines below. Introducing a picker library for one field would be a new dependency for a single input — not justified.

**Validation:** fully optional, no min/max. A founder may legitimately want to backfill a milestone that's already overdue (e.g. "should have shipped 2 weeks ago") — blocking past dates would fight a real use case for no benefit. `due_date` is written as `null` when left blank, exactly matching the column's existing nullable type.

**Exact placement:** a second row under the existing title-input row (not squeezed into the same row — at 390px mobile width, cramming a text input + date input + submit button into one row leaves the text input uncomfortably narrow; a stacked layout is cleaner and still a single, obviously-one-form unit).

### Diff — state

```tsx
const [newTitle, setNewTitle] = useState("");
const [newDueDate, setNewDueDate] = useState(""); // NEW
const [adding, setAdding] = useState(false);
```

### Diff — `addMilestone`

```tsx
async function addMilestone(e: React.FormEvent) {
  e.preventDefault();
  if (!supabase || !user || !newTitle.trim() || adding) return;
  setAdding(true);
  try {
    await supabase.from("business_milestones").insert({
      user_id: user.id,
      title: newTitle.trim(),
      status: "todo",
      order_index: milestones.length,
      due_date: newDueDate || null, // NEW
    });
    setNewTitle("");
    setNewDueDate(""); // NEW
    await refetchMilestones();
  } finally {
    setAdding(false);
  }
}
```

### Diff — imports

```tsx
import { CheckCircle2, Circle, Sparkles, Target, Plus, CalendarClock } from "lucide-react"; // + CalendarClock
import { cn, formatCountdown } from "@/lib/utils"; // + formatCountdown
import { bucketForDate, badgeToneForBucket } from "@/lib/deadlines"; // NEW
```

### Diff — form JSX

Before:
```tsx
<form onSubmit={addMilestone} className="mt-3 flex items-center gap-2">
  <input ... />
  <button type="submit" ...><Plus className="h-4 w-4" /></button>
</form>
```

After:
```tsx
<form onSubmit={addMilestone} className="mt-3 space-y-2">
  <div className="flex items-center gap-2">
    <input
      value={newTitle}
      onChange={(e) => setNewTitle(e.target.value)}
      placeholder="Add a milestone…"
      className="h-11 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
    />
    <button
      type="submit"
      disabled={adding || !newTitle.trim()}
      aria-label="Add milestone"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-white shadow-glow-accent transition-opacity disabled:opacity-40"
    >
      <Plus className="h-4 w-4" />
    </button>
  </div>
  <div className="flex items-center gap-2 pl-1">
    <CalendarClock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    <label htmlFor="milestone-due-date" className="text-xs text-muted-foreground">
      Due date <span className="text-muted-foreground/60">(optional)</span>
    </label>
    <input
      id="milestone-due-date"
      type="date"
      value={newDueDate}
      onChange={(e) => setNewDueDate(e.target.value)}
      className="h-8 rounded-full border border-border bg-surface px-3 text-xs text-foreground outline-none focus:border-accent/60"
    />
  </div>
</form>
```

### Diff — milestone card gets a due-date badge when set

Only shown for **not-done** milestones — a completed milestone showing a red "Passed" badge would read as a bug, not a feature (the work is done; the date is irrelevant now).

Before:
```tsx
<div className="min-w-0 flex-1">
  <p className={cn("truncate text-sm font-semibold text-foreground", isDone && "text-muted-foreground line-through")}>
    {m.title}
  </p>
  {m.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{m.description}</p>}
</div>
```

After:
```tsx
<div className="min-w-0 flex-1">
  <p className={cn("truncate text-sm font-semibold text-foreground", isDone && "text-muted-foreground line-through")}>
    {m.title}
  </p>
  {m.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{m.description}</p>}
  {m.due_date && !isDone && (
    <Badge tone={badgeToneForBucket(bucketForDate(m.due_date))} className="mt-1.5">
      {formatCountdown(m.due_date)}
    </Badge>
  )}
</div>
```

`Badge` is already imported in this file (line 14). This is the fix for the gap Cato flagged: `business_milestones.due_date` goes from a structurally-dead column to a fully wired field — set on the add form, read on the card, read on Home, read on the new Deadlines page.

---

## 2. The new route — `src/app/app/deadlines/page.tsx`

Single `page.tsx`, no local `layout.tsx` — exactly the `weekly-review` precedent (`src/app/app/weekly-review/page.tsx` has no local layout either; both inherit `AppLayout`'s `SidebarNav`/`BottomNav`/`TopBar` shell). No back button — `weekly-review` doesn't have one either; navigation is via the persistent nav shell, and `TopBar`'s title falls back to "Overview" for any route that doesn't match a tab (confirmed in `TopBar.tsx`: `activeTab?.label ?? "Overview"`), same as it already does for weekly-review.

### Grouping thresholds (exact date math)

Using `daysBetween(today, dueDate)`:
- **Overdue**: `diff < 0`
- **Today**: `diff === 0`
- **This week**: `1 <= diff <= 7`
- **Later**: `diff > 7`

### Source data, exactly

- Student (`profile.track === "student"`): `useExams(user?.id)` + `useHomework(user?.id)`, `useBusinessMilestones(undefined)` (hook skips the query entirely when `userId` is `undefined` — confirmed in `useTableRows.ts`, so business-track users incur zero milestone query cost and vice versa, not just an unused result).
  - **Exams**: `exams.filter(e => daysBetween(today, e.exam_date) >= 0)` — see "What I decided / cut" below for why this deviates from Cato's literal "all exams."
  - **Homework**: `homework.filter(h => h.status === "pending")` — exactly as Cato specified.
- Business (`profile.track === "business"`): `useBusinessMilestones(user?.id)`, exams/homework hooks called with `undefined`.
  - **Milestones**: `milestones.filter(m => m.due_date != null && m.status !== "done")` — exactly as Cato specified.

### What renders per item

Each `DeadlineItem` renders as a tappable `Card` row (`Link` wrapping `Card`, plain — no hover-lift transform; that treatment is reserved for Home's dashboard tiles, not scrolling list rows, matching how `BusinessPlanHome`'s milestone cards and `StudentSchoolHome`'s homework cards already behave):

- A 36px circular icon badge (`bg-muted`) with the **source icon** — reused, not invented: `CalendarClock` for exams (already the exam icon on `StudentHome` and `ExamsPage`'s empty state), `ClipboardList` for homework (already the homework icon on `StudentHome`'s tile), `Target` for milestones (already the milestone icon on `BusinessPlanHome`/`BusinessHome`).
- Title (truncated, bold) + subtitle (truncated, muted) if present.
- Two stacked `Badge`s on the trailing edge: a neutral **source label** ("Exam" / "Homework" / "Milestone") so a mixed list is scannable at a glance, and the **urgency-toned countdown** (`formatCountdown(item.dueDate)`, tone from `badgeToneForBucket(group.bucket)` — using the group's bucket rather than recomputing per-item keeps the badge always in sync with the heading it's rendered under, including if the tab stays open across midnight).

**Actionable or read-only:** read-only, with tap-through. Tapping a row navigates to the item's source list page (`href`) — not to a per-item detail view, because none exists for any of the three types (confirmed: no `/exams/[id]`, no homework detail route, no `/milestones/[id]` — homework and milestones are both managed inline on their list pages). No complete/toggle/edit action lives on this page itself. See "What I decided / cut" for why.

| Source | `href` |
|---|---|
| exam | `/app/school/exams` |
| homework | `/app/school` (homework list lives inline on `StudentSchoolHome`) |
| milestone | `/app/school` (`BusinessPlanHome`) |

### Empty states — exact, and deliberately different per cause (see §3)

### Full page code

```tsx
"use client";

import Link from "next/link";
import { CalendarClock, ClipboardList, Target, CalendarCheck2, type LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useHomework, useExams, useBusinessMilestones } from "@/lib/hooks/domain";
import { formatCountdown, todayISO, daysBetween } from "@/lib/utils";
import { groupDeadlines, badgeToneForBucket, type DeadlineItem, type DeadlineSource } from "@/lib/deadlines";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const SOURCE_ICON: Record<DeadlineSource, LucideIcon> = {
  exam: CalendarClock,
  homework: ClipboardList,
  milestone: Target,
};

const SOURCE_LABEL: Record<DeadlineSource, string> = {
  exam: "Exam",
  homework: "Homework",
  milestone: "Milestone",
};

export default function DeadlinesPage() {
  const { user, profile } = useAuth();
  const isBusiness = profile?.track === "business";
  const today = todayISO();

  const { data: exams, loading: examsLoading } = useExams(isBusiness ? undefined : user?.id);
  const { data: homework, loading: homeworkLoading } = useHomework(isBusiness ? undefined : user?.id);
  const { data: milestones, loading: milestonesLoading } = useBusinessMilestones(isBusiness ? user?.id : undefined);

  const loading = isBusiness ? milestonesLoading : examsLoading || homeworkLoading;

  const items: DeadlineItem[] = useMemo(() => {
    if (isBusiness) {
      return milestones
        .filter((m) => m.due_date != null && m.status !== "done")
        .map((m) => ({
          id: m.id,
          source: "milestone" as const,
          title: m.title,
          subtitle: m.description ?? undefined,
          dueDate: m.due_date as string,
          href: "/app/school",
        }));
    }
    return [
      ...exams
        .filter((e) => daysBetween(today, e.exam_date) >= 0)
        .map((e) => ({
          id: e.id,
          source: "exam" as const,
          title: `${e.subject} Exam`,
          subtitle: e.title !== e.subject ? e.title : undefined,
          dueDate: e.exam_date,
          href: "/app/school/exams",
        })),
      ...homework
        .filter((h) => h.status === "pending")
        .map((h) => ({
          id: h.id,
          source: "homework" as const,
          title: h.subject,
          subtitle: h.title,
          dueDate: h.due_date,
          href: "/app/school",
        })),
    ];
  }, [isBusiness, exams, homework, milestones, today]);

  const groups = useMemo(() => groupDeadlines(items), [items]);
  const hasAnySourceData = isBusiness ? milestones.length > 0 : exams.length > 0 || homework.length > 0;

  return (
    <div className="space-y-7 pb-4 animate-fade-in">
      <ScreenHeader title="Deadlines" subtitle="Everything with a due date, in one place." />

      {loading ? (
        <LoadingScreen message="Gathering your deadlines…" fullScreen={false} />
      ) : groups.length === 0 ? (
        isBusiness ? (
          hasAnySourceData ? (
            <EmptyState
              icon={CalendarCheck2}
              title="No milestones with a due date"
              subtitle="Set a due date when you add a milestone in Plan to see it here."
              cta={{ label: "Go to Plan", href: "/app/school" }}
            />
          ) : (
            <EmptyState
              icon={Target}
              title="No milestones yet"
              subtitle="Add your first milestone in Plan to start tracking deadlines."
              cta={{ label: "Go to Plan", href: "/app/school" }}
            />
          )
        ) : (
          <EmptyState
            icon={CalendarCheck2}
            title="Nothing due"
            subtitle="Add exams and homework in School to see them here."
            cta={{ label: "Go to School", href: "/app/school" }}
          />
        )
      ) : (
        groups.map((group) => (
          <section key={group.bucket}>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{group.label}</h2>
              <span className="text-xs font-semibold text-muted-foreground">{group.items.length}</span>
            </div>
            <div className="space-y-2">
              {group.items.map((item) => {
                const SourceIcon = SOURCE_ICON[item.source];
                return (
                  <Link href={item.href} key={`${item.source}-${item.id}`} className="block">
                    <Card>
                      <CardContent className="flex items-center gap-3 p-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                          <SourceIcon className="h-4 w-4 text-muted-foreground" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                          {item.subtitle && <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge tone="neutral">{SOURCE_LABEL[item.source]}</Badge>
                          <Badge tone={badgeToneForBucket(group.bucket)}>{formatCountdown(item.dueDate)}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
```

---

## 3. Cross-track empty-state behavior (exact copy)

This needed more than one empty state because "zero results" means two structurally different things on the business track, and conflating them would actively mislead a founder.

| Scenario | Condition | Icon | Title | Subtitle | CTA |
|---|---|---|---|---|---|
| Student, zero exams and zero pending homework | `groups.length === 0` on student track | `CalendarCheck2` | "Nothing due" | "Add exams and homework in School to see them here." | Go to School → `/app/school` |
| Business, zero milestones at all | `groups.length === 0`, `milestones.length === 0` | `Target` | "No milestones yet" | "Add your first milestone in Plan to start tracking deadlines." | Go to Plan → `/app/school` |
| Business, milestones exist but none have a due date set (or all dated ones are done) | `groups.length === 0`, `milestones.length > 0` | `CalendarCheck2` | "No milestones with a due date" | "Set a due date when you add a milestone in Plan to see it here." | Go to Plan → `/app/school` |

The third row is the one that matters most operationally: **it will be the common state immediately after this ships**, since every existing milestone in production today has `due_date = null` (that's the whole gap Cato identified). If I collapsed this into the same "No milestones yet" copy, a founder with 5 real, active milestones would be told there are none — false and confusing. If I used "Nothing due" (the student-track copy), it would read as "you're all caught up," which is also false — they have milestones, they just never dated them. The copy has to name the actual cause (no due dates set) and point at the actual fix (set one when adding — or, since editing existing ones isn't in scope this pass, add a new dated milestone).

---

## 4. Home touch-points

Both changes are additive content **inside existing grid cells only** — no new `lg:col-start`/`lg:row-start` assignment on either page, and no cell is resized or reordered. This is the exact defensiveness Cato's note asked for: the CSS Grid bug QA caught last time came from a cell getting `col-start` without `row-start`; I'm avoiding the whole class of bug by never introducing a new grid cell at all.

### `src/app/app/StudentHome.tsx`

1. **Entry point**: append a "View all deadlines" outline button below the existing exam/homework tile pair, inside the same `lg:col-start-1 lg:row-start-2` section (the section wrapper's `grid grid-cols-2 gap-3` moves onto an inner `<div>` so the new link can sit full-width below the two tiles, not as a lopsided third grid cell).
2. **Urgency tint**: the existing countdown line in each tile (`formatCountdown(...)`) turns bold + `text-danger` when the item is overdue or due today; unchanged (`text-muted-foreground`) otherwise. This is the "closes the loop" moment Cato's brief called out — a student with 3 overdue homework items currently sees the exact same gray text as a student with nothing due; this fixes that specifically on the one nearest item Home already surfaces, without touching anything structural.

New local helper (top of component, near `greeting()`):
```tsx
import { bucketForDate } from "@/lib/deadlines"; // NEW import

function isUrgent(dateISO: string): boolean {
  const bucket = bucketForDate(dateISO);
  return bucket === "overdue" || bucket === "today";
}
```

Add to imports: `import { Button } from "@/components/ui/Button";` (not currently imported in this file).

Exact replacement of the tile section:

```tsx
<section className="lg:col-start-1 lg:row-start-2">
  <div className="grid grid-cols-2 gap-3">
    <Link href="/app/school">
      <Card className={cn("h-full", HOVER_LIFT)}>
        <CardContent className="p-4">
          <CalendarClock className="h-5 w-5 text-school" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upcoming exam</p>
          {nextExam ? (
            <>
              <p className="mt-1 truncate text-sm font-bold text-foreground">{nextExam.subject}</p>
              <p className={cn("text-xs", isUrgent(nextExam.exam_date) ? "font-semibold text-danger" : "text-muted-foreground")}>
                {formatCountdown(nextExam.exam_date)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No exams yet</p>
          )}
        </CardContent>
      </Card>
    </Link>

    <Link href="/app/school">
      <Card className={cn("h-full", HOVER_LIFT)}>
        <CardContent className="p-4">
          <ClipboardList className="h-5 w-5 text-accent" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Homework due</p>
          {nextHomework ? (
            <>
              <p className="mt-1 flex items-center gap-1.5 truncate text-sm font-bold text-foreground">
                <PriorityDot priority={nextHomework.priority} />
                {nextHomework.subject}
              </p>
              <p className={cn("text-xs", isUrgent(nextHomework.due_date) ? "font-semibold text-danger" : "text-muted-foreground")}>
                {formatCountdown(nextHomework.due_date)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">All caught up</p>
          )}
        </CardContent>
      </Card>
    </Link>
  </div>

  <Link href="/app/deadlines" className="mt-2 block">
    <Button variant="outline" size="md" className="w-full">
      View all deadlines
      <ChevronRight className="h-3.5 w-3.5" />
    </Button>
  </Link>
</section>
```

### `src/app/app/BusinessHome.tsx`

Same principle, adapted: business Home has no equivalent unlabeled 2-tile block, so the entry point and urgency badges both live inside the existing "Do this next" section (`lg:col-start-1 lg:row-start-2`), which is the section that already surfaces milestones.

1. **Entry point**: append the same outline "View all deadlines" button at the end of the section, **outside** the `{!doNext ? (...) : (...)}` branch so it renders in every state — no milestones, all-done, and normal — because the Deadlines page should always be reachable regardless of milestone state.
2. **Due-date badges**: the `doNext` hero card and each `restMilestones` row card get a `badgeToneForBucket`-toned `Badge` with `formatCountdown(m.due_date)` when `m.due_date` is set (most won't be, right after this ships — see §3 — so this will often render nothing, which is correct and not a bug).

Add to imports: `import { Badge } from "@/components/ui/Badge";`, `import { Button } from "@/components/ui/Button";`, `import { badgeToneForBucket, bucketForDate } from "@/lib/deadlines";`, and change `import { cn } from "@/lib/utils";` to `import { cn, formatCountdown } from "@/lib/utils";`.

Exact replacement of the "Do this next" section body (header unchanged):

```tsx
{!doNext ? (
  milestones.length === 0 ? (
    <EmptyState
      icon={Target}
      title="No milestones yet"
      subtitle="Add milestones in Plan to see what's next."
      cta={{ label: "Go to Plan", href: "/app/school" }}
    />
  ) : (
    <EmptyState
      icon={CheckCircle2}
      title="All caught up"
      subtitle="Every milestone is done — add a new one in Plan."
      cta={{ label: "Go to Plan", href: "/app/school" }}
    />
  )
) : (
  <>
    <Card className="border-accent/30">
      <CardContent className="flex gap-3 p-4">
        {doNext.status === "in_progress" ? (
          <Flame className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        ) : (
          <Circle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">{doNext.title}</p>
          {doNext.description && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{doNext.description}</p>}
          {doNext.due_date && (
            <Badge tone={badgeToneForBucket(bucketForDate(doNext.due_date))} className="mt-2">
              {formatCountdown(doNext.due_date)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>

    {restMilestones.length > 0 && (
      <div className="mt-2 space-y-2">
        {restMilestones.map((m) => (
          <Card key={m.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{m.title}</span>
              {m.due_date && (
                <Badge tone={badgeToneForBucket(bucketForDate(m.due_date))} className="shrink-0">
                  {formatCountdown(m.due_date)}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    )}
  </>
)}

<Link href="/app/deadlines" className="mt-2 block">
  <Button variant="outline" size="md" className="w-full">
    View all deadlines
    <ChevronRight className="h-3.5 w-3.5" />
  </Button>
</Link>
```

(The last `Link`/`Button` sits directly under the closing `)}` of the `{!doNext ? ... : ...}` expression, still inside the same `<section className="lg:col-start-1 lg:row-start-2">`.)

---

## 5. Data fetching — confirmed hook names/shapes

Read `src/lib/hooks/domain.ts` in full. Exact signatures used:

```ts
useExams(userId?: string) // -> { data: Exam[], loading, error, refetch }, ordered by exam_date asc
useHomework(userId?: string) // -> { data: Homework[], ... }, ordered by due_date asc
useBusinessMilestones(userId?: string) // -> { data: BusinessMilestone[], ... }, ordered by order_index asc
```

All three are `useTableRows<T>()` wrappers — confirmed in `src/lib/hooks/useTableRows.ts` that passing `userId: undefined` skips the Supabase query entirely (`if (!supabase || !userId) { setData([]); setLoading(false); return; }`), which is what makes it safe/cheap to call all three hooks unconditionally in the new page and simply pass `undefined` for the track that doesn't apply.

Relevant type shapes (from `src/lib/types.ts`, unchanged, no migration needed):
```ts
interface Exam { id, user_id, subject, title, exam_date: string, study_subject_id, created_at }
interface Homework { id, user_id, subject, title, due_date: string, priority, status: "pending" | "completed", created_at }
interface BusinessMilestone { id, user_id, title, description: string | null, status: "todo" | "in_progress" | "done", due_date: string | null, order_index, created_at }
```

The union type Dev should use everywhere is `DeadlineItem` from `src/lib/deadlines.ts` (§0) — `exam_date`/`due_date`(homework)/`due_date`(milestone) all normalize to the single `dueDate: string` field before anything renders, so no component downstream of the mapping ever needs to know which of the three source shapes it came from.

---

## What I decided / cut

**Decided (deviations from Cato's literal rough shape, made explicitly, not silently):**

1. **Exams are filtered to `exam_date >= today`, not "all" as Cato's rough shape said.** An exam that has already happened doesn't have an "overdue" state the way homework or a milestone does — "overdue" implies "you can still act on this, just late," and you cannot retroactively take an exam. Showing a passed exam in a permanent red "Overdue" bucket would be a bug-shaped feature: technically matches the literal instruction, wrong for the user. Homework and milestones keep their genuine overdue semantics (`status === "pending"` / `status !== "done"`) because those really can still be completed late.
2. **Two different business empty states, not one.** Cato's rough shape didn't specify copy; I split "no milestones at all" from "milestones exist but none are dated" because collapsing them would mean the empty state actively lies to a founder with real, active, undated milestones (see §3). This is the most important precision fix in this spec, because it's the state most business-track users will see on day one after ship.

**Cut (didn't clear the Guiding Question for this pass):**

1. **In-place actions on the Deadlines page** (mark homework done, toggle a milestone, anything other than tap-through). Cut because it's structurally inconsistent — exams have no completion concept at all, so a list where 2 of 3 row types get an inline action and the third can't would look broken, not helpful. It also extends past what Cato scoped ("no post-creation due-date editing") into "no in-place mutation of any kind" for a v1 that's explicitly meant to be a read-only lens over data users already manage elsewhere.
2. **Filter/sort controls** (by source, by track — track is moot, by date direction, etc.). A first-pass user will have a handful of open items, not hundreds; four urgency-grouped headings are already the sort. Filter chips over this little data would be exactly the "chart for chart's-sake" mistake Priority 4 of the last spec explicitly avoided for expense breakdowns — same reasoning applies here.
3. **Drag-to-reschedule / snooze.** Explicitly out per Cato's brief (no due-date editing after creation this pass) and there's no notification infra to "snooze" against anyway — a snooze with nothing on the other end to reschedule is UI theater.
4. **A due-date edit affordance on existing milestones.** Confirmed explicitly out of scope by Cato ("no post-creation due-date editing"). Flagging again here because it's the most obvious follow-up once this ships and founders start wanting to fix a date they mistyped — legitimate backlog candidate, not this pass.
5. **A "Deadlines" section header label on Home** (I considered adding a `<h2>Deadlines</h2>` above the entry-point button on both Home screens). Cut — the button's own copy ("View all deadlines") already carries that label; a redundant heading above a single button is dead weight, and skipping it keeps the diff smaller and further from touching the already-shipped, QA-signed-off Home layout.
6. **New nav tab.** Explicitly ruled out by Cato and the CEO's own scoping note in the brief — 5 tabs stays 5 tabs on both tracks (`src/lib/navTabs.ts` untouched).

---

## Files this spec touches (for Dev)

- **New:** `src/lib/deadlines.ts` (§0)
- **New:** `src/app/app/deadlines/page.tsx` (§2)
- **Edit:** `src/app/app/school/BusinessPlanHome.tsx` (§1 — due-date input + milestone card badge)
- **Edit:** `src/app/app/StudentHome.tsx` (§4 — entry point + urgency tint)
- **Edit:** `src/app/app/BusinessHome.tsx` (§4 — entry point + milestone badges)

No other files change. No migration, no new API route, no new `PaywallGate` usage (confirmed not wrapping the new route — this stays free-tier per Cato's explicit non-goal).
