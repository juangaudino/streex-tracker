# Streex Product Status

This is a living status document. Update it after roadmap releases, major architecture changes, or important known limitations.

## Current Release

`Beta 0.1.0 - Stabilization Baseline`

Source of truth:

- `src/lib/changelog.ts`
- `CHANGELOG.md`

## Versioning Policy

Streex is now in public beta versioning.

- Current public beta baseline: `0.1.0`
- Use `0.1.x` for small beta bug fixes and polish.
- Use `0.2.0`, `0.3.0`, etc. for meaningful beta feature releases.
- Reserve `1.0.0` for the first stable public release.
- Preserve older `V3.x` through `V5.x` entries as Alpha Archive history.
- Before implementing a new prompt, bug fix, polish session, or roadmap feature, Codex should classify the request and propose the version number for user approval.

## Current Product Direction

Streex is moving from an earnings tracker toward a professional performance intelligence system and driver companion.

Current emphasis:

- operational clarity
- performance understanding
- driver identity
- calm utility
- trustworthy personal analytics

## Recent Major Layers

Alpha Archive highlights:

- V5.5 Dashboard Utility Expansion
- Daily Command Center with live OpenWeather and TomTom data
- International display formatting and milestone share cards
- V5.6 Shift + Hours, Pattern Intelligence, and Mileage Foundation
- V5.7 Full Focus operational dashboard
- Daily Start Hub
- Navigation cleanup and Ask AI visibility
- Admin Ops, feedback inbox, app version control, and re-engagement email foundation
- V5.7.6 dashboard, Ask My Data mobile, and shift tracking consolidation
- V5.7.7 Ask My Data intent routing and capability awareness
- V5.7.8 iOS/Safari/PWA app resume and lifecycle persistence hardening
- V5.7.9 branded iOS, Android, and browser PWA icon configuration

## Ask My Data

Ask My Data is career intelligence, not a recent-dashboard helper.

Rules:

- Default to full history when no timeframe is specified.
- Use deterministic calculations when the requested fact can be derived safely.
- Do not substitute unsupported questions with vaguely similar answers.
- Be explicit about unsupported hourly, trip-location, ride-type, health, or biometric data.
- Use `docs/ASK_MY_DATA_CHALLENGE_SET.md` for manual QA.

After changing `supabase/functions/ask-my-data/index.ts`, deploy the updated `ask-my-data` Edge Function to the live Lovable-connected backend.

## Known Operational Notes

- OpenWeather and TomTom secrets live in the Lovable-connected backend, not frontend code.
- Re-engagement email delivery quality will improve later with the owner's domain and sender email.
- The web roadmap should be completed and stabilized before beginning the professional SwiftUI iOS app.
- Bug-fix and QA periods should avoid adding unrelated roadmap scope.

## Update This Document When

- a roadmap version ships
- the current release changes
- a major system is added or removed
- backend architecture changes
- a known limitation is resolved
- the product direction materially changes
