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

Streex is currently in public beta versioning.

Current release:

`Beta 0.8.3`

Older `V3.x` through `V5.x` labels are Alpha Archive history. Keep them for continuity, but do not use the old Alpha sequence for new beta work.

## Repository

Repository name:

`streex-tracker`

The repository root is the folder containing `AGENTS.md`, `README.md`, `src/`, and `supabase/`.

Do not store owner-specific absolute filesystem paths in tracked documentation. Local paths may be kept in an ignored local `START_HERE.md`.

## Architecture

Streex uses one active production backend only:

```text
Vercel app at gig.getstreex.com
-> owner-controlled Supabase backend
-> all Streex data and persistence
```

Production app:

`https://gig.getstreex.com`

Active Supabase project:

`ywbrovislvqkfzsyqpiv`

Active Supabase URL:

`https://ywbrovislvqkfzsyqpiv.supabase.co`

Legacy Lovable-managed Supabase project:

`mnwymfyvvdhekzvipjmp`

Rules:

- Do not create or assume another Supabase project.
- Apply migrations only to the confirmed active Supabase backend.
- Treat `mnwymfyvvdhekzvipjmp` as legacy context unless the user explicitly asks to inspect or compare it.
- No external backend unless explicitly approved.
- Never expose secrets in frontend code.
- Edge Functions and migrations should target `ywbrovislvqkfzsyqpiv` unless the user explicitly says otherwise.

## Technology

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase Postgres
- Supabase Edge Functions
- OpenWeather
- TomTom Traffic
- Vercel
- Cloudflare

Historical/optional tooling:

- Lovable-assisted visual iteration
- Lovable AI Gateway, if still configured for Ask My Data until replaced

## Data Rules

- Stored earnings remain raw numeric values.
- Currency and regional formatting are display-only.
- Exports must preserve raw numeric data.
- User-scoped data must remain protected by auth and RLS.
- Ask My Data must use full history by default unless the user explicitly requests a bounded timeframe.

## Key Systems

- Dashboard and Full Focus operational mode
- Full Focus Utility Slot with Conditions and Octopus reward progress
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
- `docs/NEW_CHAT_HANDOFF.md`: complete operational handoff for new chats and contributors
- `docs/STREEX_AI_WORKFLOW.md`: AI/tool operating system
- `docs/PRODUCT_STATUS.md`: living feature and release status
- `docs/ASK_MY_DATA_CHALLENGE_SET.md`: Ask My Data QA certification prompts
- `CHANGELOG.md`: detailed release history
- `src/lib/changelog.ts`: in-app release history and current version
- `supabase/config.toml`: confirmed Supabase project reference

## Development Workflow

Lovable may still modify code through GitHub or connected project tooling. Before Codex makes changes:

1. Check the current repo state.
2. Review latest changes when relevant.
3. Work with existing patterns.
4. Avoid reverting user or Lovable changes.
5. Validate before reporting completion.
6. Tell the user when an Edge Function or migration still needs deployment to the active Supabase project.

## Deployment

Production hosting:

`Vercel`

Production domain:

`https://gig.getstreex.com`

Vercel uses:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Build:

```text
npm run build
```

Output:

```text
dist
```

## Infrastructure Status

Cloudflare is active for `getstreex.com`.

`gig.getstreex.com` points to Vercel Production.

The active app now uses the owner-controlled Supabase project `ywbrovislvqkfzsyqpiv`.

Use `docs/MIGRATION_READINESS_CHECKLIST.md` as historical migration context, not as the current production state.
