# DEV AUDIT REPORT — full codebase pass

Date: 2026-08-28
Branch: `claude/futureos-student-app-3ewdz6` (worktree `agent-ae952817da8c30ad2`)
Base commit audited from: `26e9d89` (QA: live-data pass against production Supabase)

Scope: independent, code-only audit per the CEO brief ("check all the coding
behind it and if something fails or looks wrong, fix it automatically"),
running in parallel with QA's live-app pass and Product's UI redesign in
separate worktrees. This report covers source-code correctness only.

## Method

Went through the task's checklist in order: baseline tsc/build, ESLint, the
6 known bug classes from project history, dead-code sweep, API route error
handling (all 15 routes read in full), type-safety spot-check (`any` /
`@ts-ignore` grep), and RLS policy consistency in `supabase/schema.sql`.
Re-ran `npx tsc --noEmit` + `npx next build` after every change.

## 1. Baseline

- `npx tsc --noEmit`: clean before any changes, clean after.
- `npx next build`: clean before any changes (all 42 routes), clean after.
- `npm run lint` (`next lint`, config present at `eslint.config.mjs`): clean
  before and after — "No ESLint warnings or errors" both times.

## 2. Known bug classes — checked, all held except one dead-code item

- **`.upsert()` against `profiles`**: grepped every `.upsert(` call in
  `src/` (11 hits total) — none target `profiles`. Grepped every
  `.from("profiles")` call separately (21 hits) — all are `.insert()` or
  `.update()`, matching the documented constraint. No bug.
- **CSS Grid `col-start`/`row-start` pairing**: only `StudentHome.tsx` and
  `BusinessHome.tsx` use the grid-positioning pattern (grepped
  `col-start|row-start` across `src/`). Read both files in full — every grid
  item that has `lg:col-start-N` also has `lg:row-start-N`, including the
  conditionally-rendered ones (`mission &&`, `primaryCareer &&`,
  `businessProfile?.business_idea &&`). No bug.
- **Business onboarding option catalogs**: `BusinessOnboarding.tsx` imports
  and uses `BUSINESS_STRENGTH_OPTIONS`/`BUSINESS_GOAL_OPTIONS`/
  `BUSINESS_PROBLEM_OPTIONS`; `StudentOnboarding.tsx` imports and uses the
  plain `STRENGTH_OPTIONS`/`GOAL_OPTIONS`/`PROBLEM_OPTIONS`. Confirmed in
  `src/lib/catalog/onboarding-options.ts` that these are genuinely distinct
  option lists (different `key`s and `label`s), not aliases. No bug.
- **AI research route client timeouts**: `researchSchoolData` and
  `researchBusinessData` (`src/lib/onboarding/researchSchool.ts`,
  `researchBusiness.ts`) both call `authedFetch(..., 55000)` — 55s, matching
  the documented floor, not shrunk. No bug.
- **Billing columns written client-side**: grepped every reference to
  `plan`, `plan_status`, `trial_ends_at`, `stripe_customer_id`,
  `stripe_subscription_id` in `src/`. All writes are in
  `src/app/api/billing/webhook/route.ts` (via `supabaseServiceRole()`) and
  `src/app/api/billing/create-subscription/route.ts` (also via
  `supabaseServiceRole()`), both server routes. No client-side Supabase call
  writes any billing column. No bug. Also re-confirmed the
  `confirmation_secret` expand path (`expand: ["latest_invoice.confirmation_secret"]`)
  and the "only activate on `status === 'active'`" webhook logic are both
  still intact.
- **Dead `EmptyState` duplicate** (flagged as a follow-up in
  `PROJECT_STATE.md`'s UI-initiative history): confirmed
  `src/components/ui/EmptyState.tsx` was still present and still genuinely
  unimported anywhere (grepped both `ui/EmptyState` and the exact import
  path). **Fixed**: deleted the file. The real, in-use component is
  `src/components/shared/EmptyState.tsx` — untouched. Re-ran tsc/build after
  the delete: both clean, all 42 routes still compile.

## 3. Dead code sweep (beyond the flagged item)

Found 6 additional UI primitives with zero importers anywhere in `src/`:
`src/components/ui/FadeIn.tsx`, `Modal.tsx`, `Switch.tsx`, `Tabs.tsx`,
`Tooltip.tsx`, `Avatar.tsx` (confirmed via
`from "@/components/ui/(FadeIn|Modal|Switch|Tabs|Tooltip|Avatar)"` grep,
zero hits).

**Left alone, not deleted** — reasoning: unlike `ui/EmptyState.tsx`, these
aren't duplicates of an in-use component with a different prop shape (no
risk of a future dev importing the wrong one by mistake). They read as
standalone design-system primitives built ahead of a feature that would use
them (a `Modal`/`Tabs`/`Tooltip`/`Switch`/`Avatar` kit is a normal thing to
have on hand in a component library). Deleting working, harmless code on
spec here would be speculative — outside "fix what's broken," and risks
someone needing to rebuild one of these from scratch for the next feature
that needs a modal or a switch. Flagging to Cato/Product in case there's
a reason to prune the design-system surface deliberately, but not doing it
unilaterally.

No other dead files, no orphaned exports found in a spot-check of the rest
of `src/components/`.

## 4. Error handling — all 15 API routes read in full

`src/app/api/**/route.ts` (billing/webhook, billing/create-subscription,
billing/create-portal-session, coach, business/generate-content,
onboarding/research-school, onboarding/research-business,
study/generate-quiz, study/generate-plan, study/evaluate-answer,
study/generate-flashcards, study/generate-question, study/grade-quiz,
study/tutor, study/analyze-material) — every one:

- Wraps `req.json()` in try/catch → 400 on malformed body.
- Guards `ANTHROPIC_API_KEY`/`STRIPE_SECRET_KEY` presence → 503 before
  attempting the call (this is what prevents the "missing key looks like a
  timeout" failure mode called out in project history).
- Wraps the actual AI/Stripe call in try/catch → real error message, 502.
- Degrades sensibly on partial failure rather than crashing: e.g.
  `grade-quiz` falls back to local objective-grading when free-text AI
  grading throws (doesn't lose the whole submission); `analyze-material`
  sets `status: "failed"` on the material row so the UI can show a real
  failed state instead of hanging in "analyzing"; `generate-plan` deletes
  the orphaned `study_plans` row it just inserted if the `study_plan_items`
  insert fails, instead of leaving debris; `coach`'s auto-title generation
  failure is caught and silently skipped (correctly — it's a genuine
  nice-to-have, not core functionality, and the thread stays untitled
  rather than the whole reply failing).
- No silent swallow found anywhere that would mask a real failure from the
  end user (a caught error either returns a proper error `NextResponse`, or,
  for the one truly optional nice-to-have — coach thread auto-titling — is a
  documented, justified no-op).

One thing noted, not fixed: `src/app/api/coach/route.ts` lines 113-119
(`await Promise.all([chat_messages insert, chat_threads update])`) isn't
wrapped in try/catch. If it throws, Next.js's own unhandled-rejection
handling returns a generic 500 rather than a friendly message — this is a
real gap in polish but not a silent-failure bug (the client still sees a
clear error, not a hang or a false-success). Pre-existing, not touched by
any recent diff, low risk either way — left alone per the "don't go on a
refactoring spree" instruction; flagging in case Cato wants it wrapped for
consistency with the rest of the file.

## 5. Type safety spot-check

- `@ts-ignore` / `@ts-expect-error`: zero occurrences in `src/`.
- `: any`, `as any`, `<any>`, `any[]`: zero occurrences in `src/`.

This codebase has no type-safety escape hatches to evaluate — genuinely
clean on this axis, nothing to fix.

## 6. RLS / schema consistency (`supabase/schema.sql`, static read only)

All 29 `create table` definitions were cross-checked against their
policies. Every per-user table has a matching `..._all_own` policy
(`for all to authenticated using (user_id = auth.uid()) with check (user_id
= auth.uid())`), except `profiles` and `onboarding_responses`, which
intentionally use split select/insert/update policies instead of `for all`
— `profiles` because of the column-restricted billing grant (the one
documented case), `onboarding_responses` because it has no delete policy
(app never deletes onboarding responses, by design). Confirmed the only
`revoke`/`grant` statements touching column-level permissions in the whole
file target `profiles` (line 79-80) — no other table has a narrowed grant,
so `.upsert()` is safe everywhere except `profiles`, matching the documented
rule exactly.

**Caveat**: this worktree doesn't have live Supabase MCP access, so this
check is `schema.sql`-internal consistency only, not a live-vs-repo drift
check. QA's live-data pass (recorded in `PROJECT_STATE.md`, same day)
already did the live `pg_policies` comparison and found no drift — I have
no reason to re-flag that, just noting the boundary of what this pass
covered.

## 7. Other checks run, no findings

- `console.log`/`console.debug` leftovers: none in `src/`.
- `TODO`/`FIXME`/`XXX`/`HACK` markers: none in `src/`.
- `awardXP` usage: every "did something real" call site (homework complete
  in `StudentSchoolHome.tsx`, study session in `study/actions.ts`, mission
  complete in `actions/missions.ts`, milestone done in
  `BusinessPlanHome.tsx`, career page visit in `app/future/[slug]/page.tsx`)
  routes through the shared `awardXP`/`bumpSkills` functions in
  `src/lib/actions/xp.ts`. The only direct `xp_*`/`streak_count` writes
  outside that file are in `completeOnboarding.ts`/
  `completeBusinessOnboarding.ts`, which is correct — that's the one-time
  initial seed at account creation (`streak_count: 1`), not a repeatable
  "did something" action that needs the shared streak-continuation math.
- `track` write paths: only `src/app/choose-plan/page.tsx` writes
  `profiles.track`, pre-onboarding, matching the trigger's lock semantics.
  No other code path attempts to change it.
- `src/app/app/layout.tsx` gate: re-confirmed `loading || !user || !profile`
  blocks all `/app/*` children until `profile` resolves, so
  `deadlines/page.tsx`'s inline `profile?.track` branch (the one
  non-blocking pattern deviation QA noted previously) is still safe today —
  unchanged since that review.

## Summary of actual changes made

1. **Deleted** `src/components/ui/EmptyState.tsx` — dead duplicate,
   genuinely unimported, explicitly flagged as a follow-up in
   `PROJECT_STATE.md`. Verified with tsc/build before and after.

That is the only source change from this pass — everything else audited
came back clean. This is not a case of under-searching: every one of the
task's 7 checklist items was run against the actual current source, not
assumed from prior QA sign-offs (though where this pass's findings agree
with the last QA pass, e.g. the grid-safety invariant, that's stated
explicitly above rather than silently reused).

## Final verification

- `npx tsc --noEmit`: clean (exit 0).
- `npx next build`: clean (exit 0), all 42 routes compiled/prerendered,
  including `/app/deadlines`.
- `npm run lint`: clean, no warnings or errors.
