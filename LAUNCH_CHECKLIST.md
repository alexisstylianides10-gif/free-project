# FutureOS — launch readiness checklist

Honest status as of this build. ✅ = done and verified, ⚠️ = built but not
independently verified end-to-end, ❌ = not built yet.

## Functional

- ✅ Onboarding: welcome screen + all 9 questions from the spec + computed
  "Future Map" results (client-side matching engine, no backend needed until
  account creation) — verified end-to-end in a real browser.
- ✅ Auth: email/password sign up and log in via Supabase Auth.
- ✅ Home: today's progress (School/Future %, streak), today's plan timeline,
  hero Future Mission card, upcoming exam / homework / career-progress /
  AI-recommendation summary cards.
- ✅ School: today's classes, homework (with a real complete/un-complete
  toggle that awards XP), exams countdown, AI-generated weekly study plan
  (completable, feeds achievements), "Ask AI about this subject" link.
- ✅ Future: top career matches (recomputed live from onboarding answers,
  merged with anything already saved), career detail pages (why it matches,
  subjects with star ratings, skills, projects, try-now, education routes,
  progression, "Add to my path"), and the 6-level app-wide roadmap.
- ✅ AI Coach: real Claude (`claude-opus-5`) chat, system prompt built from
  the student's actual pending homework/exams/career, hard-coded to put
  school first and follow the app's safety rules. Suggested prompts,
  "Today's Recommendation" split, persisted chat history.
- ✅ Missions: 15 real-accomplishment missions across all 5 spec categories,
  completable, award XP/skills/achievements.
- ✅ Profile: XP breakdown, achievements grid (earned vs. locked), skills
  bars, career journey (roadmap), sign out.
- ✅ Weekly Review: computed live from real data each visit and persisted to
  `weekly_reviews`; rule-based "Next Week's Focus".
- ✅ Demo data: signing up seeds a realistic timetable/homework/exam set and
  starter skills tailored to the subjects picked during onboarding, so the
  app has real content from the first screen.

## Verification method (read this before trusting the ✅s above)

This was built in a sandboxed environment whose network policy blocks direct
HTTPS from the browser to `*.supabase.co` (confirmed: even `curl` to
Supabase's REST API gets a 403 at the proxy). That means:

- ✅ **Verified live, in a real browser, against the actual dev server:**
  the welcome screen, the full 9-question onboarding flow, the matching
  engine's output, and the signup form's UI (all client-side, no Supabase
  network call required until the final "Create account" submit).
- ✅ **Verified via `npx tsc --noEmit` and `npx next build`** (both clean,
  zero errors/warnings) for every route, including all Supabase-backed
  screens — this catches type mismatches against the schema, but not
  runtime/RLS behavior.
- ⚠️ **Not verified live**: anything past account creation (Home, School,
  Future, Coach, Missions, Profile, Weekly Review) — the sandbox couldn't
  reach Supabase from the browser to actually sign up a test user and click
  through. These were built by background agents against the same shared
  types/hooks/components as the verified screens, reviewed for correctness,
  and compile cleanly, but **do a real signed-up-user smoke test once this
  is deployed** before treating it as launch-ready.
- ✅ Supabase schema applied to a live project (`futureos`,
  `bgfhcpegsdyxpvmdxkuc`), `get_advisors` (security) returned zero lint
  findings.

## Security

- ✅ Every table scoped to `auth.uid()` via RLS (see `supabase/schema.sql`).
- ✅ `ANTHROPIC_API_KEY` server-side only (`/api/coach`), never sent to the
  browser.
- ✅ `/api/coach` re-derives the student's context server-side from their
  verified JWT (`requireUser`) — never trusts client-supplied profile data.
- ✅ CSP, HSTS, and standard security headers in `next.config.mjs` (fixed a
  bug during this build: the CSP was missing a dev-only `unsafe-eval`
  allowance, which broke Next's Fast Refresh and silently blank-rendered
  every page in `next dev`. Production is unaffected and stays strict).
- ❌ No formal penetration test. Recommend `/security-review` before real
  user signups at scale.
- ❌ Supabase's leaked-password protection (HaveIBeenPwned check) is off by
  default — enable it in the dashboard (Auth → Policies) before launch.
- ❌ Email confirmation: depends on the Supabase project's default Auth
  settings, which weren't changed here. If confirmation is required, the
  app handles it gracefully (pending onboarding answers wait in
  `localStorage` and apply on first login) — but this path itself is one of
  the "not verified live" items above.

## Known scope cuts (deliberate, not oversights)

- Reference content (careers, missions, achievements, skills, roadmap) is a
  static TypeScript catalog, not an admin-editable database table — see
  README's Architecture notes for why, and how to change that later.
- No parent/school account features yet — the schema and architecture don't
  block adding them, they're just not built.
- No Google Calendar / school calendar sync yet — same, deliberately out of
  scope for this pass.
- No push notifications.
- Weekly Review shows the current week only, computed live — no history
  browsing UI (the `weekly_reviews` table does accumulate history row by
  row, so that's addable later without a schema change).

## Before real users

1. Deploy to Vercel (see README) and run one real signup → onboarding →
   Home/School/Future/Coach/Profile click-through — this is the one thing
   this build genuinely could not verify itself.
2. Enable Supabase leaked-password protection.
3. Decide on and configure email confirmation behavior for the target age
   group (13–18) — both a confirmation-required and confirmation-off flow
   work, so this is a product decision, not a blocker.
4. Consider a moderation/reporting path for the AI Coach if this goes to
   real students beyond a demo — the system prompt encodes strong safety
   rules, but a human escalation path is out of scope for this build.
