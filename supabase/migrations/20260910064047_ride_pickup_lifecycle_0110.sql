-- Version 1 events predate the acceptance → pickup → dropoff lifecycle.
-- Their start fields remain canonical pickup context and are never rewritten.
alter table public.ride_events
  add column lifecycle_version smallint not null default 1
    check (lifecycle_version in (1, 2)),
  add column pickup_at timestamptz,
  add column pickup_zone_key text,
  add column pickup_capture_status text not null default 'unavailable'
    check (pickup_capture_status in ('captured', 'unavailable', 'denied', 'stale', 'imprecise')),
  add column pickup_accuracy_class text
    check (pickup_accuracy_class in ('high', 'usable'));

alter table public.ride_events
  add constraint ride_events_pickup_after_acceptance_check
    check (pickup_at is null or pickup_at >= started_at),
  add constraint ride_events_pickup_before_finish_check
    check (pickup_at is null or ended_at is null or pickup_at <= ended_at);

comment on column public.ride_events.lifecycle_version is
  '1: legacy start means pickup. 2: started_at/start zone means acceptance and pickup fields are the canonical earnings zone.';
comment on column public.ride_events.pickup_zone_key is
  'Coarse foreground pickup cell for lifecycle version 2. No raw coordinates or addresses are retained.';
