# Streex Codex Instructions

This repository is the source of truth for the Streex Gig Earnings App.

## Start Every Task

1. Read `docs/PROJECT_CONTEXT.md`.
2. Read `docs/STREEX_AI_WORKFLOW.md`.
3. Read `docs/PRODUCT_STATUS.md`.
4. Check `git status` before editing.
5. Assume Lovable may have changed production code since the previous chat. Review the latest repo state before implementation.

## Core Rules

- Use only the existing Lovable-connected Supabase backend.
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

Live Lovable-connected Supabase project:

`mnwymfyvvdhekzvipjmp`

If backend ambiguity exists, stop and verify before applying changes.

## Changelog

For meaningful user-facing or architectural changes, update both:

- `CHANGELOG.md`
- `src/lib/changelog.ts`

## Validation

Run the narrowest useful tests first, then broaden based on risk. At minimum, use TypeScript checks for code changes and report any validation that could not run.

