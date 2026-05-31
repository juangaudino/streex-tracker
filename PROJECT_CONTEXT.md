# Streex Project Summary

Streex is a mobile-first gig earnings tracker evolving into a professional identity system for gig workers.

## Core Product Vision

Streex is not just about tracking income. It helps drivers understand progress, discipline, momentum, recovery, records, identity, and ownership of their work data.

Main philosophy:

- Identity > Money
- No shame analytics
- Days off are legitimate
- The user's own history is the benchmark
- Data belongs to the user

## Architecture Rule

Streex uses only one backend:

Lovable app -> live Lovable-connected Supabase backend -> all Streex data and persistence

Do not create or use separate Supabase projects unless explicitly requested.

Confirmed live backend:

`mnwymfyvvdhekzvipjmp`

All production data must live there:

- weeks
- user_settings
- user_achievements
- xp_events
- auth
- Ask My Data
- AI usage logs
- future analytics
- future identity systems

If backend ambiguity exists, stop and verify before applying migrations.

## Current Version

Current app version after recent work:

`V5.6 - Shift + Hours & Pattern Intelligence`

## Recent Features Implemented

### V5.3B.2 - Export My Data

Added:

- Dashboard semantics cleanup
- Adaptive Active Days logic
- Human-readable labels
- Export My Data section in Settings
- JSON backup export
- CSV earnings export
- Changelog updates

### V5.3B.3 - Ask My Data

Ask My Data is an AI analytics assistant at `/assistant`.

Key architecture:

- Supabase Edge Function: `ask-my-data`
- JWT verification
- RLS-scoped user queries
- server-side AI key only
- compact scoped context
- no arbitrary SQL
- no full database dumps
- streaming responses
- AI usage logging
- graceful rate-limit / credit errors

Important fix:

- Best week / all-time questions must use full historical data, not only recent rows.

### V5.4 - XP + Identity System

Added:

- xp_events table
- RLS policies
- unique `(user_id, event_key)` protection
- Consistency XP
- Performance XP
- Driver Levels
- Driver Archetypes
- Historical Day Ranking
- Rival System
- Ideal Week Comparison
- Day Off V1
- Adaptive Comparisons
- Driver Identity dashboard card

Driver levels:

1. Rookie
2. Road Runner
3. Steady Grinder
4. Street Pro
5. Top Earner
6. Elite Driver
7. Streex Legend

XP table migration must only be applied to the live Lovable backend.

### V5.4.1 - Night Drive Theme

Added fourth theme:

- Light
- Dark
- RPG
- Night Drive

Night Drive is a cockpit-style visual theme with asphalt depth, streetlight amber, dashboard teal, and subtle road-lane atmosphere.

No backend or data logic changed.

### V5.4.2 - Pulse Mode + Career Titles

Added:

- Pulse Mode toggle in Settings
- local-only setting via localStorage
- dashboard pulse states:
  - calm
  - steady
  - streak
  - strong
  - record
- Career Title Generator inside Driver Identity

Example career titles:

- Street Pro - Record Hunter
- Road Runner - Goal Closer
- Steady Grinder - Week Builder
- Rookie - Identity Forming
- Streex Legend - Legendary Spark Specialist

No backend, Supabase, auth, Ask My Data, exports, or XP writing logic changed.

### V5.5 - Dashboard Utility Expansion

Added:

- Daily Command Center on the dashboard
- Live Weather Strip via Supabase Edge Function + OpenWeather
- Live Traffic Insights via Supabase Edge Function + TomTom Traffic Flow
- opt-in location with local-only browser caching
- currency selector for USD, EUR, GBP, CAD, MXN, COP, and ARS
- display-only regional currency/date formatting
- milestone share cards for 100 Days Tracked and major XP level-ups

No database schema changes were made.

Live utility requires Supabase secrets:

- `OPENWEATHER_API_KEY`
- `TOMTOM_API_KEY`

### V5.6 - Shift + Hours & Pattern Intelligence

Added:

- manual Start Shift / End Shift workflow
- shift duration tracking
- manual shift mileage
- daily and weekly mileage foundation
- earnings per hour
- earnings per mile
- miles per hour
- Simple / Advanced Performance Mode
- Career Pattern Intelligence
- hourly heatmap in Advanced Mode
- strongest hours
- productivity windows
- morning vs night comparison
- gentle Recovery Windows framing instead of dead-hour language
- best apps by hour when enough shift data exists

Architecture:

- no database schema changes
- shift and mileage data live inside existing `weeks.entries` JSON
- no GPS tracking
- no background location
- no telematics
- no Movement Intelligence automation yet

Known limitation:

- hour/app patterns are directional and derived from manually logged shift windows plus daily/app totals, not per-trip telemetry.

## Current Working Branch

Recent visual/theme/README work is on:

`v5.4.1-night-drive-theme`

Recent commits include:

- `74742b9 Add Night Drive theme`
- `e3dedda Add Pulse Mode and career titles`
- `c541665 Polish project README`

## README

A full GitHub README was created with:

- product vision
- feature overview
- themes
- tech stack
- backend rule
- preview setup
- safety principles
- full changelog
- project philosophy

File:

`README.md`

## Development Workflow

The user often makes changes directly through Lovable.

Important rule:

Before Codex makes new changes, always review/fetch latest GitHub/main changes first because Lovable may have already modified production code.

Preferred workflow:

1. Lovable changes main.
2. Codex reviews latest repo state.
3. Codex creates/uses a branch.
4. User publishes branch via GitHub Desktop if needed.
5. Vercel preview is used before merge.
6. Merge only after preview is confirmed.

## Deployment / Preview

Vercel is configured for previews.

Required env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Framework:

- Vite
- Output: `dist`
- Build: `npm run build`

## Important Safety Notes

Do not break:

- dashboard
- entry
- career
- compare
- journey
- weekly letters
- letters library
- monthly recaps
- share center
- exports
- auth
- Supabase data
- Ask My Data

Prefer additive architecture.

Do not redesign unless explicitly requested.

Do not apply database changes unless the backend is confirmed to be the live Lovable-connected Supabase project.
