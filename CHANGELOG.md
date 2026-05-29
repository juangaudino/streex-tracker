# Changelog

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
