# Streex Roadmap

Last updated: 2026-07-01

This is the living product roadmap for Streex Gig Earnings.

Use this file as planning context only. The exact Beta numbers can shift when urgent bugs, production fixes, or small UX patches land before a planned feature. When that happens, keep the intent and sequence, but renumber the upcoming items honestly.

Do not put secrets, private keys, passwords, production credentials, or private customer data in this file.

## Versioning Rule

Streex is in Beta.

- Patch releases, for example `Beta 0.6.1`, should be used for focused refinement, bug fixes, visual polish, and small UX improvements.
- Minor releases, for example `Beta 0.7.0`, should be used for meaningful new product surfaces or intelligence layers.
- If an unplanned fix ships before a planned item, move the planned item forward instead of forcing the old number.
- Older roadmap labels like `V5.8`, `V5.9`, or `V6.x` are Alpha-era planning labels. Preserve the ideas, but translate them into current Beta roadmap language before implementation.

## Current Baseline

Current baseline after the weekly comparison projection release:

```text
Beta 0.8.4 - Weekly Comparison Projection
```

Deep Insights V1 added the first desktop-first analytics cockpit with:

- `/deep-insights` route
- Progress menu access
- time, app, and weekday filters
- KPI strip
- earnings trend
- weekly comparison
- weekday earnings
- app contribution
- hours worked
- earnings/hour where valid
- earnings/mile where valid
- best days
- lowest earning days
- best weeks
- best shifts where shift earnings can be resolved
- app performance breakdown

Deep Insights 0.6.1 refined that cockpit with:

- Classic Light support
- preserved dark cockpit mode
- theme-aware charts, cards, filters, tables, tooltips, empty states, and insight blocks
- no calculation or backend behavior changes

Deep Insights 0.7.0 added a separate comparison workspace with:

- two to four day, week, month, year, or custom-period blocks
- one global app/platform filter
- comparable summary cards, metric table, chart, and narrative signals
- honest missing-data behavior for hours, miles, rides, and efficiency
- URL-backed comparison state after interaction
- no changes to the existing `/compare` operational weekly guide

## Roadmap Status Labels

- `planned next`: the next intended product work.
- `planned`: likely upcoming work, but number can shift.
- `candidate`: valuable, needs evaluation before build.
- `strategic`: major future direction, not immediate implementation.
- `blocked by data`: requires new reliable data capture before honest analytics can exist.
- `partially absorbed`: the original idea has been partially delivered by a newer feature.
- `archive`: concept preserved for history, not currently active.

## Near-Term Planned Sequence

### Beta 0.6.1 - Deep Insights Refinement + Light Mode

Status: completed.

Scope:

- Add a light Deep Insights theme similar in spirit to Classic Light.
- Keep the current dark cockpit experience.
- Improve desktop readability, spacing, labels, and table/chart balance after real use.
- Improve mobile stacked behavior only where it is clearly broken or confusing.
- Avoid adding major new analytics logic in this pass.

Intent:

Make Deep Insights feel polished in both dark and light contexts before expanding the data model or feature surface.

### Beta 0.6.2 - Quick Add Decimal Input Fix

Status: completed.

Scope:

- Preserve decimal fractions while typing Quick Add accumulated earnings.
- Normalize decimal commas from regional mobile keyboards.
- Keep normal Entry, snapshots, earnings calculations, and storage behavior unchanged.

### Beta 0.6.3 - Daily Notes

Status: completed.

Scope:

- Attach one short optional note to a specific day.
- Edit or clear the note from mobile day detail or desktop Entry.
- Surface a compact note indicator and include notes in Daily Report.
- Keep notes outside every statistic and performance calculation.
- Reuse the existing day JSON metadata without a migration.

Deferred:

- Cross-history note browsing, filtering, and search.

### Beta 0.6.4 - Full Focus Goal Hierarchy

Status: completed.

Scope:

- Remove the redundant Goal mini-card from Full Focus.
- Make the existing weekly earnings and hours progress bars open Goal Progress details.
- Pair Day vs Avg with Historical Rank.
- Give Conditions a clearer full-width utility position.
- Preserve all goal calculations and the existing drill-down.

### Beta 0.7.0 - Advanced Comparison Builder

Status: completed.

Scope:

- Compare two to four day, week, month, year, or custom-period blocks.
- Apply one shared app/platform filter without making unsupported app-specific efficiency claims.
- Show comparable summary cards, a metric table, a selectable chart, and concise data-supported signals.
- Keep current-period comparisons honest by comparing the same elapsed point where defaults use the current week.
- Preserve `/compare` unchanged as a separate operational same-point weekly guide.

Intent:

Move Deep Insights from a static analytics cockpit into a stronger exploration tool without replacing the focused weekly Compare workflow.

### Beta 0.7.1 - Deep Insights Visual Refinement

Status: completed.

Scope:

- Keep the global app header above Deep Insights fixed visual layers.
- Integrate Overview and Compare into one coherent Deep Insights exploration system.
- Present comparison blocks as horizontal desktop columns with clear start/end context.
- Replace stale preset labels with date-aware generated labels and optional user naming.
- Align block accents, chart encoding, metric matrix, typography, spacing, and theme behavior with the existing Overview quality bar.
- Preserve the tested comparison engine and the separate `/compare` operational weekly guide.

Intent:

Raise Advanced Comparison from a functional first pass to the same professional control-room standard as Deep Insights Overview.

### Beta 0.8.0 - Full Focus Utility Intelligence

Status: completed in code; migration and Edge Function deployment required.

Scope:

- Turn the full-width Conditions position into one shared Utility Slot without adding another dashboard card.
- Keep weather and traffic visually unified while refreshing traffic every five minutes and weather every 30 minutes.
- Add deterministic event-driven rotation between Conditions and Octopus, with manual selection always available.
- Add a correctable Octopus balance where eligible Uber ride changes add 1.5 points and 250 points unlock a $25 reward.
- Add current-week average per active day compared with the historical active-day baseline.

Data integrity:

- Lyft and combined ride totals never credit Octopus automatically.
- Only ride deltas saved from Uber Quick Update affect the balance.
- Users can synchronize exact points or add/remove eligible rides to correct external tracking gaps.
- Octopus points do not alter earnings, rides, records, XP, achievements, or operational efficiency.

### Beta 0.8.1 - Deep Insights Micro-Visualization Pass

Status: completed.

Scope:

- Add selected sparklines and micro-trends inside Deep Insights KPI cards.
- Add compact visual position indicators for rankings and percentiles.
- Add contribution bars where they improve understanding.
- Keep this primarily desktop-first.
- Do not redesign Full Focus or overload mobile.

Intent:

Make Streex feel less like a spreadsheet and more like a professional performance intelligence platform.

Delivered:

- Selected KPI sparklines and compact weekly distributions.
- Recent earning-day activity marks.
- Operational-income contribution context.
- Subtle app-contribution and ranking row visuals.
- Filter-aware day and week percentile labels.
- No new analytics formulas, backend work, or Full Focus changes.

### Beta 0.8.2 - Career Drill-Down Expansion

Status: completed.

Scope:

- Add shared Progress and History details to Career monthly progression.
- Add Day and Week record history to the Career record cards.
- Correct `Most Used App` to `Top Earning App` and expose attributed app contribution.
- Add weekday sample and ranking context.
- Explain Career hourly efficiency without presenting estimated timing as observed truth.
- Improve the shared drill-down sheet for short mobile viewports and initial tab selection.

Boundaries:

- Full Focus content, calculations, layout, and drill-down behavior remain unchanged.
- Simple summary cards remain static unless future review finds meaningful hidden context.
- Additional interactive statistics require individual product review rather than automatic expansion.

### Beta 0.8.3 - Weekly Comparison Clarity

Status: completed.

Scope:

- Preserve the four same-point summary indicators on Compare.
- Separate previous-week and record-week analysis into focused mobile-friendly sections.
- Show daily and running cumulative differences through the same tracked days.
- Add a compact cumulative trend to each section with an expandable detailed chart.
- Remove the low-value app comparison table and horizontal scrolling.

Boundaries:

- Future days are excluded from daily and cumulative comparisons.
- Earnings, bonus, record, Supabase, auth, Dashboard, Full Focus, Entry, and backend calculations remain unchanged.

### Beta 0.8.4 - Weekly Comparison Projection

Status: completed.

Scope:

- Keep upcoming days visible with their historical reference amounts while marking current earnings as pending.
- Continue historical cumulative lines through Sunday without generating future deficits.
- Add a dashed projection based on current tracked-day pace.
- Show the remaining amount and average required per remaining day to match each reference week.

Boundaries:

- Projections are labeled estimates and never alter stored earnings or actual comparison metrics.
- Actual daily and cumulative gaps remain limited to tracked days.

### Beta 0.9.0 - Deep Insights Intelligence Layer

Status: planned, number may shift.

Scope:

- Add deeper operational patterns.
- Add richer efficiency rankings.
- Add better shift analysis, including duration vs earnings, rides/hour, miles/hour, and shift density when data exists.
- Add advanced best/worst pattern detection.
- Connect selected Deep Insights helpers back into Ask My Data when the AI layer is ready.

Intent:

Turn Deep Insights from charts and tables into a true intelligence layer.

## Strategic Roadmap Themes

These themes came from the older Alpha roadmap. They are preserved here, reorganized for the current Beta product.

### Full Focus Utility Slot

Status: partially implemented in Beta 0.8.0; aviation modules still require research.

Concept:

Use the current full-width Conditions position as a contextual utility slot instead of adding more permanent dashboard cards. Conditions and Octopus now share the live slot through event-driven rotation; aviation modules remain future candidates.

Potential modules:

#### Flight Reservation Tracker

Primary use case:

- Follow a specific flight connected to an upcoming driver reservation.
- Show flight number, current status, scheduled and estimated arrival, delay, terminal, and gate only when the provider supports them reliably.
- Let the user add or remove a tracked flight intentionally.
- Keep the module useful for pickup timing without turning Streex into an airline app.

#### Airport Pulse

Secondary use case:

- Show upcoming arrivals for one or more user-selected airports.
- Summarize arrival volume over a useful operating window such as the next 30, 60, or 90 minutes.
- Surface broad delay or cancellation pressure when supported by reliable data.
- Help the driver understand airport demand context without pretending to forecast guaranteed rides.

UX guardrails:

- No empty Utility card before a real module exists.
- No rapid decorative carousel while the user is driving.
- Use deterministic event priority, protected visibility windows, and manual selection when multiple modules exist.
- Keep the slot compact, glanceable, and optional.
- Conditions remains accessible and must not disappear unpredictably.
- No navigation, route guidance, or unsupported demand claims.

Research requirements:

- Compare aviation data providers, API pricing, rate limits, attribution, and commercial-use terms.
- Verify live-status reliability, timezone handling, airport coverage, terminal/gate availability, and delay freshness.
- Define refresh and caching rules that control cost without showing stale reservation data.
- Decide how preferred airports and tracked reservations persist per user.
- Confirm whether notifications belong in a later phase and what background/PWA limitations apply.
- Prototype both reservation tracking and aggregate airport volume before choosing final UI behavior.

### Traffic Intelligence Layer

Former label: `V5.8 - Traffic Intelligence Layer`.

Status: candidate.

Tagline:

```text
More context. More awareness.
```

Current fit:

- Partially exists through current weather/traffic utility and the Full Focus Conditions card.
- Not yet a true Traffic Intelligence system.

Concept:

Traffic Intelligence should evolve Streex from raw traffic data into calm situational awareness. Streex should not become Google Maps, Waze, a routing engine, or turn-by-turn navigation. The goal is context, not control.

Potential layers:

- Traffic Flow Layer: speed, flow, and current condition baseline.
- Delay Awareness Layer: human-readable time cost such as `+3 min`, `+8 min`, or `+15 min`.
- Incident Awareness Layer: quiet notices such as minor accident, road work, closure, or hazard nearby.
- Traffic Severity Layer: translate technical flow into `Light`, `Moderate`, or `Heavy`.
- Compact Context Layer: keep the UI small, contextual, and non-dominant.

Priority notes:

- Delay awareness is likely the strongest first candidate because drivers think in time cost more naturally than mph.
- Incident awareness must be quiet, never alarmist.
- Advanced density maps, route pressure, and map-heavy experiences are lower fit for Streex.

Open questions:

- TomTom API economics.
- Incident density and usefulness.
- Refresh frequency.
- Delay calculation method.
- Focus UI footprint.
- Severity wording.
- Whether this belongs in Full Focus only, Deep Insights, or both.

Guardrails:

- No navigation replacement.
- No turn-by-turn.
- No routing dependency.
- No map-heavy dashboard.

### Deep Movement Intelligence

Former label: `V5.8.5 Candidate - Deep Movement Intelligence`.

Status: candidate, blocked by data for advanced layers.

Tagline:

```text
Movement tells the second half of the story.
```

Current fit:

- Mileage, shift hours, earnings/mile, rides, and operations snapshots already exist.
- Deep Movement Intelligence is the future interpretation layer on top of those foundations.

Concept:

Distance should evolve from simple tracking into operational intelligence. Streex should not become GPS, Waze, telematics, surveillance, or fleet software.

Potential layers:

- Movement context: productive miles vs strategic/non-productive miles.
- GPS-assisted or smart mileage capture, only if privacy and battery tradeoffs are acceptable.
- Vehicle Intelligence connection: oil intervals, tire rotation, brake awareness, service milestones, utilization.
- Market and geography connection: compare compact vs spread markets, airport-heavy areas, regional efficiency.
- Vehicle comparison: compare vehicle workload and mileage efficiency.
- Deep efficiency: movement efficiency, operational intensity, sustainability patterns.

Ask My Data potential:

- Which market gives me best earnings per mile?
- What was my most efficient month?
- Do airport days increase strategic movement?
- Which vehicle performed best?

Guardrails:

- No background surveillance.
- No mandatory tracking.
- No negative framing like `wasted miles`.
- Prefer language like `movement context` or `strategic movement`.

### Market & Geographic Intelligence

Former label: `V5.9 - Market & Geographic Intelligence`.

Status: strategic, likely should be split into multiple releases.

Tagline:

```text
Geography tells a story too.
```

Concept:

Streex should eventually understand the user's real operating markets, not just generic cities. Examples:

- SLC Core
- Park City
- Orlando
- Dallas
- Multi-area

Potential layers:

- User-defined markets or zones.
- Averages by market.
- Strongest markets.
- Market rankings.
- Seasonal behavior.
- Local trends.
- Multi-market career comparison.

Seasonal geography examples:

- Orlando winter vs Utah winter.
- Park City ski season.
- Airport-heavy seasonal markets.

Core question:

```text
Where do I perform best?
```

Open questions:

- Manual market tagging vs assisted detection.
- Privacy boundaries.
- GPS/data storage requirements.
- Whether market belongs in Entry, Deep Insights, Ask My Data, or a future Operations Center.

### Operations Center / Desktop Control Center

Former label: `V5.9.A - Operations Center / Desktop Control Center`.

Status: partially absorbed by Deep Insights, still strategic.

Tagline:

```text
Your career deserves a headquarters.
```

Current fit:

- Deep Insights V1 is the first real step toward desktop power-user analytics.
- The full Operations Center concept is broader than Deep Insights.

Concept:

Mobile remains the live companion for quick tracking, driving use, and momentum. Desktop becomes the professional workspace for planning, administration, and deep understanding.

Mobile:

- capture
- momentum
- live work
- quick updates
- companion layer

Desktop:

- depth
- planning
- administration
- control
- analysis

Potential layers:

- Vehicle and Fleet Layer: vehicles, VIN, registration, insurance, ownership, utilization.
- Maintenance Intelligence: oil changes, tires, brakes, service timeline, repair logs.
- Operations Planning: shift planning, strategy planning, target planning, market preparation.
- AI-Assisted Workflow: weekly review, strategy prep, market comparison, workload analysis.
- Advanced Analytics: historical trends, market comparison, consistency, projections, operational patterns.
- Deep Configuration: dashboard density, visual preferences, module controls, AI behavior, exports.

Guardrails:

- Not a simple desktop mirror.
- Not just a giant analytics page.
- Do not replace mobile workflows.
- Keep desktop as the place for deeper operation.

### Deep Career Expansion

Former label: `V6.0 - Deep Career Expansion`.

Status: strategic, likely split into several releases.

Tagline:

```text
Fitness App + RPG + Financial OS + Driver Companion.
```

Concept:

Streex evolves from performance tracking into career intelligence. This is where long-term identity, legacy, achievements, and lifetime analytics become central.

Potential layers:

- Advanced achievements: hidden, rare, epic, mythic, collectible.
- Collection systems: achievements as a collectible history, not just unlocks.
- Legacy systems: years, chapters, career seasons, long-term story.
- Rival System 2.0: careful and non-toxic; community comparison only if user base justifies it.
- Career Narrative / Lifetime Analytics.
- Consistency / Stability Analytics.
- Ecosystem / App Intelligence.

Career Narrative / Lifetime Analytics:

- lifetime earnings
- total work days
- active months
- total shifts
- longest streak
- yearly growth
- comeback periods
- historical milestones
- career evolution
- legacy moments

Consistency / Stability Analytics:

- volatility score
- consistency rating
- stable weeks
- predictability index
- variance tracking

Ecosystem / App Intelligence:

- app contribution percentage
- app dominance
- strongest platform
- dependency risk
- lifetime by app
- seasonal app behavior
- strongest app mix

Core question:

```text
What kind of career am I building?
```

### AI Analytics / Ask My Data Evolution

Former label: `V6.1 - AI Analytics / Ask My Data`.

Status: strategic, high potential, should be rebuilt carefully.

Concept:

Ask My Data should become the conversational brain of Streex. The user should be able to talk to their numbers instead of only reading dashboards and charts.

Example questions:

- best Tuesday afternoon
- rain + Wednesday
- Thanksgiving Orlando
- best schedule
- best app
- hidden trends
- complex comparisons

Philosophy:

- Conversation-first analytics.
- Not corporate BI.
- Not fake intelligence.
- Every answer must be grounded in available data.

Near-term relationship to Deep Insights:

- Deep Insights helpers should eventually become reusable sources for Ask My Data.
- Ask My Data should not invent location, hourly, ride-level, or weather conclusions without stored data.

Possible identity:

- Ask Streex
- Talk to your data

### AI Conversation Export / Memory Portability

Former label: `V6.1.5 - AI Conversation Export / Memory Portability`.

Status: candidate for future AI UX.

Tagline:

```text
Good conversations deserve to survive.
```

Concept:

AI conversations can become valuable strategy sessions, coaching moments, planning conversations, and analytics explanations. Streex should eventually let users preserve and reuse them.

Potential layers:

- Export Layer: PDF, TXT, Markdown, copy, print, share, save locally.
- Share Layer: private save vs shareable conversation.
- Conversation Archive: saved chats, favorites, starred insights, search, topic grouping.
- Memory Continuity: resume strategy conversations or weekly planning sessions.
- Insight Preservation: save or bookmark individual AI answers.
- Ask My Data synergy: save weekly reviews, market comparisons, career analysis, efficiency explanations.

Guardrails:

- Private-first.
- Not a social network.
- Not a messaging platform.
- Not a public AI feed.
- Lightweight, respectful, and useful.

### International & Personalization Layer

Former label: `V6.2 - International & Personalization Layer`.

Status: planned future, not immediate.

Tagline:

```text
A global app. An intact identity.
```

Concept:

Streex should eventually travel well beyond one local market without losing its identity.

Localization:

- English
- Spanish
- future languages
- labels
- menus
- navigation
- settings
- helper text
- utilities

Identity preservation rule:

Do not automatically translate iconic brand/identity terms if translation weakens them.

Examples that may remain as identity language:

- Recovery Mode
- Goal Crusher
- Monster Session
- Night Owl
- Streex Legend
- Strong Thursday

Personalization:

- visual density
- dashboard style
- pacing preferences
- narrative intensity
- card behavior
- display preferences
- future units preferences for Fahrenheit/Celsius and miles/kilometers

Units preferences guardrails:

- Keep historical distance in one canonical internal unit.
- Convert only at display and input boundaries.
- Update weather, traffic speed, Entry, reports, exports, operations snapshots, Deep Insights, and Ask My Data together.
- Do not implement this as a partial surface-level setting.

Guardrail:

Localized UI, preserved soul.

## Deferred Ideas

These are valuable but intentionally not part of the immediate next patch:

- Export/share Deep Insights report as image or PDF.
- Saved filter views, such as "Uber only", "Fridays", or "Last 3 months".
- More advanced weather, GPS, market, vehicle, or location filters.
- Ride-level analysis from real ride timestamps.
- Provider integrations.
- AI-generated Deep Insights summaries.
- Maintenance logs and vehicle service timelines.
- Search and browse daily notes across long history.
- Saved AI conversation archive.
- Market tagging.
- Smart mileage capture.

## Current Product Guardrails

- Do not redesign Dashboard or Full Focus as part of Deep Insights work.
- Do not add microcharts everywhere.
- Keep mobile focused on daily operations and quick updates.
- Keep Deep Insights desktop-first.
- Use existing data honestly.
- Do not invent hourly, ride-level, weather, market, GPS, or location insights when Streex does not store the required data.
- Prefer additive helpers and reusable calculations over one-off UI math.
- Preserve the driver companion philosophy: calm, useful, premium, non-invasive.
- Avoid toxic productivity language.
- Keep analytics emotionally intelligent, not corporate.
