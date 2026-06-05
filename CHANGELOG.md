# Changelog

## Beta Releases

### Beta 0.3.0 — Work Hours, Ride Count + Daily Report Intelligence

### Added

- Added Ride Count foundation to shift blocks so rides can be captured alongside start time, end time, and miles.
- Added weekly hours goal support as a separate optional commitment target from the existing weekly earnings goal.
- Added goal-outcome classification for Money Victory, Discipline Victory, Complete Victory, Elite Week, and Building Week.
- Added richer Work Hours Intelligence metrics for hours, rides, earnings per ride, rides per hour, minutes per ride, and related operational efficiency.
- Added Daily Report 2.0 to the End Day flow with daily summary, performance context, weekly impact, shift intelligence, narrative insights, and export/share actions.
- Added a dedicated branded daily report image layout for download/share rather than capturing app controls.

### Changed

- Entry now separates Money and Hours goals and shows rides in the weekly Shift + Mileage summary.
- Shift Intelligence snapshots now include ride-count context when the user has entered rides.
- Dashboard Full Focus shows optional weekly hours goal progress when configured.
- Ask My Data context now includes tracked shift hours, rides, miles, and efficiency summaries for supported hours/rides questions.

### Backend / Migration

- Added a small additive migration for `weekly_hours_goal` on `weeks` and `default_weekly_hours_goal` on `user_settings`.
- Ride Count is stored inside existing shift blocks in `weeks.entries`; no separate shifts table was created.

### Known Limitations

- Ride Count is manual-first and only appears where the user enters it.
- Streex still does not receive individual ride timestamps, so real best earning hour remains unsupported.
- Daily Report XP feed remains hidden until XP events are reliably associated with the closed day.
- Report sharing depends on browser Web Share support; unsupported browsers fall back to download.

### Beta 0.2.3 — Operations Scope Clarity

### Changed

- Career Shift Intelligence now labels its snapshot as Lifetime Operations Snapshot so historical scope is clear.
- Dashboard now surfaces This Week Operations Snapshot for current-week hours, efficiency, miles, work blocks, active shifts, and average shift context.
- Weekly operations reuse the existing Shift Intelligence calculation path with current-week data only.
- Current-week earnings snapshots are filtered to the active week so Dashboard timing context does not mix career history.

### Production Behavior

- No database schema, stored earning amounts, auth, XP, achievements, Ask My Data backend logic, exports, or Supabase project architecture behavior changed.

### Beta 0.2.2 — Reward Income Classification

### Changed

- Octopus is now treated as reward income for operational performance calculations.
- Reward income still counts in real day totals, week totals, records, Best Day, exports, and general earnings history.
- Shift efficiency, earnings per hour, earnings per mile, hourly timing, and app-by-hour patterns now exclude reward income so work performance is not distorted.
- Existing Octopus history is automatically interpreted as reward income by app name, with no historical data migration or manual recoding required.

### Production Behavior

- No database schema, stored earning amounts, auth, XP, achievements, Ask My Data backend logic, exports, or Supabase project architecture behavior changed.

### Beta 0.2.1 — Late Earnings Adjustment Handling

### Fixed

- Late tips and historical earning edits now keep improving real day, week, record, efficiency, and Ask My Data totals.
- Historical earning adjustments are excluded from observed timing patterns when the update is saved after the original work day.
- Observed Update Hour now uses same-day earning updates only, preventing old tips from making the edit time look like a strong earning hour.

### Production Behavior

- No database schema, earnings storage, exports, auth, XP, achievements, Ask My Data logic, or Supabase project architecture behavior changed.

### Beta 0.2.0 — Earnings Snapshots + Honest Pattern Intelligence

### Added

- Added Earnings Snapshots V1 to record lightweight earning-update deltas when app earnings change.
- Added an `earnings_snapshots` migration with user-scoped RLS policies for future Lovable/Supabase deployment.
- Added snapshot-aware Shift Intelligence so timing patterns can use saved earning updates when enough update history exists.

### Changed

- Replaced Strong Hour language with more honest timing labels such as Observed Update Hour and Estimated Window.
- Hourly Heatmap now explains whether it is based on saved earnings updates or estimated from completed shift duration.
- Morning vs Night copy now distinguishes earning-update observations from shift-duration estimates.

### Known Limitations

- Earnings Snapshots are update-based, not ride-level timestamps.
- Until the migration is deployed to the live Lovable-connected backend, normal week saving continues but snapshot capture is skipped gracefully.
- Estimated timing remains directional only because Streex does not yet receive individual ride timestamps.

### Production Behavior

- No existing earning values, exports, Ask My Data logic, auth, XP, achievements, or Supabase project architecture behavior changed.

### Beta 0.1.2 — Shift Blocks Mobile Layout Fix

### Fixed

- Fixed mobile Shift Blocks editing layout so Start and End time fields no longer overlap or spill outside the card.
- Rebalanced Miles editing with the delete action so the miles field stays readable and proportional on narrow screens.
- Applied the same responsive safeguard to expanded weekly shift rows.

### Production Behavior

- No shift calculations, persistence, earnings data, auth, Ask My Data, XP, exports, backend schema, or Supabase architecture behavior changed.

### Beta 0.1.1 — Ask My Data Mobile Composer Fix

### Fixed

- Stabilized the Ask My Data mobile composer so it stays compact and contained when the iOS/Safari keyboard opens.
- Isolated the conversation scroll region and added safe-area-aware composer spacing to reduce visual overflow on mobile.
- Prevented the input area from expanding excessively while still allowing short multi-line prompts.

### Added

- Added browser-native voice input for Ask My Data when supported by the device/browser.
- Added graceful unsupported-state messaging when voice input is unavailable.
- Added Copy Conversation for copying the current Ask My Data chat as readable plain text.

### Production Behavior

- No Ask My Data analytics logic, auth, navigation, earnings data, backend schema, XP, exports, or Supabase architecture behavior changed.

### Beta 0.1.0 — Baseline

### Changed

- Reset Streex public versioning for beta using `0.x` semantic versions.
- Preserved the previous `V5.x` release history as the Alpha Archive instead of deleting it.
- Updated app version comparison so stale Alpha `V5.x` settings do not incorrectly block the Beta app as a newer update.
- Established the working rule that future prompts, bug fixes, polish sessions, and roadmap additions should be classified before assigning a version number.

### Current Beta Baseline Includes

- Full Focus operational dashboard.
- Shift + Mileage tracking foundation.
- Ask My Data intent routing and challenge-set QA foundation.
- Admin Ops, feedback inbox, app version control, and re-engagement email foundation.
- Daily Command Center with OpenWeather and TomTom.
- Branded iOS, Android, and browser PWA icons.

### Production Behavior

- No dashboard, auth, earnings, shifts, analytics, XP, exports, navigation, Supabase schema, or backend architecture behavior changed.

## Alpha Archive

The entries below are preserved as internal Alpha development history. They remain valuable for product memory, QA context, and changelog continuity, but public beta versioning now starts at `0.1.0`.

## V5.7.9 — Branded PWA App Icons

### Fixed

- Added a production manifest with branded Streex application icons for installed Android PWAs.
- Added explicit Apple touch icons for iPhone and iPad Home Screen installation.
- Added branded PNG favicon references for supported browser tab sizes.
- Replaced generic icon fallback behavior with stable public icon URLs.

### Production Behavior

- No dashboard, auth, earnings, shift, analytics, XP, exports, navigation, or backend behavior changed.
- Users with an existing Home Screen installation may need to remove and add Streex again because iOS and Android cache installed app icons aggressively.

## V5.7.8 — App Resume Persistence Audit

### Fixed

- Supabase auth restoration now relies on the initial auth session event instead of racing it against a separate session lookup.
- Auth state is cached in memory so React remounts and quick app resumes do not briefly fall back to login or replay the splash screen.
- Runtime access and version checks retain their last validated state during background refreshes instead of blocking the full app again.
- Update notices now appear only when the configured deployed version is newer than the client, preventing stale version settings from blocking a newer build.
- Week, settings, and active-shift state retain the last hydrated in-memory snapshot while the backend refreshes.
- Dashboard, Settings, Journey, Achievements, and the persistent app header now reuse the root authenticated user instead of creating competing auth subscriptions.

### Diagnostics

- Added development-safe lifecycle logging for app mount, splash reasons, auth restoration, visibility/page events, runtime checks, version checks, hydration, and intentional update reloads.
- Production logging remains quiet unless `streex_debug_lifecycle` is explicitly set to `1` in local storage.

### Production Behavior

- No database schema, navigation, dashboard design, earnings calculations, XP, achievements, exports, or Supabase backend architecture changes were made.
- A true cold launch, intentional refresh, or iOS process termination may still show the splash while the session is restored.

## V5.7.7 — Ask My Data Intent Router

### Fixed

- Added Ask My Data intent routing before answer selection.
- Prevented hour, streak, and month questions from falling through to best-day rankings.
- Added deterministic support for strongest month, highest earning streak, current goal pace, today ranking, closest record, and combined weekend trend.
- Added clearer capability-aware responses for unsupported hourly, location, ride-type, and rival/version questions.
- Added data-backed Insight / Evidence / Opportunity responses for insight and coaching prompts.

### QA

- Added `docs/ASK_MY_DATA_CHALLENGE_SET.md` for repeatable Ask My Data manual certification.

### Production Behavior

- No database schema changes were added for V5.7.7.
- No auth, dashboard, earnings storage, XP, achievements, exports, or roadmap systems were changed.

## V5.7.6 — Master Consolidation Polish

### Fixed

- Removed the generic standalone motivation banner between Utility and record context.
- Stabilized Ask My Data mobile layout with a scrollable message region and fixed input area.
- Fixed Ask My Data consecutive day-off reasoning to compare combined weekday-pair averages.
- Added a dedicated active shift card in Entry.
- Renamed historical shifts to `This Week's Shifts (N)`.
- Converted historical shift blocks into compact expandable rows.
- Balanced mobile shift edit fields so Start, End, Miles, and Delete no longer overlap.

### Production Behavior

- No database schema changes were added for V5.7.6.
- No XP, achievements, rival systems, auth, exports, dashboard calculations, or roadmap systems were changed.

## V5.7.5 — Admin Re-Engagement Email

### Added

- Manual User Re-Engagement email panel in Admin Ops.
- Test email flow before broadcasting to users.
- Audience options: test, specific user, inactive users, and all active users.
- Editable campaign subject, message, and app link.
- `APP_PUBLIC_URL` support for default app link, with admin override before send.
- Server-side `admin-email` Edge Function for sending through Resend.
- Marketing unsubscribe support through tokenized unsubscribe links.
- Email campaign and recipient audit tables.

### Production Behavior

- `RESEND_API_KEY` stays server-side and is never exposed in frontend code.
- Broadcasts require explicit confirmation.
- Blocked, delete-pending, and opted-out users are excluded from non-test audiences.
- No SMS, automated campaigns, dashboard, earnings, XP, Ask My Data, or exports changes were made.

### Files Created

- `supabase/functions/admin-email/index.ts`
- `supabase/migrations/20260602124500_reengagement_email_campaigns.sql`

## V5.7.4 — Admin Ops UX Hotfix

### Fixed

- Required update notices no longer block admin users from reaching Admin Ops.
- Required update notices now explain what is happening and include a Sign Out option.
- Admin login now has a distinct internal Admin Ops presentation and does not offer public sign-up.
- Avatar menu feedback entry simplified to Feedback.
- Feedback modal copy simplified.
- Feedback type selector now opens above the modal layer.

### Production Behavior

- No dashboard, earnings, XP, Ask My Data, exports, or Supabase schema changes were made.
- This version intentionally matches the tested `5.7.4` update target so a required-update lock clears after deployment.

## V5.7.2 — Admin Ops + Feedback Inbox + App Version Control

### Added

- Protected `/admin` route for internal Streex operations.
- Server-side admin access validation through the `admin-ops` Edge Function.
- `admin_users` foundation with initial owner admin seeded for `juangaudino@gmail.com`.
- User management overview with total users, recent users, inactive users, blocked users, usage stats, and account actions.
- Block/unblock support through account access controls.
- Restricted-account screen for blocked users.
- App-level Force Sign Out All Users using a global `forced_logout_after` timestamp.
- App version control with optional or required update notices.
- Suggestions / Feedback entry in the Avatar menu.
- Admin Feedback Inbox with status/type filtering and review workflow.

### Production Behavior

- No public admin registration was added.
- Admin actions are validated server-side and do not rely only on hidden UI.
- No service role key is exposed in frontend code.
- Delete user is intentionally implemented as `delete_pending` soft restriction, not destructive hard deletion.
- No dashboard, earnings, XP, Ask My Data, exports, themes, or Supabase project architecture changes were made.

### Files Created

- `src/pages/AdminPage.tsx`
- `src/components/AppUpdateNotice.tsx`
- `src/components/FeedbackDialog.tsx`
- `src/hooks/useAppRuntime.ts`
- `src/lib/adminOps.ts`
- `supabase/functions/admin-ops/index.ts`
- `supabase/migrations/20260602090000_admin_ops_feedback_version.sql`

## V5.7.1 — Navigation Cleanup + AI Visibility Layer

### Changed

- Ask AI is now promoted to the primary bottom navigation for stronger Ask My Data visibility.
- Compare moved from the bottom navigation into the Progress menu.
- History moved from the Avatar menu into the Progress menu.
- Progress menu now groups Journey, Monthly Recap, Letters, Achievements, History, and Compare.
- Avatar menu simplified to Settings, What's New, and Sign Out.

### Production Behavior

- No routes were removed or renamed.
- No dashboard logic, auth, earnings, XP, analytics, Supabase, or backend behavior changed.

## V5.7 — Full Focus Dashboard

### Added

- Full Focus Dashboard Experience as an operational dashboard mode, separate from themes.
- Settings → Dashboard Experience with Standard and Full Focus options.
- Persistent local Dashboard Experience preference that survives refresh and app reopen.
- Compact dashboard quick toggle for switching between Standard and Full Focus.
- Full Focus operational hierarchy with current earnings, same-day average comparison, goal progress, shift state, momentum, and Quick Add prioritized.
- Header and navigation quieting when Full Focus is active to reclaim vertical space.
- Dashboard mode toggle moved into the top app header near Progress/Profile controls, with the active mode clearly visible.
- Full Focus now uses a compact driver-console layout with Quick Add immediately after the cockpit summary.
- Daily Command Center renders as a compact utility strip in Full Focus so weather and traffic support the work session without dominating the top.
- Start Shift / End Shift is now available from the persistent top app header and stays synced with the real active shift.
- Full Focus toggle is now globally accessible from the persistent top app header instead of only appearing on Dashboard.
- Full Focus header copy now avoids repeating the same momentum wording shown in operational cards.
- Daily Start Hub added as a session/day welcome overlay when today has no shift blocks yet.
- Optional local profile fields added for first name and phone number, editable from Settings.
- Daily Start Hub can start a real persisted shift, dismiss to Dashboard, open Entry weekly setup, or open profile settings.

### Production Behavior

- No database schema changes were made.
- Full Focus is local preference only and does not alter stored earnings, weeks, exports, Ask My Data, XP, auth, weather, traffic, or Supabase architecture.
- Standard Dashboard remains the full exploration, identity, progression, and reflection experience.
- Full Focus reduces the prominence of reflection systems without deleting them.
- Shift Blocks now use the correct local target date instead of falling back to Monday when today's date lookup fails.
- Quick Add shift controls now persist to the same shift block model used by Entry.
- Entry shift blocks now support editing start time, end time, miles, and delete with confirmation.
- Week update failures now log useful context and avoid optimistic success messaging when the save request fails.
- Daily Start Hub and profile fields are additive local UI features and do not change database schema or block app usage.

### Files Created

- `src/lib/dashboardExperience.ts`
- `src/lib/dashboardExperience.test.ts`
- `src/hooks/useDashboardExperience.ts`

### Files Modified

- `src/pages/DashboardPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/AppShell.tsx`
- `src/lib/changelog.ts`
- `CHANGELOG.md`
- `PROJECT_CONTEXT.md`

## V5.6 — Shift + Hours & Pattern Intelligence

### Added

- Shift Intelligence Layer with manual Start Shift and End Shift controls in Entry.
- Shift duration tracking stored inside existing week/day entry data.
- Mileage Foundation with manual shift miles, daily miles, weekly miles, and mileage history through saved weeks.
- Efficiency Snapshot for earnings per hour, earnings per mile, and miles per hour.
- Pattern Intelligence on Career with strongest hours, productivity windows, morning vs night tendencies, and gentle recovery-window framing.
- Advanced Mode heatmap for hour-level work patterns and best apps by hour when enough shift data exists.
- Simple / Advanced Performance Mode setting stored locally.

### Production Behavior

- No database schema changes were made.
- No GPS, background location, telematics, or automated mileage tracking was added.
- Shift and mileage data are additive fields inside the existing `weeks.entries` JSON payload.
- Active shifts now persist immediately when started or ended, so refresh/reopen keeps the session active until End Shift.
- Start Shift now no-ops if a shift is already active in the week, preventing duplicate active sessions.
- Simple Mode now stays glanceable while Advanced Mode shows a distinct Operations Snapshot with shift duration, efficiency, mileage, work blocks, and deeper unlock states.
- Existing earnings, auth, Ask My Data, exports, XP persistence, dashboard systems, and Supabase architecture were not changed.
- Pattern intelligence is historical and manual-entry based; it does not predict demand.

### Known Limitations

- App-by-hour and hourly heatmap signals are derived from logged shift windows and daily/app totals, so they are directional rather than per-trip telemetry.
- Advanced hour patterns stay gated until enough completed shifts exist.
- Mileage is manual-first in V5.6; Movement Intelligence remains future roadmap.

### Files Created

- `src/lib/shiftIntelligence.ts`
- `src/lib/shiftIntelligence.test.ts`
- `src/lib/performanceMode.ts`
- `src/hooks/usePerformanceMode.ts`
- `src/components/ShiftIntelligencePanel.tsx`

### Files Modified

- `src/lib/types.ts`
- `src/pages/WeeklyEntryPage.tsx`
- `src/components/MobileDayDetail.tsx`
- `src/components/MobileWeekOverview.tsx`
- `src/pages/CareerPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/lib/changelog.ts`
- `CHANGELOG.md`

## V5.5 — Dashboard Utility Expansion

### Polish / QA

- Daily Command Center presentation tightened by removing location helper copy and reducing vertical noise.
- Weather and Traffic panels now use a compact responsive side-by-side layout when space allows.
- Live utility data refreshes automatically about every 30 minutes after location is enabled.
- Dashboard header spacing and logo footprint compressed while preserving navigation.
- Historical Day Ranking now stays on the active unfinished work day instead of jumping ahead because of date context.
- Ask My Data now defaults unspecified timeframe questions to full history instead of the recent 16-week window.
- Ask My Data can answer weekday lists and best/worst day rankings from tracked day totals without falsely claiming the data is unavailable.
- Historical weeks can now be edited from History without converting them to the active open week.
- Weather forecast preview was reduced to the next two snapshots for a tighter command-center footprint.
- Weather card now has subtle condition-aware tinting for rain, heat, and cold while preserving the active theme.

### Added

- Dashboard Utility Layer as a compact `Daily Command Center`.
- Live Weather Strip powered through a Supabase Edge Function and OpenWeather.
- Live Traffic Insights powered through a Supabase Edge Function and TomTom Traffic Flow.
- Utility widget layer with clear live, unavailable, denied-location, and provider-not-configured states.
- Milestone share card expansion for 100 Days Tracked and major XP level-up moments.
- International Utility Layer with centralized display-only currency and regional date formatting.
- Currency selector in Settings for USD, EUR, GBP, CAD, MXN, COP, and ARS.

### Files Created

- `src/components/DailyCommandCenter.tsx`
- `src/hooks/useDriverUtility.ts`
- `src/lib/currency.ts`
- `src/lib/currency.test.ts`
- `src/lib/driverUtility.ts`
- `src/lib/shareCards.test.ts`
- `supabase/functions/driver-utility/index.ts`

### Files Modified

- `src/pages/DashboardPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/lib/store.ts`
- `src/lib/shareCards.ts`
- `src/lib/changelog.ts`
- `supabase/functions/ask-my-data/index.ts`
- `CHANGELOG.md`

### Production Behavior

- No database schema changes were made.
- No earning values are converted or rewritten.
- Currency is display-only and persisted through the existing `user_settings.currency_symbol` field as a currency code.
- JSON and CSV exports continue to preserve raw numeric earnings.
- Weather and traffic API keys are not exposed to the frontend.
- Location is opt-in and local-only; coordinates are used for the live utility request and cached in the browser.

### Known Limitations

- Live weather requires `OPENWEATHER_API_KEY` to be configured as a Supabase Edge Function secret.
- Live traffic requires `TOMTOM_API_KEY` to be configured as a Supabase Edge Function secret.
- Traffic V5.5 uses TomTom flow around the current browser location; incident detail cards can be added later.
- Currency formatting does not perform FX conversion by design.

### Testing Notes

- Currency formatting should keep raw values unchanged while changing display format.
- Dashboard should load even when utility providers are not configured or unavailable.
- Location denial should not block dashboard usage.
- Share cards should only appear from real tracked history and derived XP events.
- Ask My Data direct best-week answers now handle currency codes as well as legacy symbols.

## V5.4.2 — Pulse Mode + Career Titles

### Added

- Pulse Mode as an optional momentum-reactive visual layer.
- Dashboard pulse states for calm, steady, streak, strong, and record-chase moments.
- Career Title Generator inside Driver Identity.
- Career titles derived from level, archetype, weekly goal progress, active days, and record proximity.
- Pulse Mode toggle in Settings.

### Files Modified

- `src/contexts/ThemeContext.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/components/DriverIdentityCard.tsx`
- `src/lib/driverIdentity.ts`
- `src/index.css`
- `src/lib/changelog.ts`
- `CHANGELOG.md`

### Production Behavior

- No backend, auth, earnings persistence, Ask My Data, exports, Supabase migrations, or XP event writing changed.
- Pulse Mode is local-only in V5.4.2 and can be disabled instantly.

## V5.4.1 — Night Drive Theme

### Added

- Night Drive theme as a fourth visual mode beside Light, Dark, and RPG.
- Cockpit-inspired surfaces with streetlight amber, dashboard teal, and asphalt depth.
- Subtle road-lane atmosphere in the app shell.
- Settings theme selector updated to include Night mode.

### Files Modified

- `src/contexts/ThemeContext.tsx`
- `src/pages/SettingsPage.tsx`
- `src/index.css`
- `src/lib/changelog.ts`
- `CHANGELOG.md`

### Production Behavior

- No backend, auth, earnings, XP, Ask My Data, export, dashboard logic, or Supabase behavior changed.

## V5.4 — XP + Identity System

### Added

- Dual XP System with separate Consistency XP and Performance XP.
- Driver Levels: Rookie, Road Runner, Steady Grinder, Street Pro, Top Earner, Elite Driver, Streex Legend.
- Automatic Driver Archetypes derived from tracked behavior.
- Historical Day Ranking for same-weekday context.
- Rival System based on the user's own historical benchmarks.
- Ideal Week Comparison based on best historical weekday totals.
- Day Off System V1 with neutral, non-punitive copy.
- Adaptive Comparisons with Calendar Pace and Worked-Day Pace.
- Dashboard Driver Identity card.

### Database Changes

- Added `xp_events` as an idempotent XP ledger.
- Added `UNIQUE (user_id, event_key)` to prevent duplicate XP awards.
- Added RLS policies so authenticated users can only view/insert their own XP events.

### Files Added

- `src/lib/driverIdentity.ts`
- `src/hooks/useDriverIdentity.ts`
- `src/components/DriverIdentityCard.tsx`
- `supabase/migrations/20260529120000_add_xp_events.sql`
- `src/lib/driverIdentity.test.ts`

### Files Modified

- `src/pages/DashboardPage.tsx`
- `src/lib/changelog.ts`
- `CHANGELOG.md`

### Known Limitations

- Day Off V1 is neutral and non-punitive, but there is no explicit `dayType` field yet to distinguish intentional rest from untracked time.
- Early Bird and Night Owl archetypes are not active yet because the current data model does not store reliable work times.
- XP events are derived from tracked week/day history and persisted through the client with idempotent event keys.

### Testing Notes

- XP event generation should not duplicate event keys.
- Level thresholds should advance cumulatively and never subtract XP.
- Archetypes should stay locked until enough worked-day history exists.
- Historical day ranking should compare against the same weekday.
- Day Off language should remain neutral.
- Dashboard, exports, Ask My Data, achievements, and existing records should remain unchanged outside the new identity card.
