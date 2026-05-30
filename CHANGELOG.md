# Changelog

## V5.5 — Dashboard Utility Expansion

### Polish / QA

- Daily Command Center presentation tightened by removing location helper copy and reducing vertical noise.
- Weather and Traffic panels now use a compact responsive side-by-side layout when space allows.
- Live utility data refreshes automatically about every 30 minutes after location is enabled.
- Dashboard header spacing and logo footprint compressed while preserving navigation.
- Historical Day Ranking now stays on the active unfinished work day instead of jumping ahead because of date context.

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
