# Streex QA Runbook

Use this runbook before a release that changes auth, routing, shared layout, data entry, shifts, or analytics.

## Local quality gate

Run from the repository root:

```bash
npm run validate
```

This runs TypeScript, ESLint, Vitest, and the production build. It does not contact or mutate production data.

For a complete local release pass after Playwright browsers are installed:

```bash
npm run certify
```

This adds the anonymous sign-in and password-recovery browser smoke on the mobile and desktop profiles.

Before a dependency release, also run:

```bash
npm audit --omit=dev
```

The target is zero applicable production dependency vulnerabilities. Any remaining advisory needs a documented applicability decision; development-tool advisories require a separate compatibility review and must not be fixed with a blind major upgrade.

Beta 0.9.5 currently uses React Router 7.18.2. The remaining production audit advisory, `GHSA-qwww-vcr4-c8h2`, is explicitly limited by its maintainer to unstable React Server Components APIs. Streex is a client-only Vite SPA using declarative `BrowserRouter` routes and does not use RSC or server actions. Keep the exception visible until a compatible patched package is published; do not downgrade to a release with broader SPA redirect advisories merely to make the audit counter disappear.

## Local browser smoke

After a production build, run:

```bash
npm run test:e2e:smoke
```

It checks the public sign-in and password-reset routes on mobile and desktop browser profiles. It does not sign in or write data.

## Authenticated release certification

The authenticated suite reads protected routes with a dedicated QA account. It covers desktop and mobile, verifies the Beta 0.9.4 Operational Explorer and Driver Playbook entry points, and confirms that a normal account fails closed at the admin boundary. It must never use the owner's personal account or create, edit, or delete data.

Local execution requires:

```bash
STREEX_E2E_BASE_URL=https://gig.getstreex.com
STREEX_QA_EMAIL=<isolated QA email>
STREEX_QA_PASSWORD=<isolated QA password>
npm run test:e2e:qa -- --project=desktop-chrome
```

The RLS certification signs in as two isolated QA identities and proves in both directions that owner-visible `user_settings`, `user_onboarding`, and `weeks` rows cannot be read by the other identity. It is strictly read-only:

```bash
STREEX_SUPABASE_URL=<active project URL>
STREEX_SUPABASE_PUBLISHABLE_KEY=<public publishable key>
STREEX_QA_EMAIL=<first isolated QA email>
STREEX_QA_PASSWORD=<first isolated QA password>
STREEX_QA_ALT_EMAIL=<second isolated QA email>
STREEX_QA_ALT_PASSWORD=<second isolated QA password>
npm run test:rls:qa
```

Each QA identity needs at least one owner-visible settings, onboarding, or week row. Signing into the production app once is normally sufficient to initialize its owner-scoped setup data.

GitHub execution is intentionally manual through **Manual QA E2E**. Configure these protected `qa` environment secrets before running it:

- `STREEX_QA_EMAIL`
- `STREEX_QA_PASSWORD`
- `STREEX_QA_ALT_EMAIL`
- `STREEX_QA_ALT_PASSWORD`
- `STREEX_SUPABASE_URL`
- `STREEX_SUPABASE_PUBLISHABLE_KEY`

The workflow installs Chromium and WebKit, runs protected-route certification in both browser profiles, and then runs the bidirectional RLS check.

## CI policy

**Quality Gate** runs automatically for every push and pull request targeting `main`:

- TypeScript typecheck
- ESLint
- Vitest
- Production build
- Read-only public authentication/recovery browser smoke in Chromium

It uses placeholder public Supabase values only to compile the frontend and never connects to the active Supabase project.

## Release evidence and approval boundary

Beta 0.9.4 was exercised by the owner in real work for more than one week with no reported regression in the implemented Operational Explorer, Driver Playbook, or canonical work flows. That real-use result is accepted as its functional approval and is not replaced by synthetic browser tests.

Beta 0.9.5 certification is complete only when:

- `npm run validate` passes;
- the automatic GitHub **Quality Gate** passes after publication;
- the manual **Manual QA E2E** workflow passes with two isolated identities;
- the production bundle and public metadata match the committed release;
- no unexplained Supabase migration, function, Auth, or RLS drift remains.
