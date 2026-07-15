# Streex App Status Master

Last updated: 2026-07-11

This is the living master status file for Streex Gig Earnings. Claude, ChatGPT, Codex, and Lovable should read this file before giving product, UX, architecture, or implementation advice.

Use this with:

- `README.md`
- `AGENTS.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/STREEX_AI_WORKFLOW.md`
- `docs/ROADMAP.md`
- `CHANGELOG.md`
- `src/lib/changelog.ts`

Do not place secrets, private keys, service-role keys, passwords, or production credentials in this file.

## Current Release

Current public app version:

```text
Beta 0.9.2 - Personal Data Safety & Recovery
```

Source of truth:

- `src/lib/changelog.ts`
- `CHANGELOG.md`

## Current Infrastructure

Streex Gig Earnings now runs outside Lovable production infrastructure for the live app.

Production web app:

```text
https://gig.getstreex.com
```

Domain and DNS:

```text
getstreex.com
Cloudflare DNS active
Cloudflare email routing active
```

Frontend hosting:

```text
Vercel
```

Current Supabase backend:

```text
Project URL: https://ywbrovislvqkfzsyqpiv.supabase.co
Project ref: ywbrovislvqkfzsyqpiv
```

Legacy Lovable-managed Supabase project:

```text
mnwymfyvvdhekzvipjmp
```

The legacy Lovable Supabase project should be treated as historical/legacy context unless the user explicitly says otherwise. Do not deploy new migrations or Edge Functions there by default.

### 0.9.2 Data Safety Backend

The active Supabase project has the additive migration
`20260711013903_add_week_revisions_and_conflict_save.sql` applied. It provides
owner-scoped week restore points and optimistic-concurrency RPCs for week saves
and restores. Historical migration metadata was reconciled only after the live
schema was verified; no historical migration SQL was re-executed and no user
data was rewritten.

The frontend source for 0.9.2 still requires its normal commit, push, and Vercel
publication before this UI is live at `gig.getstreex.com`.

Security follow-up: the Supabase security advisor reports that leaked-password
protection is disabled. Enable it in the active project's Auth password-security
settings after confirming the desired user-policy impact; it is not a data or
migration defect and was not changed automatically.

## Backend Rules

Streex still uses one active production backend.

Current rule:

```text
Vercel app at gig.getstreex.com
-> owner-controlled Supabase project ywbrovislvqkfzsyqpiv
-> all active Streex data and persistence
```

Do not create or assume another Supabase project.

Before applying migrations, deploying Edge Functions, or changing auth settings:

1. Confirm the target project is `ywbrovislvqkfzsyqpiv`.
2. Confirm the change is intended for the active production backend.
3. Never expose service-role keys or secrets in frontend code or documentation.

## Deployment Notes

Vercel environment variables required:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```

Vercel build:

```text
npm run build
```

Output directory:

```text
dist
```

Supabase Auth must allow:

```text
https://gig.getstreex.com
https://gig.getstreex.com/**
Vercel preview URLs as needed
localhost:8080 for local testing when needed
```

## Current Product Direction

Streex is moving from an earnings tracker toward a professional performance intelligence system and driver companion.

Current emphasis:

- operational clarity
- mobile-first speed
- driver identity
- calm utility
- honest metrics
- trustworthy personal analytics
- no-shame progress language

## Current Core Systems

### Dashboard + Full Focus

Dashboard has two experiences:

- Standard Dashboard: fuller dashboard, progression, identity, records, and utility context.
- Full Focus: operational dashboard, built for live work sessions and quick understanding.

Full Focus currently includes:

- Today total
- Day vs average
- Historical rank
- shared Utility Slot for Conditions and Octopus reward progress
- weekly earnings and hours progress
- Quick Add
- End Day
- current-week operations snapshot
- metric drill-down sheets for explanation

Recent Full Focus utility behavior:

- Conditions keeps weather and traffic together as one visual module.
- Traffic refreshes more frequently than weather, but both remain one combined card.
- Octopus reward progress can rotate into the same Utility Slot after eligible Uber ride updates.
- Octopus points are correctable utility state and do not alter earnings, rides, records, XP, achievements, or efficiency.
- On mobile, Progress lives in the bottom navigation to preserve header space; on desktop, Progress remains in the top navigation.

### Entry + Quick Add

Entry supports:

- normal app earnings
- Quick Add focused updates for primary apps
- optional miles and rides
- manual ride count
- shift blocks
- start/end shift
- pause/resume shift
- manual shift earnings recovery
- bonus income entry

Quick Add is designed around accumulated totals, not incremental add-only values. The user enters the current total visible in the driver app, and Streex computes changes/snapshots safely.

Quick Update tracking rules:

- Earnings are accumulated totals for the selected app.
- Rides are accumulated totals for the selected app and combine into the shift total.
- Miles are one shared accumulated day total across all apps.
- Across multiple shifts, mileage remains one accumulated day total; Streex assigns only the change to the active shift.
- Historical total-only rides remain unattributed unless the user establishes a new app breakdown.
- Only known Uber ride deltas affect Octopus progress.

### Shift Intelligence

Shift Intelligence includes:

- shift start/end
- active shift state
- pause/resume via work blocks
- total active work time
- miles
- rides
- earnings/hour
- earnings/mile
- earnings/ride when ride count exists
- current-week and lifetime operations snapshots

Important metric rule:

Do not calculate fake efficiency. If duration, rides, miles, or safely attributable earnings are missing, hide the metric or show an honest fallback.

### Earnings Snapshots

Earnings Snapshots V1 records earnings update deltas when the user saves updated app totals.

Use snapshots for:

- observed earnings update timing
- more honest timing analysis when data exists
- reconstructing some shift-level earnings when a same-shift snapshot exists

Do not claim exact ride-level hourly performance unless future ride timestamps or provider integrations exist.

### Bonus Income

Bonus income represents surprise platform payouts or extra one-time payouts.

Bonus rules:

- Counts toward daily, weekly, monthly, lifetime totals.
- Counts toward records, Journey, Career totals, XP, Achievements, and app breakdown.
- Excluded from $/hour, $/shift, shift efficiency, timing metrics, and operational performance.
- Octopus is treated as bonus/reward income automatically by app name.
- Existing Octopus entries remain stored as-is but are interpreted by calculation rules.

Rule of thumb:

```text
Real money story includes bonus.
Operational efficiency excludes bonus.
```

### Daily Report / End Day

End Day has evolved into a richer Daily Report:

- today earned
- app count
- hours
- per-hour when valid
- miles
- rides
- per-ride when valid
- vs average
- week pace
- week total
- week share
- shift intelligence
- narrative insight
- milestone context
- image download/share

Current export behavior:

The exported Daily Report image captures the visible report card instead of a separate export-only template. This keeps the downloaded/shared card aligned with the in-app design.

### Deep Insights

Deep Insights is the desktop-first analytics cockpit. Beta 0.7.0 added an Advanced Comparison workspace without replacing the existing operational Compare page.

Current behavior:

- Dark and premium themes keep the dark Streex control-room treatment.
- Classic Light uses a bright editorial analytics treatment.
- Charts, tooltips, KPI cards, filters, panels, empty states, insight blocks, and tables are theme-aware.
- No Deep Insights calculation, data, auth, Supabase, or backend behavior changed in `Beta 0.6.1`.

Current state:

- dedicated route: `/deep-insights`
- available from the Progress menu
- not part of bottom navigation
- dark control-room layout for power-user analysis
- time, app/platform, and weekday filters
- KPI strip
- earnings trend
- weekly earnings comparison
- weekday earnings chart
- app contribution mix
- hours worked chart where shift data exists
- earnings/hour trend where valid shift duration exists
- earnings/mile trend where mileage exists
- best days
- lowest earning days
- best weeks
- best shifts where shift-level earnings can be resolved
- app performance breakdown
- data-supported insight copy
- `Overview | Compare` workspace switch inside Deep Insights
- two to four day, week, month, year, or custom comparison blocks
- shared app/platform filter, metric table, comparison chart, and narrative signals
- URL-backed comparison state after interaction

Important metric rules:

- Earnings totals follow the normal money story, including bonuses where they already count.
- Operational efficiency uses only data that can be supported by shift time, mileage, snapshots, or manual shift earnings.
- App-specific hourly claims are hidden because Streex does not store app-specific hours.
- Vehicle, market/location, weather-history, and GPS filters are intentionally out of V1 until those dimensions are stored reliably.
- Comparison totals include bonuses, while efficiency continues using operational earnings only.
- App-filtered comparisons hide resource and efficiency metrics that cannot be attributed honestly to one platform.
- The existing `/compare` route remains the unchanged same-point weekly operational guide.

Latest Deep Insights work:

- `Beta 0.8.1`: selected KPI sparklines, weekly distributions, activity marks, contribution context, and ranking/percentile indicators.
- `Beta 0.9.0`: Shift Intelligence with honest coverage, average duration, rides/hour, miles/hour, and duration-pattern efficiency.

### Ask My Data

Ask My Data is an Alpha analytics experiment and is currently paused.

Current state:

- The route, UI, challenge set, intent routing, tests, usage logging, and `ask-my-data` Edge Function source remain in the repository.
- The current Edge Function still expects `LOVABLE_API_KEY` and calls Lovable's AI gateway.
- After moving production infrastructure away from Lovable, generative Ask My Data must be treated as unavailable or unverified until a deliberate provider replacement is approved and deployed.
- Defaults to full historical scope when the user does not specify a timeframe.
- Has intent routing and challenge-set documentation.
- Supports deterministic answers for many earnings, weekday, week, shift, rides, and pattern questions when data exists.
- Should not substitute unsupported questions with vaguely similar answers.

Important limitation:

Ask My Data should be treated as Alpha and currently provider-blocked. Do not represent it as production-ready merely because the UI and Edge Function exist. Do not overclaim exact hourly, location, trip-type, or health insights unless the underlying data exists.

### Admin Ops

Admin Ops foundation exists:

- protected admin route
- admin role validation via backend
- user management foundation
- block/unblock
- feedback inbox
- app version/update controls
- re-engagement email foundation

Email delivery quality is still pending production sender/domain refinement.

### Themes

Current major visual themes include:

- Classic Light
- Classic Dark
- RPG
- Night
- Signature
- Velocity

Recent visual layers:

- premium dark auth/login/splash
- iOS safe-area theme background handling
- Full Focus drill-down layer
- Daily Report export polish

## Current Versioning Policy

Streex is in public beta versioning.

- Use `0.x.y` during beta.
- Use patch versions for bug fixes and polish.
- Use minor versions for meaningful feature releases.
- Reserve `1.0.0` for the first stable public release.
- Preserve older `V3.x` through `V5.x` labels as Alpha Archive history.

Before implementing a new prompt, Codex should:

1. classify the request
2. propose a version number when the change is meaningful
3. ask for user approval if versioning is ambiguous

## Roadmap

The living roadmap is stored in:

```text
docs/ROADMAP.md
```

Current planned sequence:

- `Beta 0.8.0`: Full Focus Utility Intelligence - completed
- `Beta 0.8.1`: Deep Insights Micro-Visualization Pass - completed
- `Beta 0.8.2`: Career Drill-Down Expansion - completed
- `Beta 0.8.3`: Weekly Comparison Clarity - completed
- `Beta 0.8.4`: Weekly Comparison Projection - completed
- `Beta 0.8.5`: App-Specific Ride Attribution - completed
- `Beta 0.8.6`: Shift Time Edit Synchronization - completed
- `Beta 0.8.7`: Mileage Accumulation Integrity - completed
- `Beta 0.8.8`: Data Integrity Repair - completed
- `Beta 0.8.9`: Data Health Foundation - completed
- `Beta 0.9.0`: Deep Insights Intelligence Layer - completed
- `Beta 0.9.1`: Reliability & Release Safety - completed
- `Beta 0.9.2`: Personal Data Safety & Recovery - completed
- `Beta 0.9.3`: Live Work Mode - planned

These numbers are planning labels, not immovable promises. If a bugfix, production patch, or smaller feature ships first, renumber the planned items while preserving the roadmap intent.

## Recent Beta Highlights

- `0.9.0`: Deep Insights added Shift Intelligence with explicit coverage and minimum-sample guardrails for duration-pattern rankings.
- `0.8.9`: Admin Ops gained an internal Data Health panel and reusable data-contract summary layer for week, shift, mileage, ride, and snapshot integrity.
- `0.8.8`: Historical mileage and work-block inconsistencies were repaired with private backups; redundant snapshots were removed and revision-scoped idempotency now prevents recurrence.
- `0.8.7`: Mileage now remains an accumulated day total across shifts, with only each update delta attributed to the active shift.
- `0.8.6`: Shift time edits now synchronize operational work-block boundaries while preserving real pause intervals.
- `0.8.5`: Quick Update separated ride counts by app, preserved shared accumulated mileage, and limited Octopus changes to known Uber ride deltas.
- `0.8.4`: Compare restored upcoming reference days, added a clearly labeled pace projection, and exposed remaining and per-day planning targets without creating future losses.
- `0.8.3`: Compare separated previous-week and record-week progress, added daily and cumulative gaps, and introduced expandable cumulative trend charts without counting future days.
- `0.8.2`: Career added contextual monthly, record, app, weekday, and hourly-efficiency drill-downs while preserving Full Focus unchanged.
- `0.8.1`: Deep Insights added selected KPI sparklines, compact distributions, operational contribution context, and filter-aware ranking visuals.
- `0.8.0`: Full Focus Utility Intelligence added the shared Conditions/Octopus Utility Slot, Octopus point tracking, event-driven utility rotation, and the weekly active-day average metric.
- `0.7.1`: Deep Insights header fix plus a unified, theme-aware Overview and Advanced Comparison exploration system.
- `0.7.0`: Advanced Comparison Builder added configurable multi-period analysis inside Deep Insights while preserving the existing Compare guide.
- `0.6.4`: Full Focus goal hierarchy removed redundant goal card and promoted Conditions into the full-width utility position.
- `0.6.3`: Daily Notes added one short contextual note per day without affecting statistics.
- `0.6.2`: Quick Add decimal input fix restored cents entry on mobile.
- `0.6.1`: Deep Insights Refinement + Light Mode added theme-aware chart, panel, table, tooltip, and filter styling.
- `0.6.0`: Deep Insights Desktop V1 added as a new desktop-first analytics cockpit.
- `0.5.1`: Daily Report export now matches the visible report card; CSS import warning fixed.
- `0.5.0`: Bonus Category added; bonuses count toward earnings story but not operational efficiency.
- `0.4.9`: Historical Rank drill-down added Day and Week views.
- `0.4.8`: iOS header safe-area fix.
- `0.4.7`: Account Security / Change Password in Settings.
- `0.4.6`: Shift Earnings Recovery.
- `0.4.5`: Shift Pause + Work Blocks foundation.
- `0.4.4`: Full Focus drill-down refinement.
- `0.4.3`: Full Focus metric drill-down layer.
- `0.4.2`: iOS/PWA safe-area theme background fix.
- `0.4.1`: Velocity theme.
- `0.4.0`: Signature theme.
- `0.3.4`: Premium auth and splash visual refresh.
- `0.3.0`: Work Hours Intelligence, Ride Count, weekly hours goals, and Daily Report 2.0 foundation.

See `CHANGELOG.md` for full details.

## Known Operational Notes

- Local `.env` files may be stale or machine-specific. Vercel Production variables are the deployment source of truth.
- `supabase/config.toml` should point to the active Supabase project ref for future function deployments.
- Ask My Data and utility Edge Functions depend on Supabase function secrets. Do not assume secrets are present in a new environment.
- OpenWeather and TomTom are backend/Edge Function concerns; do not place provider keys in frontend code.
- Supabase default auth emails can hit quota; production email sender configuration should be improved separately.
- The web app should continue to stabilize before starting a professional native SwiftUI iOS app.

## Current Follow-Up Backlog

High priority:

- Improve Supabase Auth email delivery with proper custom SMTP/domain sender.
- Keep monitoring login/session behavior after the migration.
- Confirm the Beta 0.8.0 user-settings migration and `driver-utility` Edge Function are deployed to the active Supabase backend.
- Validate Daily Report export on iOS PWA after next deploy.
- Continue bug-fix stabilization before adding large roadmap systems.

Medium priority:

- Replace or evolve Ask My Data away from the Lovable AI dependency only after a deliberate provider decision; external AI replacement is intentionally deferred for now.
- Continue improving shift-level attribution from earnings snapshots.
- Prepare the historical CSV/Excel import workflow before importing multi-year data.
- Research aviation providers for Flight Reservation Tracker and Airport Pulse before building the next Utility Slot module.
- Add more robust admin email sender configuration.
- Keep `docs/ASK_MY_DATA_CHALLENGE_SET.md` updated after Ask My Data fixes.

Do not implement these automatically. Treat them as product backlog.

## How Claude / ChatGPT Should Use This

When asked about Streex:

1. Read this file first.
2. Then read `README.md`, `docs/PROJECT_CONTEXT.md`, and `CHANGELOG.md`.
3. Use repo files as the current source of truth.
4. If chat history disagrees with repo docs, ask the user which source is newer.
5. Do not assume Lovable is still production infrastructure unless the user explicitly says so.

## Update This Document When

- a roadmap version ships
- the current release changes
- infrastructure changes
- Supabase project target changes
- a major system is added or removed
- a known limitation is resolved
- product direction materially changes
