# Movement Capture & Zone Context — Technical Design

Status: approved product and interaction architecture; foreground capture implementation is in progress locally. The local migration, generated client contract, and UI work have not been applied to the active Supabase project or deployed to production.

Target: `Beta 0.10.0 - Movement Capture & Zone Context`.

## Product Decision

Streex will let a driver record an optional **ride/delivery event** with `Start ride` and `Finish ride` while the PWA is in the foreground. The primary value of this release is private zone context: knowing the approximate origin and destination zone of work that the driver intentionally records.

It will not attempt to be a background tracker, navigator, telematics product, or automatic odometer. A browser PWA cannot promise continuous GPS when minimized, locked, or terminated. Capturing only the start and end position also cannot measure the road distance driven: it only yields straight-line distance, which must never replace actual Uber/manual miles.

The existing accumulated totals remain the contract:

- `day.mileage` stays the authoritative shared daily mileage value. The driver may enter Uber-reported miles in Quick Actions as today.
- `earnings_snapshots` remains the append-only evidence of a changed app total.
- `operational_snapshots` remains the append-only evidence of a successful Quick Update.
- `earnings_attributions` remains the only layer that determines when a valid earnings delta belongs in hourly intelligence.
- A new event provides context and links to this evidence when justified; it does not rewrite it.

## Experience Contract

### One system, two responsibilities

Movement is not a second Quick Actions panel or a separate work mode.

- **Movement** records the exact work context that must happen at a particular moment: start ride, finish ride, and foreground start/end zone capture.
- **Quick Actions** remains the only hub for shift controls and accumulated financial/operational updates: start, pause, resume, end, app totals, daily app rides, and Uber/manual daily miles.
- Full Focus is the primary Movement surface. Entry exposes the same shared control as a compact current-day/active-shift affordance; it does not implement a second state machine.

The only direct Full Focus controls are the one-tap `Start ride` or `Finish ride` actions. They exist because their timestamp and zone need to be captured at that exact real-world moment. Movement never displays money, mileage, ride-total inputs, or a separate save form.

### Start ride

1. The driver uses the Full Focus Movement utility or the compact Entry control and chooses `Start ride`.
2. Streex preselects the last-used active app; the driver may change it or leave it unspecified before the one-tap capture.
3. It creates a local in-progress event immediately, then requests one foreground browser location.
4. A valid reading records a coarse start-zone key and an accuracy class. A denied, stale, timed-out, or too-imprecise reading never blocks the event; the event shows `zone unavailable` instead.
5. The event records the current active shift when there is one. Without one, Movement sends the driver to the existing Quick Actions sheet for an explicit choice: `Start shift + ride` or `Record ride without shift`. It never starts a shift silently.
6. Only one ride may be active at a time across every app. Starting another ride requires finishing or cancelling the first one.

### Finish ride

1. `Finish ride` records the completion time and requests one foreground browser location for the coarse end zone.
2. The Movement utility shows two equally valid choices: `Update totals now` or `Do this later`.
3. `Update totals now` opens the existing Quick Actions sheet directly in the app-specific accumulated Quick Update, with the ride app and one pending ride-context notice already selected. It does not ask for a per-ride amount and does not create a second form.
4. `Do this later` preserves the completed event as pending financial context without claiming any money, miles, or individual efficiency. The next relevant Quick Actions update presents the same pending-context notice.

### Linking rules

- If exactly one compatible completed event has no financial context and the next Quick Update is for the same app, the driver may confirm that the resulting increase belongs to that ride. The save creates a `single event` link to the newly created earnings and operational observations.
- If several compatible events are waiting, the driver may confirm that the update covers the group. The system preserves a batch link but assigns no per-event earnings or miles.
- If a total is corrected downward or a later update primarily restores a prior amount, existing snapshot-reconciliation logic continues to decide its effective earnings. A ride event never makes a recovery look like new income.
- A driver can leave all events unlinked. Unlinked events provide time/zone coverage only and never power earnings-per-zone claims.

### How Quick Actions presents pending context

Quick Actions remains recognizable. It receives at most one compact context row above the existing accumulated fields:

| Context | Quick Actions behavior |
| --- | --- |
| One just-finished compatible ride | Shows `Apply this increase to the ride just closed?` with `Confirm` and `Keep separate`. |
| One older compatible pending ride | Shows one non-blocking pending-ride notice and the same choice. |
| Two or more compatible pending rides | Shows `This update covers N completed rides` and offers an explicit batch confirmation; no individual amount is shown. |
| No compatible ride, another app, zero delta, or downward correction | Shows no suggested ride link; the normal Quick Actions and attribution flow remains unchanged. |

The driver can always dismiss the row and save exactly as before. Quick Actions never increments ride counts or mileage on behalf of Movement; the accumulated values typed by the driver remain authoritative.

### Entry access

Entry uses the same `RideCaptureControl` state and service as Full Focus.

- It appears only for the current local day, inside the active-shift/current-day area, as a compact start/finish/status control rather than a new large card.
- It can resume an active event and expose completed pending events after reload, just as Full Focus does.
- Historical Entry and History never offer GPS ride capture, because they cannot honestly recreate past zone context.

## Location and Privacy Contract

### Captured and retained

For a successful endpoint capture, persist only:

- coarse, stable zone key (proposed: an H3 cell at a deliberately broad resolution, selected during implementation review);
- capture timestamp;
- accuracy bucket (`high`, `usable`, or `unavailable`), not the precise accuracy number;
- capture source (`foreground_browser`) and capture status;
- event/shift/app linkage described below.

The browser receives latitude, longitude, and measured accuracy only long enough to decide whether the reading is usable and derive the coarse zone key. Raw coordinates, full location traces, street addresses, reverse-geocoded places, device identifiers, IP-derived location, and touch coordinates must not be written to Supabase, localStorage, analytics, logs, exports, or error reporting.

### Consent and control

- Request browser location only after an intentional `Start ride` or `Finish ride` action, never on page load or in the background.
- Clearly explain that the permission records an approximate work zone only while Streex is open.
- GPS stays optional. `Zone unavailable` is a valid event state, not an error that blocks work.
- Add a Settings privacy control to disable movement capture and an owner-scoped action to delete captured movement history. Deletion never alters weekly totals or append-only financial snapshots.
- Conditions uses its current transient browser location request independently. It must not receive, persist, or reuse movement event coordinates.

## Proposed Data Model

The future migration must be generated and reviewed only at implementation time against the active project `ywbrovislvqkfzsyqpiv`. This is a design, not SQL to apply.

### `ride_events`

Owner-scoped event record. It contains no raw coordinate columns.

| Field | Purpose |
| --- | --- |
| `id`, `user_id` | Stable identity and ownership. |
| `week_id`, `day_date`, `shift_id` | Existing Streex context; `shift_id` may be null. |
| `app` | Optional active-app key at capture time. |
| `status` | `active`, `completed`, `linked_single`, `linked_batch`, or `cancelled`. |
| `started_at`, `ended_at` | Intentional event timing. |
| `start_zone_key`, `end_zone_key` | Coarse derived zone only. |
| `start_capture_status`, `end_capture_status` | `captured`, `unavailable`, `denied`, `stale`, or `imprecise`. |
| `start_accuracy_class`, `end_accuracy_class` | `high`, `usable`, or null; no exact precision retained. |
| `source` | Initially only `foreground_browser`. |
| `created_at`, `updated_at` | Audit/order fields. |

### `ride_update_batches` and `ride_update_batch_events`

These tables model the relationship between completed events and an existing financial update without duplicating money:

- `ride_update_batches` links one confirmed `single` or `batch` decision to its app, user, `earnings_snapshot_id`, and optional `operational_snapshot_id`.
- `ride_update_batch_events` associates one or more `ride_events` with that batch.
- No amount is copied into an individual ride event. Zone earnings analytics must derive an eligible amount from the linked, reconciled snapshot only for a single-event link; batch links expose coverage but no per-event earnings rate.

This normalized shape keeps an original snapshot append-only, prevents multiplying one accumulated delta by several events, and leaves a future explicit allocation workflow possible without rewriting history.

### Confirmed ride-interval attribution

A confirmed single-event link adds a future `ride_interval` attribution mode. It uses the event's actual `started_at` and `ended_at`, rather than pretending the earnings occurred at the later Quick Update save time.

- It is valid only when that interval belongs to the selected shift's worked blocks and does not cross a recorded pause.
- It is `confirmed` only after the driver explicitly accepts the compatible single-ride suggestion.
- A no-shift event, a pause-crossing event, a batch, zero/negative delta, or a corrected recovery may retain its movement link but does not receive ride-interval hourly attribution.
- This requires a future migration/validation update to the current earnings-attribution mode constraint and client contract; it is not a reinterpretation of existing snapshots.

### Security and lifecycle

- All three tables live in `public`, enable RLS, and receive explicit `authenticated` grants only if the active project's Data API requires them.
- Every `select`, `insert`, `update`, and `delete` policy uses `TO authenticated` plus `(select auth.uid()) = user_id`; update policies include both `USING` and `WITH CHECK` ownership predicates.
- A user may update only their active/completed event state and may delete their own movement record for privacy. Deleting an event cascades only to its event association, never to `earnings_snapshots`, `operational_snapshots`, a week, or attribution rows.
- Snapshot foreign keys are restrictive; no cascade from a movement record can delete financial evidence.
- Generated Supabase types, client parsers, and RLS tests are required before any UI ships.

## Application Integration

### Existing seams to preserve

- `src/components/QuickEntryWidget.tsx` owns Quick Actions, accumulated app totals, the active-shift lookup, and `onQuickUpdateSaved`.
- `src/hooks/useWeekStore.ts` saves the revision-aware week first, then creates append-only earnings snapshots and receives operational snapshots.
- `src/lib/earningsSnapshots.ts` reconciles accumulated-total corrections. It must remain the sole source for effective delta calculations.
- `src/lib/operationalSnapshots.ts` creates the idempotent Quick Update record; its `event_key` pattern must remain distinct from movement event IDs.

### Required future interface change

`updateWeek`/Quick Actions currently exposes only success/failure to its caller, while the future event link needs the actual resulting snapshot identity. The implementation must return a typed **save receipt** after the existing save path succeeds, containing the inserted or matched earnings snapshot IDs and operational snapshot ID. It must not guess an ID from client state or timing.

The movement write happens after that receipt is available. If the movement-link write fails, the financial save remains successful; the event stays completed and unlinked, with a visible retry. A retry uses an idempotent event/batch key so it cannot duplicate a relationship. The receipt also enables the optional confirmed `ride_interval` attribution without guessing an ID or using the save timestamp as earned time.

### Full Focus utilities

The screen in the approved reference shows Conditions/Octopus consuming the full utility slot. The future settings preference is explicit rather than rotating:

- `movement`: compact current ride state and the only direct `Start ride`/`Finish ride` capture shortcut; `Update totals now` always returns to Quick Actions;
- `conditions`: current combined weather/traffic utility;
- `octopus`: existing reward progress;
- `hidden`: no utility module.

The initial preference should honor the owner's selected state rather than silently removing existing functionality. The approved interaction architecture places Movement in this slot for Full Focus and keeps Quick Actions as the financial/shift hub; detailed production copy and spacing still require visual QA before implementation.

## Analytics Contract

Initial reporting may show only:

- captured start/end zone counts;
- completed-event and location-capture coverage;
- event timing and shift association coverage;
- counts of single links, batch links, and unlinked completed events.

Future zone income or efficiency analysis requires all of the following:

1. a single-event financial link;
2. a reconciled, positive effective delta;
3. explicit display of captured coverage and excluded/batch events;
4. a minimum sample threshold approved with the analytic surface.

No zone, time, app, weather, or route conclusion is shown when this evidence is missing. Batch links cannot become per-ride earnings by division.

## Validation Plan Before Release

Automated coverage:

- event state transitions, idempotent retries, day-boundary handling, app mismatch, and multi-shift association;
- coarse-zone derivation and a hard test that serialization contains no latitude, longitude, route, or address fields;
- one-event vs multi-event financial link rules, correction reconciliation, confirmed ride-interval validation against worked blocks/pauses, and no-money unlinked state;
- RLS isolation in both directions for all new tables, including rejected cross-user update/delete attempts;
- no changes to current manual mileage allocation, earnings snapshots, operational snapshots, attribution, History import, Deep Insights, or exports.

Owner physical-device QA:

- iPhone installed PWA: first permission, allowed/denied/approximate location, start/end, backgrounding during an event, reload, offline retry, and timezone/day-boundary behavior;
- verify that movement capture never implies background tracking or creates automatic day miles;
- enter Uber-reported miles manually after a ride and confirm existing daily/shift mileage and earnings metrics remain correct;
- confirm a single immediate update can link one event, while multiple deferred events remain a batch with no invented individual earnings;
- inspect Settings disable/delete behavior and confirm deleted movement context does not alter financial history.

## Explicitly Deferred

- continuous foreground route sampling and GPS-derived route mileage;
- all background, lock-screen, or terminated-app location capture;
- raw coordinate storage, maps, route replay, address/place names, geofencing, navigation, and third-party location analytics;
- automatic per-ride payout imports or ride-level earnings allocation across a deferred batch;
- vehicle odometer, maintenance, market recommendations, and zone-performance rankings before sufficient captured evidence exists.
