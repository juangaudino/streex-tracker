# Streex QA Runbook

Use this runbook before a release that changes auth, routing, shared layout, data entry, shifts, or analytics.

## Local quality gate

Run from the repository root:

```bash
npm run validate
```

This runs TypeScript, ESLint, Vitest, and the production build. It does not contact or mutate production data.

Before a dependency release, also run:

```bash
npm audit --omit=dev
```

The target is zero known production dependency vulnerabilities. Development-tool advisories require a separate compatibility review and must not be fixed with a blind major upgrade.

## Local browser smoke

After a production build, run:

```bash
npm run test:e2e:smoke
```

It checks the public sign-in and password-reset routes on mobile and desktop browser profiles. It does not sign in or write data.

## Authenticated QA route smoke

The authenticated suite reads protected routes with a dedicated QA account. It must never use the owner's personal account or create/edit/delete data.

Local execution requires:

```bash
STREEX_E2E_BASE_URL=https://gig.getstreex.com
STREEX_QA_EMAIL=<isolated QA email>
STREEX_QA_PASSWORD=<isolated QA password>
npm run test:e2e:qa -- --project=desktop-chrome
```

GitHub execution is intentionally manual through **Manual QA E2E**. Configure `STREEX_QA_EMAIL` and `STREEX_QA_PASSWORD` as secrets in the protected GitHub `qa` environment before running it.

## CI policy

**Quality Gate** runs automatically for every push and pull request targeting `main`:

- TypeScript typecheck
- ESLint
- Vitest
- Production build

It uses placeholder public Supabase values only to compile the frontend and never connects to the active Supabase project.
