# Zone Intelligence & Evidence — Technical Design

Status: initial evidence implementation is on `main`. The local 0.10.2/0.10.3 candidate adds allocation integrity, an interactive approximate map, and owner-confirmed labels; its two migrations are prepared but not applied. Authenticated owner QA with genuine captured evidence is required before publication.

Target: `Beta 0.10.1 - Zone Intelligence & Evidence`.

## Product decision

Zone Intelligence is a third desktop-first workspace inside Deep Insights:

```text
Overview | Compare | Zone Intelligence
```

It is not a Dashboard, Full Focus, Entry, or navigation feature. The live workflow remains deliberately small: start a ride, finish it, and later enter authoritative accumulated totals in Quick Actions. Zone Intelligence answers retrospective questions after enough evidence exists.

The release has two purposes:

1. show the quality and coverage of the new Movement records; and
2. reveal activity, destination context, and eligible pickup-zone earnings without inventing per-ride money, mileage, time, or location.

## Non-negotiable privacy and financial rules

- `start_zone_key` and `end_zone_key` are coarse derived cells. Raw latitude, longitude, addresses, routes, route geometry, exact points, device identifiers, IP-derived locations, and background location history are never persisted or displayed.
- The map is an interactive approximate cell view on a base map. It is not a route replay, navigation tool, or heatmap for another user.
- Pickup zone is the only canonical earnings location. A dropoff zone can report destinations and flow counts, but never receives a second copy of the ride's earnings.
- A batch update is useful movement coverage, but cannot become per-ride or per-zone income by dividing its delta.
- A ride with a missing, denied, stale, or imprecise pickup capture is valid operational history but ineligible for pickup-zone earnings.
- Manual-after-shift rides do not claim retrospective GPS zones. They can improve financial timing, not geographic evidence.
- Existing historical work without foreground Movement capture is outside this analysis. There is no inferred or backfilled zone.

## Existing evidence model

The implementation must consume the current owner-scoped tables rather than write a second analytical ledger.

| Source | What it proves | What it cannot prove |
| --- | --- | --- |
| `ride_events` | Intentional ride timing, pickup/dropoff capture outcome, coarse cells, app, and shift context | Route, actual driven miles, or individual earnings alone |
| `ride_update_batches` + `ride_update_batch_events` | An explicit link from one or more completed rides to one saved accumulated-total snapshot | A fair split of a batch amount |
| `earnings_snapshots` + `earnings_attributions` | Append-only observed total and its reconciled/effective positive delta | A zone, unless one compatible ride link exists |
| `ride_payments` | A later payment explicitly tied to one ride, including `late_tip` | A rewritten original-day total or an inferred zone |

The new selector is conceptually `buildZoneIntelligenceData`. It receives filtered Movement rows, batch/event links, payment links, and the existing financial evidence. It must be a pure, tested derivation; it never edits a week, snapshot, event, or payment.

## Eligibility ledger

Every displayed number must carry an evidence class. A ride can appear in coverage even if it cannot contribute money to a zone.

### Coverage classes

| Class | Meaning | Can show on activity/flow map | Can contribute pickup earnings |
| --- | --- | --- | --- |
| `captured_pickup` | Foreground pickup zone was captured | Yes | Only after a valid financial link |
| `captured_dropoff` | Foreground destination zone was captured | Yes, as destination context | No |
| `single_linked` | One event explicitly linked to one positive reconciled snapshot | Yes | Yes, at pickup only |
| `batch_linked` | Multiple events linked to one update | Yes | No |
| `unlinked` | Completed event has no explicit financial link | Yes | No |
| `zone_unavailable` | Capture was denied, stale, imprecise, or unavailable | No cell; count in coverage | No |
| `manual_after_shift` | Legacy reconstructed historical row | Excluded | No |

### Eligible pickup earnings

A base earnings observation is eligible only when all of these are true:

1. one `ride_event` is in a `ride_update_batches.kind = 'single'` relationship;
2. the linked snapshot has a positive effective/reconciled delta under the existing snapshot rules;
3. the event has `start_capture_status = 'captured'` and a non-empty `start_zone_key`; and
4. the event belongs to the active owner and current filters.

The eligible amount is attached once to that event's pickup cell. The implementation must assert that an eligible snapshot cannot be emitted twice by two analytical paths.

A `ride_payments` row may add an explicit `late_tip` or `adjustment` to the same pickup-zone lifetime total only when its event has a captured pickup zone. Its money continues to belong to its observed day in ordinary financial views. Zone Intelligence labels it separately, for example: `Base $18.40 · late tips $3.00`.

The initial release must not show zone-level `$ / hour`, `$ / mile`, net profit, route efficiency, acceptance rate, or a per-ride split for batches. The data does not support those claims.

## Workspace and interaction design

The workspace reuses Deep Insights' global date, app, and weekday filters, then adds a scoped mode switch:

```text
Coverage | Pickup earnings | Destination flow
```

### Header

- Explain the selected period and active filters.
- Show an evidence strip: completed rides, pickup captured, dropoff captured, single-linked, batch-linked, unlinked, and excluded from earnings.
- Always disclose coverage, for example: `12 of 18 completed rides have a captured pickup; 7 are eligible for pickup earnings.`

### Approximate zone map

The primary visual is an interactive approximate base map with coarse rectangles derived at render time from `zone-v1:<lat-cell>:<lon-cell>`. It supports pan, zoom, and cell selection. It requests map tiles for the derived coarse viewport; it never receives raw GPS, routes, or address data from Streex.

- **Coverage mode:** intensity means captured pickup or dropoff activity count.
- **Pickup earnings mode:** intensity means eligible pickup earnings only; cells with only batch/unlinked events remain visible as coverage but do not receive a dollar color scale.
- **Destination flow mode:** selecting a pickup cell shows aggregated destination cells and count-labelled origin-to-destination connectors. Connectors mean completed movement context, not an actual driven route.
- A cell is never precise enough to be marketed as a street, address, or exact airport terminal.

The default viewport fits only the user's filtered cells. With no captured cells, show a clear empty state and the two live actions that create evidence: Start ride and Finish ride while Streex is open.

### Selected-zone inspector

Selecting a cell opens a persistent side panel on desktop and a bottom sheet on smaller screens:

| Section | Data shown |
| --- | --- |
| Zone label | Owner-defined label if one exists; otherwise `Private zone` with no place-name inference |
| Coverage | Captured pickups, captured dropoffs, missing-capture count, and coverage percentage |
| Eligible pickup earnings | Base earnings, linked late tips, eligible rides, and eligible average per ride |
| Destinations | Top destination cells and trip counts from this pickup cell |
| Evidence | Single-linked count, batch-linked count, unlinked count, excluded reasons |
| Period comparison | Only when the sample gate is satisfied; compares the selected cell to the filtered eligible sample |

An optional owner-scoped label action may allow a neutral manual name such as `Airport`, `Downtown`, or `Park City`. Labels never trigger reverse geocoding and never affect the underlying zone key or financial evidence.

## Insight gates and language

Coverage is always useful. Rankings and claims require a minimum sample:

- at least **8 eligible single-linked rides** across at least **3 distinct local days** in the active filter;
- all selected-zone comparisons display the number of eligible rides and coverage percentage; and
- if the gate is not met, use language such as `Building evidence` or `More single-linked rides are needed`, never `best`, `worst`, or a strong recommendation.

When the gate is met, permitted insights include:

- `This pickup zone represented 31% of eligible pickup earnings in the selected period.`
- `Most observed destinations from this zone ended in 3 private destination cells.`
- `Late tips added $X to this pickup zone's lifetime linked earnings.`

Forbidden language includes `most profitable area`, `wasted miles`, `route recommendation`, or a claim that all trips in a zone earned a displayed average when coverage is partial.

## Required implementation seams

1. Done: the authenticated store reads `ride_events`, `ride_update_batches`, batch-event links, and `ride_payments` for the current owner. Loading failures preserve the existing Deep Insights data; production QA must confirm its visible retry behavior.
2. Done: `zoneIntelligence.ts` is a pure tested derivation that applies global filters using local `day_date`, deduplicates financial evidence, and emits coverage/exclusion metadata.
3. Done: Deep Insights has a third tab with URL-backed zone mode and selected-cell state. It remains desktop-first; smaller screens receive a readable inspector, not a live driving map.
4. Deferred: add only indexes demonstrated by real query volume. Generate any migration at that time and preserve RLS plus explicit authenticated grants.
5. Local candidate: `user_zone_labels` is an owner-scoped label table keyed by `(user_id, zone_key)`, with approved text, timestamps, RLS, and no geographic columns beyond the existing coarse key. It is intentionally unapplied until release review.

## Validation contract

Automated tests must cover:

- one single-linked ride attributes its positive reconciled amount exactly once to its pickup cell;
- a batch-linked group contributes activity and coverage but zero zone earnings;
- a missing pickup zone cannot create a zone earnings row;
- a dropoff never duplicates pickup earnings;
- a late tip appears on its observed financial day and separately, explicitly, in the original pickup zone lifetime ledger;
- zero/negative/recovered snapshot paths are excluded;
- app, day, and date filters do not leak another owner's records;
- serialization, exports, labels, tooltips, and errors contain no raw coordinates, addresses, or routes; and
- empty, insufficient-sample, partial-coverage, and complete-evidence states are all understandable.

Owner QA must include allowed, denied, unavailable, and approximate iPhone location; a single ride; a batch; an unlinked ride; a late tip; period/app filters; label creation; and deletion of Movement history without alteration of financial totals.

## Explicitly deferred

- Background GPS, automatic mileage, odometer or vehicle maintenance, navigation, geofencing, market recommendations, and traffic/weather correlation.
- Allocation of a multi-ride accumulated update to individual rides.
- Inference of historical zones or geography from notes, times, IP, or past daily totals.
- Cross-user or public market comparisons.
