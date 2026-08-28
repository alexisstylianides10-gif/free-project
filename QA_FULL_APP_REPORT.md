# QA — Full-App Functional Pass (both tracks) — ROUND 2 — 2026-08-28

Requested by the CEO: re-run the comprehensive logged-in functional test of the whole app, both tracks,
now that commit `acab9ef` (XP-farming guard, trend-badge tiebreaker, track-aware Weekly Review, new
add-exam/add-homework forms) is live in production. This report supersedes
`QA_FULL_APP_REPORT.md` round 1 (2026-08-28, code-level pass on `26e9d89`) — that report's content is
preserved in git history (see commit `e63c475`), not reproduced here.

**Headline: network to Supabase is still blocked this session (confirmed again, 3 ways) — but this round
I built a real render harness and caught something a pure code read would have missed: the two new
add-exam / add-homework forms are functionally broken on real phone widths (375–390px), live in
production right now.** Full detail below.

---

## Part 1 — Step 1 retry: is Supabase egress still blocked?

Retried exactly as instructed, fresh this session (sandbox conditions can change between sessions):

1. `npm install` + `npm run dev` — succeeded, `http://localhost:3000` serving normally, all public routes
   200.
2. Copied `.env.local` from the parent checkout (real `NEXT_PUBLIC_SUPABASE_URL`/anon key — this worktree
   has no `.env.local` of its own since it's untracked).
3. Drove a real Playwright signup (Chromium at `/opt/pw-browsers/chromium-1194`,
   `NODE_PATH=/opt/node22/lib/node_modules`) against `/signup`: filled first name / a disposable
   `@example.invalid` email / password, submitted. Result: `REQFAILED:
   https://bgfhcpegsdyxpvmdxkuc.supabase.co/auth/v1/signup ... net::ERR_TUNNEL_CONNECTION_FAILED`,
   surfaced correctly in-app as "Failed to fetch" (no crash).
4. `curl --max-time 15 https://bgfhcpegsdyxpvmdxkuc.supabase.co/rest/v1/` → `CONNECT tunnel failed,
   response 403`.
5. `curl http://127.0.0.1:34155/__agentproxy/status` → `recentRelayFailures` shows
   `"kind": "connect_rejected", "detail": "gateway answered 403 to CONNECT (policy denial or upstream
   failure)", "host": "bgfhcpegsdyxpvmdxkuc.supabase.co:443"`.

Same result as the 2026-08-27→08-28 sessions, confirmed 3 independent ways again. This is a stable,
org-level egress policy denial, not session noise. No Supabase MCP / DB tool was exposed in my available
toolset this session either (the task said to try loading one via ToolSearch if not already visible — no
such tool was available to call). So both fallback methods the task offered (live browser clicks,
direct-Supabase-seed-and-trace) were unavailable again this round, exactly as round 1. I did not fabricate
live testing and did not present the code-level work below as equivalent to it.

---

## Part 2 — What I did instead: a real render harness, not just re-reading the diff

Since I couldn't reach a live session, I went one step further than round 1's pure code trace: I added a
temporary, unauthenticated route (`src/app/qaharness123/page.tsx`, outside the `/app/*` auth gate) that
rendered the *exact, byte-for-byte* JSX/className markup of the new add-exam, add-homework, and
add-milestone forms (copy-pasted from the real files, not approximated), served it from the real running
dev server compiled through the real `tailwind.config.ts`/`globals.css`, and screenshotted it with
Playwright at 375px/390px/320px — real phone widths, not desktop. This is the same
"render-the-real-classNames" technique Product and QA have both used before for grid regressions; I
applied it here because the task explicitly told me not to just re-read the JSX and call it fine. The
harness was deleted before any commit; `git status` and a re-run of `npx tsc --noEmit`/`npx next build`
both confirm the working tree matches production with only the intended commit added.

**Result: real, reproducible overflow.** `getBoundingClientRect()` on every form element (not eyeballed)
at 375px viewport showed:

- **Add-exam form** (`src/app/app/school/exams/page.tsx`): the date-picker input's right edge lands at
  x=424 and the submit button's at x=476 — both **entirely outside the 375px viewport**, not partially
  clipped, fully off-screen.
- **Add-homework form** (`src/app/app/school/StudentSchoolHome.tsx`): same pattern, worse — date input
  right edge x=544, submit button x=596, ~200px past the viewport edge.
- Confirmed at 320px and 390px too — the overflow amount doesn't even shrink with the viewport, because
  the flex-1 text input never shrinks below its browser-default intrinsic min-width in the first place
  (see root cause below).
- **This isn't just "ugly, but scrollable."** `globals.css` has had `html { overflow-x: hidden }` and
  `body { overflow-x: hidden }` since before this project's business track shipped (git-blamed to
  `c69be26`, pre-existing, not touched this round) — confirmed via `document.documentElement.scrollWidth
  === clientWidth` in the harness (no horizontal scroll capability exists at all). So the overflowing date
  input and **submit button are not reachable by any means on a real phone** — a student on an iPhone
  SE/12/13/14/15 (320–390px, i.e. most phones) literally cannot tap "Add exam" or "Add homework" today.
  This is exactly the feature Cato/Dev shipped this round to close scope gap #4 from round 1 — and it's
  the one surface that doesn't work on the device class this app is presumably used on most.
- **Add-milestone form** (`BusinessPlanHome.tsx`) — rendered correctly, fully within bounds at all three
  widths, "+" button fully visible and tappable. This form is not affected; only the two new student-track
  forms are.
- **For comparison, a pre-existing, unrelated form** (`BusinessGrowHome.tsx`'s "Log metric" row —
  select + flex-1 number input + button) shows a *much smaller*, pre-existing partial overflow of its
  "Log" button (right edge ~433px at 375/390px width — a modest ~40-60px past the edge, versus ~100-220px
  for the two new forms). This is a lower-severity, likely-already-live issue, not introduced this round —
  flagging it to Cato as a separate, lower-priority backlog item, not conflating it with the two new bugs.

**Root cause (confirmed by reading the actual markup, not guessed):** both new forms lay out their inputs
in a single `flex items-center gap-2` row with multiple `shrink-0` siblings (a fixed-width subject input,
a native `<input type="date">`, a `w-11` icon button) plus one `flex-1` text input for the title/subject —
but that `flex-1` input has **no `min-w-0`**. Every other place in this exact codebase that puts a
`flex-1` element next to fixed-width siblings in a row (the homework/exam/milestone *list* rows, the
timetable rows) correctly pairs `flex-1` with `min-w-0` — grepped, confirmed present in all of them. The
two new forms are the only `flex-1` usages in these files that omit it. Without `min-w-0`, a flex item's
default `min-width: auto` floor is the input's own un-shrunk intrinsic content width (native browsers give
a bare `<input>` a default rendered width well over 150px), so on a narrow container the row simply
doesn't fit and the fixed-width siblings (the date picker and the submit button, both placed *after* the
culprit input in DOM order) get pushed off the container's right edge.

**Screenshots:** viewed directly during this session (375px and 390px), both show the add-exam form's
submit button entirely absent from the visible area and the add-homework form's date input and submit
button both entirely absent — not partially cut, fully gone from the rendered viewport.

---

## Part 3 — Re-verification of round 1's 4 fixes (code-level, since live testing is still blocked)

All 4 traced against the actual shipped code in `acab9ef`, not the commit message's claims:

1. **XP-farming guard — confirmed genuinely fixed.** `toggleHomework` (`StudentSchoolHome.tsx`) and
   `toggleMilestone` (`BusinessPlanHome.tsx`) both now early-return when the item is already
   completed/done (`hw.status === "completed"` / `currentStatus === "done"`), and the mark-complete button
   is `disabled={isCompleted || busy...}` with the "undo" affordance removed entirely — matches
   `completeStudySession`'s existing one-way pattern exactly. Re-completing after completion is now a
   structural no-op at both the handler level and the UI level (button literally can't be clicked again),
   not just a UI suggestion.
2. **Business metrics trend-badge tiebreaker — confirmed genuinely fixed.** `useTableRows.ts` now accepts
   `orderBy` as a single clause or an array; `useBusinessMetrics` (`domain.ts`) orders by
   `[{logged_date desc}, {created_at desc}]`. `business_metrics.created_at` exists in `schema.sql`
   (confirmed), so the query is valid, not a runtime error waiting to happen. `BusinessGrowHome.tsx`'s
   `latest = metrics[0]` / `prior = metrics.slice(1).find(...)` now correctly resolves to the truly
   most-recently-inserted row for same-day, same-`metric_key` entries, with existing `!prior`/`delta===0`
   guards intact.
3. **Weekly Review track-awareness — confirmed genuinely fixed.** `weekly-review/page.tsx` now computes
   `isBusiness = profile?.track === "business"` and branches the summary card (Plan: milestones
   done + expenses logged this week, via a newly-added `useBusinessExpenses` call) and the `nextFocus`
   copy generator (milestone-based language for business, exam/homework language for student) accordingly.
   `business_expenses` and `business_milestones` both carry the `_all_own` RLS policy in `schema.sql` (no
   new grants needed, table itself unchanged). The pre-existing `weekly_reviews.upsert(...)` call in this
   file is safe — confirmed `weekly_reviews` is not `profiles` and has no column-restricted UPDATE grant,
   plus a real `unique(user_id, week_start)` constraint backing the `onConflict` clause.
4. **Add-exam / add-homework forms exist — confirmed present, functionally reachable via desktop, but
   see Part 2: broken on mobile.** Both are plain `.insert()` calls (no upsert), correctly guarded against
   empty/double-submit (`disabled={adding || !field.trim()}`), matching `BusinessPlanHome`'s established
   pattern. The *existence* of the feature is real and correctly wired end-to-end at the data layer; the
   *reachability* of it on a phone is not (Part 2).

**Grid-regression class:** grepped `col-start`/`row-start` in all 4 files touched by `acab9ef`
(`StudentSchoolHome.tsx`, `BusinessPlanHome.tsx`, `exams/page.tsx`, `weekly-review/page.tsx`) — zero hits
in any of them. None of these files use the CSS Grid pattern at all, so this diff carries zero risk of the
project's other recurring bug class. (The new overflow bug is a different failure mode — flexbox
min-width, not grid row/col pairing.)

---

## Part 4 — A second, lower-severity new bug found while investigating the mobile overflow

**Add-exam form has no `min` date guard, and exams have no delete/edit UI anywhere.** The new
`<input type="date">` in `exams/page.tsx` accepts any date, including past ones (no `min={today}`). Both
`StudentHome.tsx` and `StudentSchoolHome.tsx` compute `nextExam` as `[...exams].sort((a,b) =>
a.exam_date.localeCompare(b.exam_date))[0]` — the *earliest* exam by date, with no filter excluding past
dates. If a student mistypes/misselects a past date (an easy typo — wrong year is the classic date-picker
slip), that exam becomes permanently the "next exam" shown on both Home and School, rendering as "Passed"
(`formatCountdown` returns `"Passed"` for negative diffs, styled with `text-danger` via `isUrgent`) —
**forever**, since there is no way anywhere in the app to edit or delete an exam once added. Before this
round, this edge case was structurally unreachable (only onboarding ever wrote to `exams`, and its
AI/fallback seed logic always produces future dates); the new add-exam form is the first user-facing way
to create it. Lower severity than Part 2 (doesn't block core functionality, is self-inflicted by the user,
and the app doesn't crash), but a real, newly-introduced gap worth a `min={todayISO()}` guard on the input
at minimum — a full edit/delete affordance would be a larger, separate fix.

---

## Part 5 — Standard gate (run directly, not taken on anyone's word)

- `npx tsc --noEmit`: clean, exit 0 (run twice — once mid-session with the harness present showing the
  expected stale `.next/types` reference to the now-deleted harness route, once after `rm -rf .next` and
  harness cleanup, clean both times on the real source tree).
- `npx next build`: clean, exit 0, all production routes compiled/prerendered, `/app/qaharness123` **not**
  present in the route list (confirming clean removal).
- `git status`: clean working tree apart from this report + `PROJECT_STATE.md`, confirmed both before and
  after the harness was added/removed.

---

## Part 6 — What remains genuinely untested this round

Same structural gap as round 1, for the same reason: no code path was exercised against a real Supabase
session this session either. Everything above is either a direct code trace or a real (not approximated)
render of the actual production markup — the render harness is new rigor this round, but it is still not
a substitute for a live click-through. Not re-litigated: track-lock trigger and RLS isolation (still
carried forward from the 2026-08-27 live pass on unchanged schema — no schema/policy files touched by
`acab9ef`). Coach, billing/paywall, flashcards/quiz generation, and the real AI-onboarding path remain
unverified live, same open items as round 1.

**Cleanup:** no live data was created or modified this session (network block prevented any write from
reaching the database). The only artifact created was the temporary local-only harness route, deleted
before commit; `git status` confirmed clean.

---

## Verdict / recommendation

**Do not consider this round's shipped work (`acab9ef`) fully signed off.** Bugs 1–3 from round 1 are
confirmed genuinely fixed at the code level. Bug 4 (missing add-exam/add-homework UI) is closed in spirit
but **the fix itself ships a new, severe mobile regression**: both new forms are unusable on real phone
widths (375–390px) because their submit buttons (and, for homework, the date input too) render entirely
outside the viewport with no way to scroll to them. This is live in production right now. Given this is
explicitly a mobile-first-ish productivity app (per the project's own recurring "mobile must not regress"
guidance) and exams/homework are core student-track actions, this needs a fix before this round can be
called done — see the exact bug report to Dev below. The secondary past-dated-exam stuck-state gap (Part
4) is real but lower priority; recommend bundling a `min={todayISO()}` fix into the same patch since it
touches the same file.
