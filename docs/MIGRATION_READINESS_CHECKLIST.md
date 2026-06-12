# Streex Gig Earnings Migration Readiness Checklist

Status: planning only. No production migration has been performed.

This document tracks the safe path for moving Streex Gig Earnings away from Lovable-managed hosting/backend dependencies. It is based on the local repo plus the `streex-migration.zip` package generated from the current Lovable-connected Supabase project.

Do not store secrets in this file.

## Current Decision

Migration scope is owner-first:

- Preserve and migrate the owner's account data.
- The owner account is the large production dataset.
- Other beta/test users can be retired or re-created later.
- This reduces Auth migration complexity and makes a controlled staging migration realistic.

## Current Architecture Snapshot

Current production backend:

```text
Lovable-connected Supabase project
project ref: mnwymfyvvdhekzvipjmp
```

Current frontend can be deployed on Vercel with:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Current Edge Functions:

- `ask-my-data`
- `admin-ops`
- `admin-email`
- `driver-utility`

Current external services:

- Lovable AI Gateway for Ask My Data
- OpenWeather
- TomTom
- Resend
- Cloudflare DNS/email routing

## Migration Package Inventory

Source package:

```text
streex-migration.zip
```

Contents reviewed:

- `01_schema_public.sql`
- `02_data_public.sql`
- `03_data_ai_usage_logs.sql`
- `supabase_functions_and_config/`
- `.env.example`
- `config.toml.example`

Important: the package contains real user data and partial AI prompt logs. Treat it as sensitive. Do not commit the ZIP or extracted SQL data files.

## Readiness Matrix

### Ready

These items are useful as-is for planning or staging.

- The package includes a full `public` schema dump with tables, primary keys, foreign keys, indexes, RLS policies, and row security enabled.
- The package includes data dumps for current public tables.
- The package includes current Edge Function source code.
- The package identifies the environment variables that the frontend must change when a new Supabase project is used.
- The app already has a Vercel config and can build to `dist`.
- No Supabase Storage dependency was detected in the repo.

### Needs Cleanup

These items should be cleaned before applying anything to a new Supabase project.

- `01_schema_public.sql` is a `pg_dump` style file, not a clean SQL Editor paste.
- The schema dump includes `CREATE SCHEMA public;`, but a new Supabase project already has a `public` schema.
- The repo's historical migrations include duplicate or variant migration files for several features. Use the schema dump or a cleaned baseline, not both.
- `02_data_public.sql` and `03_data_ai_usage_logs.sql` use `COPY ... FROM stdin`, so they should be loaded with `psql`, not pasted into the dashboard SQL editor.
- `app_runtime_config` in the dump still contains older version metadata. It should be reviewed before import so the new environment does not force stale update behavior.
- `admin-email` has a fallback `APP_PUBLIC_URL` of `https://streex.app`; staging/production should set this explicitly to the correct domain.
- `ask-my-data` still calls the Lovable AI Gateway and requires `LOVABLE_API_KEY`.

### Needs Owner Decision

These choices should be decided before staging import.

- Auth strategy:
  - Option A: create a new Supabase user for the owner, then remap all owner-owned rows to the new owner UUID.
  - Option B: migrate Auth with preserved UUIDs if Supabase tooling and access allow it.
- Whether to import `ai_usage_logs` into the new project or archive them outside the live app.
- Whether to import old feedback/email campaign rows or start those admin tables clean.
- Whether `app_runtime_config.forced_logout_after` should be preserved, cleared, or reset for the new deployment.
- Whether Ask My Data should temporarily keep Lovable AI Gateway or be migrated to a new AI provider before backend cutover.
- Whether the first live cutover should be:
  - Vercel only, still pointing to current Supabase, or
  - full Vercel + new Supabase after staging rehearsal.

### High Risk

These items can break production or cause data loss if rushed.

- Importing public data before Auth user IDs exist or before user IDs are remapped.
- Accidentally running migration SQL against the current production Supabase project.
- Exposing `SUPABASE_SERVICE_ROLE_KEY` in frontend/Vercel public environment variables.
- Assuming the migration package removes Lovable dependency while Ask My Data still uses Lovable AI Gateway.
- Mixing the schema dump with historical migrations in the same fresh project without reconciling duplicates.
- Changing production frontend variables to a new Supabase project before staging validates login, RLS, weeks, snapshots, admin, Edge Functions, and Ask My Data.

## Owner-Only Migration Path

Because only the owner account needs to be preserved, the safest staging strategy is:

1. Create a new Supabase staging project.
2. Create or invite the owner user in the new project.
3. Capture the new owner `auth.users.id`.
4. Import a cleaned schema.
5. Remap owner-owned data from the old owner UUID to the new owner UUID during import.
6. Import only the owner data required for the app:
   - `weeks`
   - `user_settings`
   - `user_achievements`
   - `xp_events`
   - `earnings_snapshots`
   - `admin_users`
   - optionally `feedback_items`
   - optionally `ai_usage_logs`
   - optionally email/admin campaign tables
7. Deploy Edge Functions.
8. Set Edge Function secrets.
9. Configure Auth URLs.
10. Point a staging frontend build at the staging Supabase project.
11. Validate app behavior before any production cutover.

## Recommended Staging Plan

### Phase 1: Vercel Independence First

Goal: move hosting/domain without touching data.

Use Vercel with the current Supabase project:

- `VITE_SUPABASE_URL=https://mnwymfyvvdhekzvipjmp.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=<current publishable key>`
- `VITE_SUPABASE_PROJECT_ID=mnwymfyvvdhekzvipjmp`

Configure Supabase Auth for:

- `https://gig.getstreex.com`
- `https://gig.getstreex.com/**`
- local development URLs as needed
- Vercel preview URLs if needed

### Phase 2: Supabase Staging Project

Goal: rehearse the backend move safely.

Create a new Supabase project for staging. Do not point production to it.

Prepare:

- cleaned schema file
- owner-only data import
- UUID remap plan
- Edge Function deploy commands
- secrets checklist
- validation checklist

### Phase 3: Staging Validation

Validate:

- login/signup/password reset
- owner data loads
- dashboard totals
- Entry week editing
- shift blocks
- earnings snapshots
- Daily Report
- Ask My Data
- admin page
- feedback
- app runtime config
- weather/traffic
- email admin functions if enabled

### Phase 4: Lovable AI Gateway Replacement

Goal: remove final Lovable backend dependency.

Ask My Data currently uses Lovable AI Gateway. Before declaring full Lovable independence, replace or intentionally retain this dependency.

Options:

- temporarily keep Lovable AI Gateway only for Ask My Data
- migrate Ask My Data to another AI provider through the new Supabase Edge Function

### Phase 5: Production Cutover

Only after staging passes:

1. Freeze writes briefly if needed.
2. Export latest owner data from current Supabase.
3. Import/remap into new Supabase.
4. Deploy Edge Functions.
5. Set secrets.
6. Update Vercel environment variables.
7. Redeploy frontend.
8. Validate production.
9. Keep old Supabase as backup until confidence is high.

## Secrets Checklist

Do not commit these values.

Frontend/Vercel public variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Supabase Edge Function secrets:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LOVABLE_API_KEY` or replacement AI provider secret
- `OPENWEATHER_API_KEY`
- `TOMTOM_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `REPLY_TO_EMAIL`
- `APP_PUBLIC_URL`
- optional `AMD_DEBUG`

## Validation Checklist

Minimum checks before production cutover:

- Owner can sign in.
- Owner sees correct historical week count.
- Current week total matches the source system.
- Historical totals match the source system.
- Earnings snapshots exist and load.
- Shift metrics work without fake hourly values.
- Ask My Data answers from full history.
- Admin owner access works.
- Block/unblock checks do not block the owner.
- App update modal is not stuck in required-update mode.
- Password reset redirects to the correct domain.
- Edge Function logs show no missing-secret errors.
- RLS prevents access across users.

## Current Recommendation

Do not run the ZIP against production.

Use it as a source artifact for a cleaned staging migration. The next safe technical step is to build a staging migration script that:

- creates only the needed schema,
- avoids duplicate historical migrations,
- supports owner-only UUID remapping,
- imports only selected tables,
- and can be tested against a disposable Supabase project.
