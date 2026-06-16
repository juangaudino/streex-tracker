# Streex Roadmap

Last updated: 2026-06-16

This is the living product roadmap for Streex Gig Earnings.

Use this file as planning context only. The exact Beta numbers can shift when urgent bugs, production fixes, or small UX patches land before a planned feature. When that happens, keep the intent and sequence, but renumber the upcoming items honestly.

Do not put secrets, private keys, passwords, or production credentials in this file.

## Versioning Rule

Streex is in Beta.

- Patch releases, for example `Beta 0.6.1`, should be used for focused refinement, bug fixes, visual polish, and small UX improvements.
- Minor releases, for example `Beta 0.7.0`, should be used for meaningful new product surfaces or intelligence layers.
- If an unplanned fix ships before a planned item, move the planned item forward instead of forcing the old number.

## Current Baseline

Current baseline after Deep Insights V1:

```text
Beta 0.6.0 - Deep Insights Desktop V1
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

## Planned Sequence

### Beta 0.6.1 - Deep Insights Refinement + Light Mode

Status: planned next.

Scope:

- Add a light Deep Insights theme similar in spirit to Classic Light.
- Keep the current dark cockpit experience.
- Improve desktop readability, spacing, labels, and table/chart balance after real use.
- Improve mobile stacked behavior only where it is clearly broken or confusing.
- Avoid adding major new analytics logic in this pass.

Intent:

Make Deep Insights feel polished in both dark and light contexts before expanding the data model or feature surface.

### Beta 0.6.2 - Deep Insights Filter + Comparison Upgrade

Status: planned, number may shift.

Scope:

- Add custom date range if feasible.
- Add previous-period comparisons, for example last 30 days vs previous 30 days.
- Add stronger monthly comparison views.
- Add compact delta language where data supports it.

Intent:

Move Deep Insights from a static analytics cockpit into a stronger exploration tool.

### Beta 0.6.3 - Deep Insights Micro-Visualization Pass

Status: planned, number may shift.

Scope:

- Add selected sparklines and micro-trends inside Deep Insights KPI cards.
- Add compact visual position indicators for rankings and percentiles.
- Add contribution bars where they improve understanding.
- Keep this primarily desktop-first.
- Do not redesign Full Focus or overload mobile.

Intent:

Make Streex feel less like a spreadsheet and more like a professional performance intelligence platform.

### Beta 0.7.0 - Deep Insights Intelligence Layer

Status: planned, number may shift.

Scope:

- Add deeper operational patterns.
- Add richer efficiency rankings.
- Add better shift analysis, including duration vs earnings, rides/hour, miles/hour, and shift density when data exists.
- Add advanced best/worst pattern detection.
- Connect selected Deep Insights helpers back into Ask My Data when the AI layer is ready.

Intent:

Turn Deep Insights from charts and tables into a true intelligence layer.

## Deferred Ideas

These are valuable but intentionally not part of the immediate next patch:

- Export/share Deep Insights report as image or PDF.
- Saved filter views, such as "Uber only", "Fridays", or "Last 3 months".
- More advanced weather, GPS, market, vehicle, or location filters.
- Ride-level analysis from real ride timestamps.
- Provider integrations.
- AI-generated Deep Insights summaries.

## Current Product Guardrails

- Do not redesign Dashboard or Full Focus as part of Deep Insights work.
- Do not add microcharts everywhere.
- Keep mobile focused on daily operations and quick updates.
- Keep Deep Insights desktop-first.
- Use existing data honestly.
- Do not invent hourly, ride-level, weather, market, or location insights when Streex does not store the required data.
- Prefer additive helpers and reusable calculations over one-off UI math.
