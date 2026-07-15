# Streex Codex Instructions

This repository is the source of truth for the Streex Gig Earnings App.

## Start Every Task

1. Read `START_HERE.local.md` when it exists in the current workspace.
2. Read `docs/NEW_CHAT_HANDOFF.md`.
3. Read `docs/PROJECT_CONTEXT.md`.
4. Read `docs/STREEX_AI_WORKFLOW.md`.
5. Read `docs/PRODUCT_STATUS.md`.
6. Check `git status` before editing.
7. Assume Lovable or another AI may have changed production code since the previous chat. Review the latest repo state before implementation.

## Core Rules

- Use only the active owner-controlled Supabase backend unless the user explicitly asks for legacy inspection.
- Confirm the backend before applying migrations or deploying Edge Functions.
- Never create or assume a separate Supabase project.
- Never expose API keys, service-role keys, or secrets in frontend code or documentation.
- Preserve production behavior. Prefer additive, closely scoped changes.
- Keep Streex mobile-first, calm, premium, driver-centric, and no-shame.
- Do not redesign unrelated surfaces.
- Do not change stored earnings values for display-only formatting.
- Ask before making product-direction changes when the request is exploratory or ambiguous.

## Preserve

Do not break:

- dashboard and Full Focus
- auth and account access
- earnings entry and historical editing
- shifts, mileage, and pattern intelligence
- achievements, records, XP, and Driver Identity
- Ask My Data
- exports
- settings and themes
- Daily Command Center, OpenWeather, and TomTom traffic
- admin operations and feedback

## Backend

Active production Supabase project:

`ywbrovislvqkfzsyqpiv`

Production app:

`https://gig.getstreex.com`

Legacy Lovable-managed Supabase project:

`mnwymfyvvdhekzvipjmp`

If backend ambiguity exists, stop and verify before applying changes.

## Changelog

For meaningful user-facing or architectural changes, update both:

- `CHANGELOG.md`
- `src/lib/changelog.ts`

## Versioning

Streex is in public beta versioning.

- Current public beta baseline: `0.9.2`; the local source candidate is `0.9.3` Live Work Mode Beta until owner-managed publication and QA.
- Preserve older `V3.x` through `V5.x` entries as Alpha Archive history.
- Increment the patch number for small bug fixes, QA fixes, and focused polish.
- Increment the minor number for meaningful beta features or new product surfaces.
- Reserve `1.0.0` for the first stable public release.
- Before implementing a new prompt, bug fix, polish session, roadmap feature, or update request, classify the request and propose the version number for user approval.
- Do not continue the old Alpha `V5.x` sequence for new beta releases.

## Validation

Run the narrowest useful tests first, then broaden based on risk. At minimum, use `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` for code changes. Use `npm run test:e2e:smoke` for auth or routing changes when the browser runtime is available. The authenticated QA suite is manually triggered and must use the isolated QA account only.
