# STREEX deep logic and integrity audit — July 2026

Status: **P1 repairs completed; QA certification still pending**
Branch: `audit/deep-integrity-2026-07`  
Production project: `ywbrovislvqkfzsyqpiv` (confirmed active/healthy, PostgreSQL 17.6)  
Mutation policy: production queries were `SELECT` only. No production row, function, policy, migration, secret, or version was changed.

## Approval matrix

| Area | Evidence | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | Pass |
| Unit/contracts | Vitest plus `weekIntegrity.test.ts` | Pass: 21 files, 82 tests |
| Production build | Vite production build | Pass; bundle warning retained as P3 |
| Lint | Existing baseline | 41 errors, 15 warnings; P3 debt, separated from functional findings |
| Production JSON | `audit/production-readonly.sql` plus targeted SELECTs | Completed; findings below |
| RLS/schema | Deployed catalog, policies and Supabase advisors | Completed statically; two-identity active test pending QA identities |
| Persistence flows | QA-only Playwright contract | Authenticated execution pending dedicated QA credentials |
| Mobile/desktop routes | `e2e/critical-surfaces.spec.mjs` | Harness added; production mobile auth shell passed with zero console errors; authenticated run pending |
| Edge Functions | Static auth, validation, provider and secret-boundary review | Completed; destructive/email live calls intentionally not executed |
| Ask My Data | Existing deterministic tests and static review | Provider quality not certified while Lovable gateway remains the dependency |

## Production aggregate results

Scope: 59 weeks, 413 days, 34 shifts, 361 snapshots, one anonymized data owner. No personal fields or raw earnings were returned.

Passed with zero anomalies:

- Week/day date format, seven-entry week shape, week status and weekly goals.
- Non-numeric or negative app earnings/bonuses, negative day mileage, shift earnings, shift mileage and rides.
- Inverted/overlapping shifts and shifts assigned to the wrong day.
- `ridesByApp` exceeding `rideCount`.
- Snapshot arithmetic, orphan snapshots, snapshots outside their week/day and negative snapshot endpoints.
- Missing or duplicate settings.
- Deployed and checked-in generated types expose the same 13 public tables; current generated types include weekly-hours and Octopus fields.

Observed anomalies at audit time (repaired in Beta 0.8.8):

- 7 days have stored shift-mile components whose sum exceeds authoritative `day.mileage`.
- 3 stored shifts contain work blocks outside their edited shift boundary.
- 4 duplicate snapshot transition groups contain 6 redundant rows.

Anonymized references are retained for an approved repair release: mileage weeks `b9c21d5b`, `fdc124da`, `186cfec7`, `11c73a26`, `797715c5`; block-boundary weeks `797715c5`, `fdc124da`; duplicate-snapshot weeks `b9c21d5b`, `797715c5`, `11c73a26`.

## Findings

### Resolved P1 — Stored shift mileage disagreed with the canonical day total

Impact: seven historical days contain internally contradictory attribution. Current analytics use `day.mileage` as authoritative, limiting visible overcounting, but per-shift inspection/export or future logic can reinterpret the stale components.

Root cause: mileage previously accepted accumulated daily values as if they were per-shift values. The current normalization prevents new instances but does not repair historical JSON.

Reproduction: compare `sum(day.shifts[*].miles)` with `day.mileage` in the read-only audit.

Resolution: repaired from the most recent shift backwards after full-week backup. Verification: zero remaining cases and no canonical total changed.

### Resolved P1 — Persisted work blocks exceeded edited shift boundaries

Impact: three stored shifts disagree with their edited boundary. Current duration helpers clamp blocks at read time, so displayed hours may be correct while stored JSON remains contradictory.

Root cause: historical boundary edits did not always rewrite the first/last block. The current UI correction does not retroactively normalize stored records.

Resolution: affected blocks were clamped to edited boundaries after backup; valid pause intervals were retained. Verification: zero remaining cases.

### Resolved P1 — Duplicate earnings snapshot transitions existed

Impact: six redundant rows across four transition groups can inflate timing observation counts even when earnings deltas are deduplicated in some calculation paths.

Root cause: client-side duplicate prevention is not a database uniqueness guarantee and concurrent/retried writes can pass the in-memory guard.

Resolution: six redundant rows were backed up and removed. A revision-scoped event key and full unique constraint now reject retries while permitting later correction cycles; older clients receive automatic legacy keys during rollout.

### P1 — Runtime week validation was previously compile-time only

Impact: malformed JSON could hydrate as a `WeekRecord` via a TypeScript cast and contaminate every surface.

Audit control added: Zod structural parsing rejects malformed week JSON, while semantic checks report contradictions without hiding readable historical data. This is detection/containment; it does not alter stored rows.

### P2 — Full persistence and cross-user RLS certification is pending

The deployed policies consistently use ownership predicates and all public tables have RLS enabled. However, active proof requires two dedicated QA identities and a controlled create/reload/edit/close/reopen/offline/cleanup cycle. No existing personal account was repurposed for this test.

### P3 — Security and quality hardening

- Supabase advisor: leaked-password protection is disabled.
- Supabase performance advisor: 22 RLS init-plan warnings, 9 unindexed foreign keys and 9 currently unused indexes.
- ESLint baseline: 41 errors and 15 warnings.
- Vite reports a large production bundle; this is a performance risk, not a data-integrity failure.
- Edge Functions allow `Access-Control-Allow-Origin: *`; authenticated functions still validate JWTs. Restricting origin is defense-in-depth, not a substitute for auth.

## Edge Function review

- `driver-utility`: JWT required, coordinates bounded, provider secrets remain server-side, and live/not-configured/unavailable payloads degrade safely.
- `admin-ops`: JWT plus enabled admin lookup precedes service-role operations; self-restriction is rejected. No mutation was invoked in this audit.
- `admin-email`: JWT/admin gate and server-side Resend key are present. No email was sent.
- `ask-my-data`: JWT required and user-scoped client is used for context. Provider quality remains uncertified while the Lovable gateway is the upstream dependency.

## Release backlog

1. **Integrity repair release:** completed as Beta 0.8.8.
2. **QA certification release:** dedicated QA identities, cross-user RLS test, full persistence/offline round trip and Playwright mobile/desktop evidence.
3. **Security hardening release:** leaked-password protection, reviewed RLS init-plan optimizations and origin policy.
4. **Quality/performance release:** lint classification/fixes and route-level bundle splitting.

## Certification decision

STREEX is **not yet fully certified** under the requested standard because the mutable QA/RLS matrix has not been executed. All production P1 data inconsistencies found by this audit are resolved, backed up and independently re-scanned to zero.

Environment note: installing `@playwright/test` could not complete through the restricted package network, so it was not added partially or left out of sync with the lockfile. The committed harness becomes runnable after an approved dependency installation and QA credentials are available.
