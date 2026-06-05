# Streex Product Status

This is a living status document. Update it after roadmap releases, major architecture changes, or important known limitations.

## Current Release

`Beta 0.3.0 - Work Hours, Ride Count + Daily Report Intelligence`

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

Beta highlights:

- 0.1.0 public beta versioning baseline
- 0.1.1 Ask My Data mobile composer stability, voice input, and copy conversation
- 0.1.2 Entry Shift Blocks mobile layout fix
- 0.2.0 Earnings Snapshots V1 and honest timing-source labels for Shift Intelligence
- 0.2.1 Late earnings adjustments improve real totals without contaminating observed timing patterns
- 0.2.2 Octopus reward income classification for cleaner operational efficiency metrics
- 0.2.3 Career and weekly operations snapshots now have clear lifetime vs current-week scope labels
- 0.3.0 Work Hours Intelligence, manual Ride Count foundation, weekly hours goals, Daily Report 2.0, and Ask My Data shift/rides context

## Pattern Intelligence Source Truth

Streex does not currently receive individual ride-level timestamps.

Timing intelligence must label its source clearly:

- Earnings Snapshots: observed from saved earning-update deltas.
- Estimated Windows: inferred by spreading daily earnings across completed shift duration.
- Late earning adjustments: improve real totals and efficiency stats, but are excluded from observed timing if saved after the original work day.

Do not present timing cards as exact ride-level hourly earnings unless a future integration provides ride timestamps.

## Reward Income Rule

Octopus is treated as reward income by app name.

- Real money totals include Octopus: day totals, week totals, records, Best Day, exports, and general earnings history.
- Operational performance excludes Octopus: shift efficiency, earnings per hour, earnings per mile, hourly timing, and app-by-hour patterns.
- Historical Octopus entries are reinterpreted automatically by calculation rules; stored amounts are not changed.

## Operations Snapshot Scope

Operational metrics must clearly state their scope.

- Career tab: lifetime/career-wide operations context.
- Dashboard: current-week operations context.

Avoid generic snapshot labels when the user cannot immediately tell whether the number is weekly, monthly, or lifetime.

## Work Hours + Ride Count

Ride Count is manual-first and optional.

- Shift blocks can store `rideCount` alongside start time, end time, and miles.
- Day/week/career ride metrics should only appear when rides have been entered.
- Weekly hours goals are separate from weekly earnings goals.
- Missing duration or rides must never produce fake $/hour, $/ride, rides/hour, or minutes/ride values.

## Ask My Data

Ask My Data is career intelligence, not a recent-dashboard helper.

Rules:

- Default to full history when no timeframe is specified.
- Use deterministic calculations when the requested fact can be derived safely.
- Do not substitute unsupported questions with vaguely similar answers.
- Be explicit about unsupported hourly, trip-location, ride-type, health, or biometric data.
- Shift hours, rides, miles, and efficiency can be answered when those values exist in tracked shift blocks.
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
