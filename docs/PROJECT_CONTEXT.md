# Streex Project Context

This document is the durable project context for new chats and contributors. Keep it current when architecture or major product rules change. Do not place secrets here.

## Product

Streex is a mobile-first gig earnings tracker evolving into a professional identity and performance intelligence system for gig workers.

Core philosophy:

- Identity over money.
- No shame analytics.
- Days off are legitimate.
- The user's own history is the benchmark.
- Data belongs to the user.
- Utility should support the driver's real day without creating dashboard clutter.

## Versioning

Streex is currently in public beta versioning:

`Beta 0.1.0`

Older `V3.x` through `V5.x` labels are Alpha Archive history. Keep them for continuity, but do not use the old Alpha sequence for new beta work.

## Repository

Repository name:

`streex-tracker`

The repository root is the folder containing `AGENTS.md`, `README.md`, `src/`, and `supabase/`.

Do not store owner-specific absolute filesystem paths in tracked documentation. Local paths may be kept in an ignored local `START_HERE.md`.

## Architecture

Streex uses one backend only:

```text
Lovable app
-> live Lovable-connected Supabase backend
-> all Streex data and persistence
```

Live Supabase project:

`mnwymfyvvdhekzvipjmp`

Rules:

- Do not create or assume another Supabase project.
- Apply migrations only to the confirmed live Lovable-connected backend.
- No external backend unless explicitly approved.
- Never expose secrets in frontend code.
- Edge Functions and migrations may require Lovable to deploy them to the live backend.

## Technology

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase Postgres
- Supabase Edge Functions
- Lovable AI Gateway
- OpenWeather
- TomTom Traffic

## Data Rules

- Stored earnings remain raw numeric values.
- Currency and regional formatting are display-only.
- Exports must preserve raw numeric data.
- User-scoped data must remain protected by auth and RLS.
- Ask My Data must use full history by default unless the user explicitly requests a bounded timeframe.

## Key Systems

- Dashboard and Full Focus operational mode
- Weekly Entry, Quick Add, historical week editing
- Shift blocks, hours, manual mileage, and efficiency metrics
- Pattern Intelligence and performance modes
- Daily Command Center with weather and traffic
- Achievements, XP, Driver Identity, records, rivals, and career titles
- Ask My Data analytics assistant
- Weekly letters, monthly recaps, journey, history, and compare
- Share cards and data exports
- Admin Ops, feedback inbox, app version control, and re-engagement email foundation

## Important Files

- `AGENTS.md`: Codex instructions
- `docs/STREEX_AI_WORKFLOW.md`: AI/tool operating system
- `docs/PRODUCT_STATUS.md`: living feature and release status
- `docs/ASK_MY_DATA_CHALLENGE_SET.md`: Ask My Data QA certification prompts
- `CHANGELOG.md`: detailed release history
- `src/lib/changelog.ts`: in-app release history and current version
- `supabase/config.toml`: confirmed Supabase project reference

## Development Workflow

Lovable may modify production code directly. Before Codex makes changes:

1. Check the current repo state.
2. Review latest changes when relevant.
3. Work with existing patterns.
4. Avoid reverting user or Lovable changes.
5. Validate before reporting completion.
6. Tell the user when an Edge Function or migration still needs live deployment.

## Deployment

Vercel previews use:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Build:

```text
npm run build
```

Output:

```text
dist
```
