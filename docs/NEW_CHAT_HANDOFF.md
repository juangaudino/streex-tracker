# Streex New Chat Handoff

Last audited: 2026-06-30

This is the operational handoff for a new Codex, Claude, ChatGPT, or Lovable conversation. It describes the current repository state and the product decisions that must survive chat resets. Read it before proposing or implementing work.

Also read:

- `AGENTS.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/STREEX_AI_WORKFLOW.md`
- `docs/PRODUCT_STATUS.md`
- `docs/ROADMAP.md`
- `CHANGELOG.md`

## 1. Current Snapshot

- Product: Streex Gig Earnings App.
- Current release: `Beta 0.8.8 - Data Integrity Repair`.
- Production: `https://gig.getstreex.com`.
- Repository: `https://github.com/juangaudino/streex-tracker`.
- Default branch: `main`.
- Current audited commit: `e464f74 Add Career drill-down expansion`.
- Frontend hosting: Vercel.
- DNS and domain: Cloudflare, `getstreex.com`.
- Active backend: owner-controlled Supabase project `ywbrovislvqkfzsyqpiv`.
- Active Supabase URL: `https://ywbrovislvqkfzsyqpiv.supabase.co`.
- Legacy backend: Lovable-managed Supabase project `mnwymfyvvdhekzvipjmp`.
- Never deploy active work to the legacy project unless the owner explicitly requests legacy inspection.

At the time of this audit, local `main` and `origin/main` point to the same commit and the worktree is clean before this documentation update.

## 2. Architecture

### Frontend

- React 18 + TypeScript.
- Vite 5.
- React Router 6.
- Tailwind CSS + shadcn/ui + Radix primitives.
- Recharts for analytics visualization.
- TanStack Query is installed; most core app persistence is handled through custom hooks.
- Lucide icons.
- `html2canvas` for Daily Report image capture.
- Vitest + Testing Library for tests.

### Production Flow

```text
Browser / installed PWA
-> gig.getstreex.com
-> Vercel static Vite deployment
-> owner-controlled Supabase Auth, Postgres, RLS, and Edge Functions
```

Cloudflare manages the domain/DNS and email routing. Cloudflare email routing is not an SMTP sender and does not replace Resend or another outbound email provider.

### Persistence Model

The primary earnings model is intentionally JSON-oriented:

- `weeks` is a user-scoped Supabase table.
- Each week stores an `entries` JSON array.
- Each day contains app earnings, bonuses, shifts/work blocks, mileage, rides through shifts, note metadata, logged state, and closed-day state.
- `user_settings` stores weekly goals, active apps, currency symbol, and Octopus balance.
- `earnings_snapshots` stores observed app-total transitions and timestamps.
- XP, achievements, feedback, admin, runtime config, email campaigns, and access controls use dedicated tables.

Canonical TypeScript models live in `src/lib/types.ts`.

Important data rules:

- Money totals include ordinary earnings and bonuses/rewards.
- Operational efficiency excludes bonuses/rewards.
- Never calculate `$ / hour`, `$ / mile`, `$ / ride`, or shift efficiency without the required valid denominator and attributable operational earnings.
- Stored numeric data is not rewritten for display formatting.
- Daily notes are metadata only and never affect analytics.
- Octopus points are utility state only and never change earnings, rides, records, XP, achievements, or efficiency.
- Quick Add accepts accumulated app totals, not an amount-to-add workflow.

### Supabase Tables Represented in Generated Types

- `account_access_controls`
- `admin_users`
- `ai_usage_logs`
- `app_runtime_config`
- `earnings_snapshots`
- `email_campaign_recipients`
- `email_campaigns`
- `email_preferences`
- `feedback_items`
- `user_achievements`
- `user_settings`
- `weeks`
- `xp_events`

Generated client types: `src/integrations/supabase/types.ts`.

### Edge Functions

- `driver-utility`: OpenWeather + TomTom traffic, authenticated and server-side.
- `admin-ops`: protected admin operations and account controls.
- `admin-email`: re-engagement campaign foundation through Resend when configured.
- `ask-my-data`: analytics context, intent routing, and streaming AI response path; currently still tied to Lovable AI gateway and not considered independently production-ready.

Required secrets vary by function and belong only in Supabase secrets:

- `OPENWEATHER_API_KEY`
- `TOMTOM_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `REPLY_TO_EMAIL`
- `APP_PUBLIC_URL`
- `LOVABLE_API_KEY` only for the legacy/current Ask My Data implementation
- Supabase-provided URL, anon/publishable key, and service role where required

Never put service-role or provider secrets in Vite variables or frontend source.

## 3. Routes and Navigation

Authenticated routes:

- `/` - Dashboard, Standard or Full Focus.
- `/entry` - Weekly Entry and shift editing.
- `/career` - Career intelligence and drill-downs.
- `/assistant` - Ask My Data UI.
- `/journey` - career journey feed.
- `/recap` - monthly recap.
- `/letters` - weekly letters.
- `/achievements` - achievements.
- `/history` - historical weeks.
- `/compare` - existing operational same-point weekly comparison guide.
- `/deep-insights` - desktop-first analytics cockpit and advanced comparison workspace.
- `/settings` - profile, themes, dashboard experience, security, data export, and preferences.
- `/admin` - protected admin operations.
- `/reset-password` - unauthenticated password recovery completion.

Navigation rules:

- Primary navigation: Dashboard, Entry, Career, Ask AI.
- Mobile bottom navigation also includes Progress as the fifth item.
- Desktop keeps Progress in the top navigation.
- Progress menu contains Journey, Monthly Recap, Letters, Achievements, History, Compare, and Deep Insights.
- Profile menu contains Settings, What's New, Feedback, and Sign Out.
- Do not add more permanent header controls without explicit UX review.

## 4. Finished Product Systems

### Authentication and Lifecycle

- Supabase email/password auth.
- Session persistence and defensive restore flow.
- Premium dark splash/auth visual system.
- Reduced-motion support for auth motion.
- Password reset and Change Password in Settings.
- Account restriction handling.
- Optional/required app update notices.
- iOS/PWA resume and safe-area handling.

### Dashboard

- Standard Dashboard and Full Focus modes.
- Current week earnings, goals, pace, records, identity, utility, and operations context.
- Full Focus is intentionally compact and operational.
- Full Focus Day vs Average, Goal bars, Historical Rank, and Conditions have contextual drill-downs.
- Historical Rank supports Day and Week tabs with nearby positions.
- Full Focus Utility Slot rotates deterministically between combined Conditions and Octopus reward progress.
- Weather and traffic remain one combined Conditions surface.

### Entry and Earnings

- Multi-app daily earnings entry.
- Custom app keys can exist in day app records; default apps are Uber, Lyft, Spark Driver, DoorDash, Amazon Flex, Instacart, and Shipt.
- Quick Add/Quick Update for primary apps using accumulated totals.
- Quick Update rides are accumulated per selected app, while miles remain one shared accumulated day total across shifts.
- App ride counts combine into the shift total; historical total-only rides remain unattributed and never receive invented Octopus credit.
- Decimal cents and locale decimal comma handling.
- Optional miles and rides during quick updates.
- Bonus entry by app/date.
- Octopus interpreted as reward/bonus income.
- Daily notes.
- Historical week/day editing.

### Shifts and Work Hours

- Start, Pause, Resume, End Shift.
- Work-block architecture under one shift session.
- Active work duration excludes pauses.
- Miles, ride count, and manual shift earnings recovery.
- Shift attribution uses manual earnings, snapshots, or safe single-shift-day fallback.
- Current-week and lifetime operations snapshots.
- Hours, earnings/hour, earnings/mile, miles/hour, rides, rides/hour where supported.

### Earnings Snapshots

- App earnings transition rows with previous amount, new amount, delta, timestamp, day, week, and optional shift ID.
- Duplicate client writes are guarded in `useWeekStore`.
- Snapshots provide observed update timing, not exact ride-level timestamps.

### Goals and Daily Report

- Weekly earnings goal and weekly hours goal.
- Outcome language distinguishes money, discipline, complete, and elite wins without shaming.
- End Day Daily Report with money, operational metrics, comparisons, weekly impact, records/milestones, narrative, notes, and export/share.
- Export captures the visible report DOM to keep design parity.

### Career, Progression, and History

- Achievements with rarity tiers.
- XP events and Driver Identity.
- Career titles and archetypes.
- Records, rivals, ideal-week comparison, milestones.
- Journey feed, Weekly Letters, Monthly Recaps, History, and operational Compare.
- Career drill-down expansion for monthly progression, best day/week, top earning app, best weekday, and career hourly efficiency.
- Full Focus was explicitly not changed by the Career drill-down release.

### Deep Insights

- Desktop-first `/deep-insights` analytics cockpit.
- Dark control-room and Classic Light treatments.
- Time, app, and weekday filtering.
- KPI strip, trend charts, weekly comparisons, weekday analysis, app contribution, hours, efficiency, rankings, and tables.
- Advanced Comparison workspace for 2-4 day/week/month/year/custom blocks.
- Existing `/compare` remains a separate operational guide.
- URL-backed comparison state.
- Selected micro-visualizations, percentile context, contribution rails, and activity marks.

### Admin and Feedback

- Server-validated admin access.
- User totals, recent/inactive/blocked users, usage context, block/unblock, and soft delete-pending.
- Feedback inbox with type/status management.
- App version/update controls.
- Force logout architecture through runtime configuration.
- Re-engagement email campaign foundation.

### PWA, Branding, and Export

- Manifest, PWA icons, Apple touch icons, and branded favicons.
- Theme-aware `theme-color` and iOS safe area.
- Current STREEX logo variants for light/dark/splash contexts.
- JSON/CSV data export.
- Share cards and Daily Report image share/download.

## 5. Themes and Design Conventions

Implemented theme modes:

- Classic with System, Light, and Dark variants.
- Signature.
- Velocity.
- RPG.
- Night Drive (`night-drive` in code, often called Night in UI conversation).
- Optional Pulse Mode.
- Deep Insights has its own theme-aware dark cockpit / light editorial treatment.

Design rules:

- Mobile-first for live work; desktop-first only for Deep Insights and heavier admin/operations surfaces.
- Calm, premium, driver-centric, high signal-to-noise.
- No redesign unless explicitly approved.
- Full Focus is an operational interface, not a marketing page.
- Do not add cards simply because space exists; every card must earn its place.
- Use drill-downs for depth instead of permanent explanatory text.
- Do not place cards inside cards.
- Use Lucide icons, familiar controls, restrained radius, stable dimensions, safe-area support, and readable touch targets.
- Avoid one-note palettes, decorative gradient blobs, oversized internal headings, and cyberpunk overload.
- Strong visual changes must be discussed before implementation. The owner explicitly dislikes surprise redesigns or visual compromises described as merely "less elegant."
- Weather and traffic stay together in the Conditions utility.
- Full Focus should not be modified as a side effect of Career or Deep Insights work.
- No-shame language: days off and imperfect weeks are valid context, not failure.

## 6. Current Pending Work

### Highest Priority Operations

- Configure a production-grade Supabase Auth SMTP/domain sender; default auth email quota has already caused recovery friction.
- Continue monitoring login/session persistence after the infrastructure migration.
- Confirm in the active Supabase project that the Beta 0.8.0 Octopus migration is applied and the latest `driver-utility` function is deployed.
- Validate Daily Report image export on an installed iOS PWA after current deployment.
- Stabilize bugs before starting another major system.

### Planned Product Work

- Next planned release: `Beta 0.9.0 - Deep Insights Intelligence Layer`.
- Candidate scope: deeper operational patterns, efficiency rankings, duration-vs-earnings, rides/hour, miles/hour, shift density, and richer best/worst detection where data supports it.
- The version number can move if a patch or urgent fix ships first.

### Ask My Data

- Provider replacement is deliberately unresolved.
- Current code still requires Lovable AI gateway credentials.
- Do not spend effort pretending the current integration is independent.
- Future solution should reuse deterministic analytics helpers, preserve server-side auth/RLS, and choose a provider only after cost/privacy/capability review.
- An internal deterministic-only assistant is possible, but the owner has explicitly deferred a full external-AI replacement for now.

### Data and Analytics

- Build a safe historical CSV/Excel import workflow before importing roughly three additional years of history.
- Import must validate dates, apps, numeric values, conflicts, and existing days; never bulk-write production without dry-run/preview.
- Continue improving shift-level earnings attribution from snapshots.
- Historical weather, traffic, market, vehicle, GPS, and ride-level time analysis are blocked until reliable source data is stored.
- Search/browse daily notes across long history remains deferred.

### Utility and Driver Context

- Research aviation data providers before Flight Reservation Tracker or Airport Pulse.
- Traffic Intelligence candidates: delay awareness, incidents, and human-readable severity without navigation/routing.
- Market/geographic intelligence, smart mileage, and vehicle/maintenance systems remain strategic future work.

### Admin and Email

- Configure/verify Resend sender domain and reply-to for production campaigns if re-engagement email is used.
- Cloudflare routing receives email but is not the outbound campaign/auth sender.
- Hard user deletion remains intentionally absent; current action is delete-pending/blocked behavior.

### Long-Term Roadmap

- Operations Center / desktop headquarters.
- Deep Career expansion, consistency/stability analytics, ecosystem risk, collectible achievements, and legacy systems.
- Internationalization and unit preferences are deferred; miles/Fahrenheit remain current assumptions.
- AI conversation archive/export and memory continuity.
- Native SwiftUI app only after the web/PWA product stabilizes.

Read `docs/ROADMAP.md` for the complete preserved roadmap and guardrails.

## 7. Known Bugs, Risks, and Honest Limitations

- Ask My Data is provider-blocked/unverified after leaving Lovable infrastructure; its UI existing does not mean the AI path works.
- Supabase default auth email quota can be exhausted. Custom SMTP is still pending.
- Provider secrets and Edge Function deployments can drift between local repo, Vercel, and Supabase. Verify, never assume.
- Historical shift data is incomplete. Efficiency coverage is much smaller than earnings history, so broad career `$ / hour` values need explicit coverage context.
- Earnings snapshots observe manual update moments. They are not ride timestamps and cannot prove exact best earning hour.
- Multi-shift-day earnings can be unresolved without snapshots or manual shift earnings; honest UI should show no efficiency rather than invent allocation.
- Current model does not reliably store market/location, vehicle, route, historical weather, historical traffic, or per-app hours/miles.
- iOS Safari/PWA process kills still create true cold launches; only short resumes can be made continuous.
- PWA icon changes may be cached by iOS/Android and can require removing/reinstalling the home-screen app.
- Bundle build has a known non-blocking large-chunk warning (over 500 kB). No current production failure is attributed to it.
- `index.html` still contains Lovable-era Open Graph/Twitter image metadata and `@Lovable` Twitter metadata. This is cleanup debt, not a runtime blocker.
- Local `.env` may be stale. Vercel Production variables are the deployment source of truth.
- The repository contains old local/remote branches. Do not merge or delete branches blindly; compare against `main` first.

## 8. Important Files

### Start Here

- `AGENTS.md` - permanent Codex rules.
- `docs/NEW_CHAT_HANDOFF.md` - this handoff.
- `docs/PROJECT_CONTEXT.md` - architecture and infrastructure.
- `docs/PRODUCT_STATUS.md` - living product status.
- `docs/ROADMAP.md` - living roadmap.
- `docs/STREEX_AI_WORKFLOW.md` - tool/AI roles.
- `CHANGELOG.md` and `src/lib/changelog.ts` - release history and current version.

### App Shell and Routes

- `src/App.tsx`
- `src/pages/AppShell.tsx`
- `src/contexts/ThemeContext.tsx`
- `src/index.css`
- `index.html`
- `public/manifest.json`

### Data and Persistence

- `src/lib/types.ts`
- `src/lib/store.ts`
- `src/hooks/useWeekStore.ts`
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `supabase/config.toml`
- `supabase/migrations/`
- `supabase/functions/`

### Earnings and Operations

- `src/pages/WeeklyEntryPage.tsx`
- `src/components/QuickEntryWidget.tsx`
- `src/lib/earningsSnapshots.ts`
- `src/lib/rewardIncome.ts`
- `src/lib/shiftIntelligence.ts`
- `src/lib/weeklyOperations.ts`
- `src/components/ShiftIntelligencePanel.tsx`
- `src/components/EndDayDialog.tsx`

### Dashboard and Utility

- `src/pages/DashboardPage.tsx`
- `src/components/FocusUtilitySlot.tsx`
- `src/components/DailyCommandCenter.tsx`
- `src/components/MetricDrillDownSheet.tsx`
- `src/lib/dashboardExperience.ts`
- `src/lib/driverUtility.ts`
- `src/lib/octopusRewards.ts`

### Career and Analytics

- `src/pages/CareerPage.tsx`
- `src/lib/career.ts`
- `src/lib/careerDrillDowns.ts`
- `src/lib/careerDrillDownDetails.ts`
- `src/pages/DeepInsightsPage.tsx`
- `src/components/AdvancedComparisonBuilder.tsx`
- `src/lib/deepInsights.ts`
- `src/lib/comparisonBuilder.ts`

### Auth, Runtime, and Admin

- `src/hooks/useAuth.ts`
- `src/hooks/useAppRuntime.ts`
- `src/hooks/useAppLifecycle.ts`
- `src/pages/AuthPage.tsx`
- `src/pages/ResetPasswordPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/AdminPage.tsx`
- `src/lib/adminOps.ts`
- `src/lib/appVersion.ts`

### Ask My Data

- `src/pages/AssistantPage.tsx`
- `supabase/functions/ask-my-data/index.ts`
- `supabase/functions/ask-my-data/index.test.ts`
- `docs/ASK_MY_DATA_CHALLENGE_SET.md`

## 9. Development and Deployment Workflow

### Local Commands

```bash
npm install
npm run dev
npm test
npm run build
npm run lint
```

There is no dedicated `typecheck` script. Production build and Vitest are the normal validation baseline. Use narrow tests first, then the full suite and build for meaningful changes.

### Environment Variables

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID` may exist in Vercel even though `.env.example` currently lists only the first two.

Production variables live in Vercel. Do not print their values in chat or docs.

### Deployments

- Pushes to `main` trigger Vercel Production deployment.
- Branch pushes can create Vercel Preview deployments when configured.
- Supabase migrations and Edge Functions do not deploy merely because frontend code was pushed.
- For backend work, explicitly apply/deploy to `ywbrovislvqkfzsyqpiv` and report that requirement.

### Git and Multi-AI Workflow

- GitHub is the source of truth for code.
- Codex should inspect current branch/status before editing.
- Work directly on `main` only when the owner explicitly requests it or the current workflow already establishes it.
- For Lovable visual work, prefer a dedicated branch, let Lovable publish there, inspect the Vercel Preview, then have Codex review the diff before merging.
- Do not let Lovable deploy backend changes to the legacy Supabase project.
- Do not revert unrelated user/Lovable/Claude changes.
- Meaningful changes update both changelogs and relevant roadmap/status docs.
- The owner often asks for a challenge before execution. If a request is exploratory, visually strong, data-sensitive, or says to challenge it, discuss concerns before editing.
- Once the owner approves, implement end-to-end without stopping at a proposal.

### Versioning

- Current baseline: `0.8.2`.
- Patch: focused fix/refinement/polish.
- Minor: meaningful new surface/system.
- `1.0.0`: first stable public release only.
- Alpha `V3.x`-`V5.x` history remains archived.
- Before meaningful implementation, classify/propose the version if the user did not already approve one.

## 10. Product Owner Collaboration Rules

- The owner is comfortable challenging prompts and expects Codex to challenge weak logic before execution.
- Do not silently reinterpret product direction.
- Protect calculations and historical data above visual convenience.
- Strong visual changes require prior agreement; narrow bug fixes can proceed when clearly approved.
- Do not overbuild. Build the smallest complete version that fits the established architecture.
- Preserve routes and stable production behavior.
- When a migration or function deployment is required, explain exactly what the owner must do in Supabase.
- When network restrictions prevent Codex from pushing, create the commit if requested and give the exact `git push origin main` command.
- The owner may use Lovable credits for visual review. Lovable is an optional frontend collaborator, not the production infrastructure owner.
- Claude and ChatGPT may advise on UX/product direction, but repository state and tests decide implementation truth.

## 11. First Actions in the Next Chat

1. Confirm the repository root and current branch.
2. Run `git status --short --branch` and inspect the latest commit.
3. Read this file, `AGENTS.md`, `docs/PRODUCT_STATUS.md`, and `docs/ROADMAP.md`.
4. Do not assume Ask My Data, Edge Function secrets, or migrations are deployed merely because source exists.
5. Ask what the owner wants to tackle next, or continue the explicitly named roadmap item.

The expected next roadmap item is Deep Insights Intelligence Layer, but bug stabilization or infrastructure work may take priority and should renumber the roadmap honestly.
