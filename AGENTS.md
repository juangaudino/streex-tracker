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

## Versioning

Streex is in public beta versioning.

- Current beta baseline: `0.1.0`.
- Preserve older `V3.x` through `V5.x` entries as Alpha Archive history.
- Use `0.1.x` for small bug fixes, QA fixes, and polish.
- Use `0.2.0`, `0.3.0`, etc. for meaningful beta feature releases.
- Reserve `1.0.0` for the first stable public release.
- Before implementing a new prompt, bug fix, polish session, roadmap feature, or update request, classify the request and propose the version number for user approval.
- Do not continue the old Alpha `V5.x` sequence for new beta releases.

## Validation

Run the narrowest useful tests first, then broaden based on risk. At minimum, use TypeScript checks for code changes and report any validation that could not run.
