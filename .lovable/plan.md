# Streex V5.1 — Narrative Evolution

Evolution update — preserves visual identity, architecture, dashboard, RPG mode, achievements, responsive behavior. Adds narrative layers and emotional intelligence.

---

## 1. Weekly Closing Experience

**New file:** `src/components/WeekClosingDialog.tsx`
- Triggered when user closes a week (mirror of `EndDayDialog`, richer scope).
- Shows: total earnings, goal %, best day, streak progress, weekly momentum, near-records, achievements unlocked this week, motivational insights, comparison vs previous weeks ("3rd best week ever", "$84 from all-time record", "Strongest Sunday in 2 months").
- Tone: "Another chapter complete.", "Momentum carried.", "This week moved the story forward."

**Wire-up:**
- `src/pages/WeeklyEntryPage.tsx` (or wherever Close Week lives) intercepts close → opens `WeekClosingDialog` → on confirm, marks week `closed` and creates next week.
- Add helpers in `src/lib/career.ts`: `getWeekRanking(weeks, weekId)`, `getWeekRecordGap(weeks, weekId)`, `getWeekdayHistoricalRank(weeks, dayName, value)`.

**Post-week empty state fix:**
- `src/pages/DashboardPage.tsx`: when `!openWeek` but `weeks.length > 0`, render a "Fresh chapter begins" card with CTA "Start Next Week" — NOT the first-time onboarding state. Keep onboarding only when `weeks.length === 0`.

---

## 2. Active Momentum — Near-Momentum Items

`src/components/ActiveMomentum.tsx`:
- Add a `nearItems` collector alongside `items`. Compute distance to next streak threshold ($100/$150), days to extend goal streak, $ to weekly momentum.
- Render near-items with muted/ghost style: `opacity-60`, `border-dashed`, softer accent. Always render the section (active + near combined) so it never feels empty when at least one near-item exists.
- Light rotation: deterministic seed by day-of-year to vary which near-items show first.

---

## 3. Pacing Grace Period

`src/lib/commentary.ts` (`getDashboardMood`):
- Add grace logic: if `loggedDays.length < 1` OR `weekTotal < goal*0.1` AND elapsed week-day index < 2 → force tone to `prerun`/`startup`. Use messages: "Week is young", "Find your rhythm", "One ride at a time", "Fresh start".
- Same intra-day: if `todayTotal < dayAvg * 0.2` AND it's early (no entries yet) → never emit "Rebuilding"/"Behind"/"Slow start". Use "Ready to roll", "Building momentum".
- Threshold: only after `loggedDays.length >= 2 && todayEntries >= 1 && weekTotal >= goal*0.15` may strong negative pace states activate.

---

## 4. Milestones 2-col Mobile Grid

`src/components/Milestones.tsx` and `src/components/AchievementsPreview.tsx`:
- Switch list/stack to `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2`.
- Compact card variant: smaller padding, icon top, title + tiny meta. Keep rounded, elegant spacing.

---

## 5. Performance Expansion

`src/lib/career.ts`: add helpers
- `getWeekdayAverages(weeks)` → `{ Mon: x, Tue: x, ..., weekendAvg, bestDayName, mostConsistentDayName }`
- `getAvgWeeklyEarnings(weeks)`
- `getAvgPerActiveDay(weeks)`, `getAvgEntriesPerDay(weeks)`
- `getStrongestApp(weeks, settings.activeApps)`
- `getMostProductiveDayType(weeks)` (weekday vs weekend)

`src/pages/CareerPage.tsx`:
- New "Performance Insights" section with compact card grid (2-col mobile, 3-col md). Show: Avg Mon-Sun (compact row), Avg Weekend, Avg Weekly, Highest Earning Weekday, Most Consistent Day, Avg per Active Day, Avg Entries/Day, Strongest App, Productive Day Type.
- Keep existing Monthly Progression intact.

---

## 6. Journey Feed

**New file:** `src/lib/journey.ts`
- `buildJourneyEvents(weeks, achievements)` → derives chronological events: first $1000 week, best Saturday ever, 4-day streak started, weekly goal crushed, record pace reached, new career high, best [App] week, first week completed, goal streak extended, momentum recovered.
- Each event: `{ date, icon, tone: "milestone"|"record"|"streak"|"achievement", title, subtitle, value? }`.

**New file:** `src/pages/JourneyPage.tsx`
- Timeline UI: vertical line, premium cards per event, tone-colored icon, date stamp.
- Add route `/journey` in `src/App.tsx`.
- Add nav entry in `src/pages/AppShell.tsx` (mobile bottom nav slot — replace something low priority? Currently nav has Dashboard, Entry, Career, Compare, History, Achievements). Per user constraint to avoid crowding: add Journey to user menu + Career page tab/link (header CTA from Career → "View Journey"). Keep bottom nav unchanged.

---

## 7. Full Changelog History

**New file:** `src/lib/changelog.ts` — exports versioned array (`5.1`, `5.0.2`, `5.0.1`, `5.0`, `4.5`, …) each with `{ version, date, title, items[], tags? }`.

**New file:** `src/components/ChangelogDialog.tsx`
- Modal with timeline of versions, expandable per-version. Latest highlighted with "NEW" badge.

**Wire-up:**
- `src/pages/AuthPage.tsx`: tap on version → opens dialog.
- `src/pages/AppShell.tsx` user menu: add "What's New" item → opens dialog.
- Update version constants to `5.1` everywhere visible.

---

## Technical Details

- All copy lives in commentary/journey/changelog libs (no inline strings in components).
- All colors via design tokens (`text-gold`, `text-primary`, `border-success/30`, etc.). No raw hex.
- New types added to `src/lib/types.ts` if needed (e.g. `JourneyEvent`).
- No DB schema changes; everything derives from existing `weeks` + `user_achievements`.
- Routes added to `src/App.tsx`. Nav entries added to `AppShell` user menu (no bottom-nav crowding).
- Version bump: `Streex v5.1` on Auth screen + changelog entry.

## Files

**New:** `WeekClosingDialog.tsx`, `JourneyPage.tsx`, `ChangelogDialog.tsx`, `lib/journey.ts`, `lib/changelog.ts`
**Edited:** `ActiveMomentum.tsx`, `Milestones.tsx`, `AchievementsPreview.tsx`, `lib/commentary.ts`, `lib/career.ts`, `pages/DashboardPage.tsx`, `pages/CareerPage.tsx`, `pages/WeeklyEntryPage.tsx`, `pages/AppShell.tsx`, `pages/AuthPage.tsx`, `App.tsx`, `lib/types.ts` (if needed)

## Out of scope

- No DB migrations
- No redesign of dashboard/RPG/auth
- No changes to Quick Add or End Day logic beyond what's listed
