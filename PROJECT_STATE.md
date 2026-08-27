# PROJECT STATE

PROJECT: Alxioum (formerly FutureOS) — student/founder productivity app. Live production app, not greenfield.

GOAL: New-feature initiative. CEO brief this round: "make the agents work on a new feature they think is good" — no feature pre-decided by the CEO; the team picks it. This is a new initiative layered on top of the UI-improvement initiative below (which is complete and shipped) — that section is kept as history, not overwritten.

**Cato's feature pick for this initiative: Deadlines — a unified, cross-track upcoming-deadlines view (exams, homework, business milestones), free-tier, in-app only.** Full reasoning below. This is the CTO brief handed to Product next; Product should treat this as their spec input the same way they treated Cato's UI audit last time (see PRODUCT_SPECS.md for that precedent — Product should write a `PRODUCT_SPECS_DEADLINES.md` or equivalent, not overwrite the old one).

### Why this feature (Cato's reasoning)

**The gap:** Three different tables already carry due-date semantics — `exams.exam_date`, `homework.due_date`, `business_milestones.due_date` — but the product only ever surfaces the single *soonest* item, on Home, with no visual urgency treatment and no way to see the full list anywhere. Worse: `business_milestones.due_date` is a column that has existed in the schema since the business track shipped and is **never read or written by any UI in the codebase** — confirmed by reading `BusinessPlanHome.tsx` in full and grepping the repo. The add-milestone form only ever inserts `title`/`status`/`order_index`; there is no due-date input anywhere, so the column is structurally dead. That's not a hypothetical gap, it's a shipped half-feature.

Today, a student with 3 overdue homework items and an exam in 2 days sees exactly the same Home screen as a student with nothing due — only the single nearest exam and single nearest homework item render, both in the same neutral gray text as everything else on the page, "Passed" (overdue) included. A founder with 5 stale, past-due milestones has literally no way to know it — the column to track that isn't even wired to an input.

**Who it serves:** every user on both tracks, every day — this is the single most-checked kind of information in a productivity app ("what's due, what's late") and today the app under-serves it despite already storing the data. It's also low-friction to notice as missing, which makes it a credible next feature rather than a nice-to-have nobody asked for.

**Why now:** it directly follows the just-shipped UI initiative (EmptyState system, urgency-capable Badge tones `success`/`warning`/`danger` already exist in `globals.css`/`Badge.tsx`, `formatCountdown()` in `src/lib/utils.ts` already returns `"Passed"`/`"Today"`/`"Tomorrow"`/`"N days"`) — the primitives this feature needs are already in place from that pass, so build cost is low and consistency risk is near zero.

**Why this over the other candidates I weighed:**
- *Edit `business_idea`/`stage` after onboarding* — real gap, but single-field, single-track, low breadth. More a settings fix than a feature.
- *Data export (CSV) for founders' metrics/expenses* — real but niche (business-track only, power-user).
- *Coach conversation search/export* — real but narrow; thread history is already reachable via the existing thread popover, search is a nice-to-have on top of a working feature, not a missing one.
- *Achievements leaderboard* — **rejected, not just deprioritized.** A cross-user leaderboard breaks the app's entire data model: every table today is single-user RLS (`using (user_id = auth.uid())`), and a leaderboard requires an aggregate, other-users-visible query — a genuinely new RLS pattern, not a UI addition. It also raises an unaddressed privacy question for a student app whose users may be minors (surfacing names/ranks publicly). This is a multi-week, product-and-legal-reviewed initiative, not a one-pass feature — correctly out of scope per the brief's own sizing guidance.
- *Student study-time logging outside a formal session* — real but student-only and narrower in daily-use value than deadlines, which every user has by definition.

Deadlines wins on user value (both tracks, daily-relevant), architecture fit (reuses existing tables/hooks/design tokens, zero new RLS patterns, zero migrations), and scope (one pass, not a phase).

### Explicit non-goals for this pass
- **No push notifications, no email, no cron.** The environment has no email-sending infra (no Resend/SES in `package.json`) and Render `autoDeploy`/background jobs are already flagged as unreliable in this project's history — building a delivery pipeline is a separate, materially larger initiative (new provider, new secrets, new failure modes) and isn't what makes this gap painful today. In-app surfacing is the actual fix; "notifications" in the CEO's own gap list is being interpreted as in-app for this pass, not push/email.
- **No new database tables or columns.** `exams.exam_date`, `homework.due_date`, and `business_milestones.due_date` already exist and are sufficient. The only data-layer change is making the *existing, unused* `business_milestones.due_date` column actually settable from the UI (a form field addition, not a migration).
- **No new nav tab.** The app has exactly 5 nav tabs on both tracks (`src/lib/navTabs.ts`, `STUDENT_TABS`/`BUSINESS_TABS`, mirrored 1:1) — adding a 6th competes for scarce mobile bottom-nav space for a feature that doesn't need its own primary destination. Follow the existing precedent of `/app/weekly-review` and `/app/upgrade`: real routes, reachable by a link, not in the tab bar.
- **No editing of milestone due dates after creation** in this pass (set at creation only) — an edit affordance is a legitimate follow-up, not required for the core gap.
- **Not Plus-gated.** Every `PaywallGate`-wrapped route today is AI-generation-heavy (Study subsystem: subjects/quizzes/flashcards/progress/weak-topics, and Coach — confirmed via grep of all `PaywallGate` usages). Exams, homework, and Plan milestones are all free-tier CRUD today. Deadlines is a read-only lens over data users already own for free; gating it would be inconsistent with that pattern and would paywall core organizational value, not incremental AI value.
- **No redesign of Home.** The just-shipped, QA-signed-off `StudentHome.tsx`/`BusinessHome.tsx` are not being reopened for a layout rework. At most, Product may spec a small, additive touch (e.g. urgency-tinting the existing single-item tiles, or a "View all" link) — not a restructure.

### Rough shape (Product to turn into a full spec — this is not one)
- **New route:** `/app/deadlines` (or similarly named) — a single page, not a sub-app, listing every open item with a due date across the user's track, grouped by urgency (Overdue / Today / This week / Later), using the existing `Badge` `danger`/`warning`/`success` tones and `formatCountdown()`.
  - Student: merges `exams` (all) + `homework` (`status = 'pending'`) via the already-existing `useExams`/`useHomework` hooks — no new query, no new API route.
  - Business: `business_milestones` where `due_date is not null and status != 'done'`, via the already-existing `useBusinessMilestones` hook.
- **One small form change:** `BusinessPlanHome.tsx`'s add-milestone form gets an optional due-date input, and the insert call starts writing `due_date`. Each milestone card gets a due-date badge when set (reusing `formatCountdown`).
- **Minimal Home touch:** a "View all" link from the existing Home tiles into `/app/deadlines`, and/or urgency-tinting the existing single-item text when overdue/due-soon — Product's call on exact placement, but no structural Home change.
- **No new API routes, no new Supabase tables/migrations, no new AI calls.** This is a pure client-side aggregation + one form-field addition + one new page.

Pipeline from here: Product writes the full spec next (copy, exact layout, grouping thresholds, urgency-badge rules, the Home touch-point design) → Dev builds → QA reviews → Cato signs off, same as the UI initiative.

CURRENT TASK (Deadlines initiative): ✅ Dev's build complete, per `DEADLINES_SPEC.md` exactly — no deviations. New `src/lib/deadlines.ts` (shared `DeadlineItem`/bucketing/grouping helpers), new `src/app/app/deadlines/page.tsx` (no local layout/back button, matching `weekly-review/page.tsx`'s precedent; 3 distinct empty states per §3), `BusinessPlanHome.tsx` gets the optional due-date input + milestone card badge, `StudentHome.tsx`/`BusinessHome.tsx` get the "View all deadlines" button + urgency treatment purely as content inside existing grid cells (grepped: every `col-start` in both files still has an explicit paired `row-start`, no new grid item added). `npx tsc --noEmit` and `npx next build` both run directly and clean (42/42 routes, including new `/app/deadlines`). Committed, not pushed (Dev leaves push to CEO per instruction).

Spec summary: one new shared lib `src/lib/deadlines.ts` (union `DeadlineItem` type + urgency bucketing/grouping, shared by all 3 touch-points so date math isn't duplicated); one new route `src/app/app/deadlines/page.tsx` (no local layout, no back button — same shape as `weekly-review/page.tsx`); one form addition to `BusinessPlanHome.tsx` (optional native `<input type="date">` for milestone due date, second row under the title input, fully optional/no validation, plus a due-date badge on milestone cards); Home touch-points on both `StudentHome.tsx` (urgency-tints the existing exam/homework tile countdown text + adds a "View all deadlines" button) and `BusinessHome.tsx` (adds due-date badges to milestone cards + same "View all deadlines" button) — both changes append *inside* existing grid cells only, no new `lg:col-start`/`lg:row-start` assignment anywhere, specifically to avoid the CSS Grid subtlety QA caught last pass.

Two deliberate deviations from Cato's rough shape, called out explicitly in the spec's "What I decided / cut" section (not silent): (1) exams are filtered to `exam_date >= today` rather than "all," since a past exam has no genuine "overdue" state (you can't retroactively take it) — homework/milestones keep real overdue semantics since those can still be completed late; (2) business gets **two** distinct empty states (no milestones at all vs. milestones exist but none are dated) rather than one, because every existing milestone in production has `due_date = null` today — collapsing this into one empty state would tell a founder with real active milestones "nothing here," which is false. Cut for this pass: any in-place action on the Deadlines page itself (tap-through/read-only only — exams have no completion concept, so a partial inline-action list would be inconsistent), filter/sort controls (too little data at this stage to justify), drag-to-reschedule/snooze (no due-date editing after creation per Cato's brief, no notification infra to snooze against), and a redundant "Deadlines" section heading on Home (the button copy already carries it).

BLOCKERS (Deadlines initiative): None.

NEXT TASK (Deadlines initiative): QA reviews the Deadlines feature for regressions across both tracks and both themes before merge.

DEPLOYMENT STATUS (Deadlines initiative): 🟡 Built and committed locally, not yet pushed or deployed. Production is still running the UI-improvement initiative's shipped build (see below); unaffected until this branch is pushed and deployed.

---

## UI/UX IMPROVEMENT INITIATIVE (COMPLETE — history, not active)

GOAL: UI/UX improvement initiative on the existing live app. CEO brief: "Use the team to make Alxioum better, use Product to make the UI a lot better — fix it." Building is authorized now, not just planning. Scope: visual polish, consistency, and UX gaps in the existing screens — not new features, not a redesign of the architecture.

MVP: N/A — post-MVP, live app with paying users on two locked tracks (student, business).

FEATURES: Student track: Home, School (Subjects/Exams/Flashcards/Quizzes/Progress study system), Future (career matches + roadmap), Coach (AI chat), Profile (XP/achievements/skills). Business track: Home, Plan (milestones), Grow (metrics/expenses/content helper/competitors), Coach, Profile. Shared: onboarding + /choose-plan (track lock), Stripe billing + PaywallGate, missions, weekly review.

TECH STACK: Next.js 15 (App Router) + TypeScript + Tailwind. Supabase (Postgres + Auth). Stripe. Anthropic Claude API. Hosted on Render (https://alxioum-app.onrender.com). Design tokens via CSS custom properties in globals.css (dark-first, `.light` override class), gradient/glass utility classes, RadialStat/StatTile/Card/Badge/ProgressBar as the shared visual primitives.

ARCHITECTURE: Two product tracks (student, business) chosen once at /choose-plan and permanently locked by a Postgres trigger once onboarding_completed is true. Route-level branching pattern: shared routes (`/app`, `/app/school`, `/app/future`) render a track-specific component (e.g. `StudentHome`/`BusinessHome`, `StudentSchoolHome`/`BusinessPlanHome`, `StudentFutureHome`/`BusinessGrowHome`) chosen by `profile.track` in a thin page/layout wrapper. Coach and Profile are track-agnostic single implementations with inline conditional copy. Nav (SidebarNav desktop, BottomNav mobile) is driven by one shared `STUDENT_TABS`/`BUSINESS_TABS` table in `src/lib/navTabs.ts`. The student School tab has a real sub-app (SchoolSubNav: Home/Subjects/Exams/Flashcards/Quizzes/Progress); the business Plan tab is intentionally a single flat page with no sub-nav (by design, per code comment in `school/layout.tsx`) — this is the root cause of most business-track UI thinness identified below.

CURRENT TASK: ✅ COMPLETE — Cato final sign-off given. Re-ran `npx tsc --noEmit` and `npx next build` independently (both clean, all 41 routes) before push. Pushed cc8c4ed + 4286c07 to `claude/futureos-student-app-3ewdz6` and triggered a Render deploy. See QA REVIEW below for the full adversarial pass this was signed off on.

QA REVIEW (this pass, commit cc8c4ed reviewed against 91ac1e0):
- Read `git show cc8c4ed` in full (18 files, +226/-126) — not sampled.
- EmptyState adoption: spot-checked every one of the ~19-20 sites against PRODUCT_SPECS.md's table (copy, icon, CTA, bare/wrapped mode) — all match verbatim, including the deliberately-varied ones (exams: no CTA, correctly — the page genuinely has no add-exam control anywhere, confirmed by reading the whole file; weekly-review: Dev used `bare` mode though the spec row didn't say so explicitly — correct call, since that empty state is nested inside an existing Card/CardContent with a "Skills" heading above it, exactly the case `bare` exists for).
- Confirmed via grep that all 5 explicitly-excluded sites (StudentHome mini stat tiles, Coach thread popover, CountrySelect, quiz-results inline fallback, weak-topics inline text) are byte-for-byte untouched.
- Achievements: exactly the 5 named keys (`first_study_session`, `study_sessions_10`, `first_quiz`, `first_mock_exam`, `flashcards_mastered_20`) got `track: "student"`, the other 4 untouched; filter `ACHIEVEMENTS.filter((a) => !a.track || a.track === profile.track)` applied correctly in profile/page.tsx, `profile.track` confirmed in scope and guarded by the existing `if (!profile) return null`.
- CSS Grid bug class (the recurring `col-start`-without-`row-start` bug): grepped every `col-start` in StudentHome.tsx, BusinessHome.tsx, BusinessGrowHome.tsx, BusinessPlanHome.tsx — every grid item in both StudentHome and BusinessHome has both `col-start` and `row-start` explicitly set (BusinessGrowHome/BusinessPlanHome don't use the grid pattern at all). The diff didn't touch any grid-positioning classNames, only cell content. Built a static Tailwind-compiled render harness (real globals.css + tailwind.config, real classNames) and screenshotted StudentHome and BusinessHome at 390px/1280px, light/dark, with mission/primaryCareer/business_idea conditionally omitted (fresh-account scenarios) — no misaligned or wrong-row items in any combination; missing conditional cards leave an expected blank gap in their own pinned row, nothing shifts.
- No `.upsert()` against `profiles` anywhere in the diff (grepped) — the only `profiles`-adjacent upsert in the repo is pre-existing and against `business_profiles`, untouched by this task.
- No Supabase/migration files touched by this diff — track-lock/RLS/entitlement grants are out of scope for this pass and unaffected.
- Confirmed the pre-existing dead `src/components/ui/EmptyState.tsx` is genuinely unimported anywhere (grepped) — Dev's flag was accurate, left alone as agreed.
- `npx tsc --noEmit`: clean (exit 0), run directly, not taken on Dev's word.
- `npx next build`: clean (exit 0, all 41 routes compiled/prerendered), run directly.
- Mobile-safety check: Coach's only change is `lg:mx-auto lg:w-full lg:max-w-2xl` (confirmed single-line diff, no unprefixed touch). BusinessHome's RadialStat enlargement and milestones caption live entirely inside the `hidden ... lg:block` desktop-only hero card — zero mobile impact. BusinessPlanHome's `border-accent/30` and BusinessGrowHome's unprefixed Badge/"Recent" labels are intentionally cross-viewport (those pages have no separate mobile/desktop split to begin with) — rendered both at 390px via harness, no overflow/wrap/breakage.
- Verdict: no bugs found. This was a real adversarial pass, not a rubber stamp — full diff read, spec cross-referenced line-by-line, exclusions grepped, own tsc/build run, own Playwright renders across both themes/both viewports/multiple conditional-sibling combinations. QA sign-off given.

Full specs: see PRODUCT_SPECS.md at repo root.

COMPLETED TASKS: Full Alxioum build history (onboarding, School study system, Future/career matching, AI Coach, Profile, Stripe billing, student/business track split) — see prior task list, all marked complete. This audit is the first task of the new UI-improvement initiative.

BUGS: None found — QA ran a full adversarial pass on cc8c4ed (diff read in full, spec cross-referenced site-by-site, exclusions grepped, own tsc/build run, own Playwright renders) and found zero regressions. Notable code-quality/product issues (not blocking, not new — carried from Cato's original audit):
- ~~Profile page achievements grid ... not track-aware~~ FIXED this pass (Priority 2).
- ~~No shared `EmptyState` component exists~~ FIXED this pass (Priority 1) — new component at `src/components/shared/EmptyState.tsx`.
- Business track (Plan + Grow) is visually and structurally flatter than the student track by design/history, not oversight — partially addressed this pass (Priorities 3-5: hero ring parity, Grow trend badge/Recent labels, Plan hero accent border); Product explicitly decided against building a business sub-nav, so the deeper structural asymmetry remains by design, not oversight.
- Dev finding, not fixed this pass (out of spec scope): there is a pre-existing, unused `src/components/ui/EmptyState.tsx` with a different prop shape (`body`/`action` instead of `subtitle`/`cta`, no `bare` mode) that is not imported anywhere in the codebase. It now sits alongside the new `src/components/shared/EmptyState.tsx` this pass built per spec. Worth a follow-up to delete the dead `ui/EmptyState.tsx` so it doesn't get picked up by mistake later — flagging for Cato/QA rather than deleting it myself since PRODUCT_SPECS.md didn't mention it.

BLOCKERS: None. CEO has authorized building.

NEXT TASK: None open on this initiative. All 6 UI/UX priorities from PRODUCT_SPECS.md are implemented, QA-reviewed, and deployed. Remaining known gaps are intentionally deferred (see BUGS): the dead `ui/EmptyState.tsx` cleanup, and the business Plan/Grow structural asymmetry (a deliberate Product decision, not a bug).

DEPLOYMENT STATUS: 🟡 Deploying — pushed to `claude/futureos-student-app-3ewdz6` and triggered on Render; confirming live at https://alxioum-app.onrender.com once the build finishes.
