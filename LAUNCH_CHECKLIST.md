# Alxioum — market launch readiness checklist

Honest status as of this build. ✅ = done and verified, ⚠️ = built but not
independently verified end-to-end, ❌ = not built yet.

## Functional

- ✅ Chat works (real Claude Head Agent, tool calling, server-side)
- ✅ Calendar works (manual CRUD + AI-driven, day/week/month views, recurring rule field, conflict detection on create)
- ✅ Tasks work (manual CRUD + AI-driven)
- ✅ Memory works (manual CRUD + AI-driven, delete / delete-all)
- ✅ My Day works (real data only, "Your day is clear" when empty)
- ✅ Activity works (every confirmed/cancelled/failed action logged)
- ✅ Confirmation works (create/update/delete/complete always propose → confirm → execute)
- ✅ Data deletion works (per-item everywhere, "delete all" in Settings)
- ⚠️ Full chat ↔ Claude ↔ confirm ↔ DB loop verified by code review and local `npm run build`/`next start` smoke test (marketing + auth-gated routes render, static analysis of the tool-calling loop). **Not** verified with a live signed-in user hitting a real deployment — the sandbox this was built in cannot reach Supabase or Railway over HTTP, only through their dedicated MCP tools. Do this once deployed (see below).

## Security

- ✅ `ANTHROPIC_API_KEY` server-side only, never sent to the browser
- ✅ Every DB query runs through Postgres RLS as the caller's own verified Supabase JWT — API routes never trust a client-supplied user id
- ✅ RLS policies scoped explicitly to the `authenticated` role
- ✅ No bulk-delete/bulk-update tool exists anywhere in the tool registry — "delete everything" structurally cannot cascade past one item at a time, even if the model tried
- ✅ Per-user in-process rate limiting on `/api/chat` (documented limitation: single-instance only; move to a shared store if this ever scales to multiple replicas)
- ✅ Fixed the critical Next.js CVE that was silently failing every prior deploy (15.1.6 → 15.5.23)
- ⚠️ No formal penetration test performed. Recommend running `/security-review` or an equivalent third-party review before accepting real user signups at scale.
- ❌ Supabase's "leaked password protection" (HaveIBeenPwned check) is off by default — enable it in the Supabase dashboard (Auth → Policies) before launch; it isn't controllable via SQL/MCP.

## AI reliability

- ✅ Tool schemas force search-before-mutate (update/delete require a real id from a search tool, never a guessed one)
- ✅ System prompt explicitly instructs: ask for clarification on ambiguous references, ask for missing required fields, treat "actually don't"/"cancel" as declining, never claim an action completed before confirmation
- ✅ Read tools execute immediately; every consequential tool only proposes, and the confirm endpoint independently re-verifies ownership and current row existence before executing
- ⚠️ The specific scenarios in the product spec (ambiguous "move my appointment" with 2+ matches, "cancel my 3pm" with multiple 3pm events, "schedule something tomorrow" with no title/time, "delete everything") are supported by the tool/prompt architecture but have **not** been run against the live model in this environment — no outbound path to Anthropic's API existed in the build sandbox either. Run these manually against the deployed app once live.

## Product

- ✅ Onboarding works (name/timezone/use case + real PWA install steps, not fake copy)
- ✅ Empty states everywhere (Chat, Calendar, Tasks, Memory, Activity, Agents)
- ✅ Mobile layout (bottom nav, responsive chat/calendar)
- ✅ Desktop layout (sidebar, multi-pane chat)
- ✅ Pricing page + Settings billing section (Free / Pro, EUR, config-driven from one file: `src/lib/billing/plans.ts`)
- ⚠️ Support/contact: currently a bracketed placeholder in Privacy/Terms — needs a real support address before launch
- ⚠️ Privacy Policy / Terms of Service: real, product-specific content, but placeholders remain for legal entity name + jurisdiction (owner didn't have these yet) and have not been reviewed by a lawyer
- ❌ Payments (Whop): **not implemented.** No credentials were provided. "Interested in Pro" in Settings records intent (`pro_interest_at`) without charging anything — it does not pretend to process a payment.

## Known scope cuts (deliberate, not oversights)

- Email / Finance / Travel / Shopping / Documents / Research agents are catalog entries marked "Coming soon" with no backend — architecture (tool registry pattern) supports adding them later without touching the Head Agent.
- Goals/Habits/Finance/Documents/Lists — the old prototype's tables still exist in Supabase (unused, harmless) but there's no UI for them anymore; they were out of the spec'd 8-section nav.
- Command palette (⌘K) and quick-add modal from the old prototype were removed rather than half-ported, to avoid shipping dead links.
- Notification delivery (push/email) architecture is not built — only in-app notification rows and Settings toggles exist.

## Before real users

1. Approve the pending branch switch on the Railway `alxioum` service (needs dashboard 2FA) and confirm the deploy goes green.
2. Run the AI test scenarios above against the live deployment.
3. Fill in the legal-doc placeholders (`/privacy`, `/terms`) with real entity/jurisdiction/support-email details.
4. Enable Supabase leaked-password protection.
5. Rotate `ANTHROPIC_API_KEY` (it was shared in plaintext during this build) and re-set it in Railway.
6. Decide on and wire up Whop for Pro billing when ready.
