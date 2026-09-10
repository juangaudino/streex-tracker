-- Ask My Data planner: preserve the browser's IANA time zone on future
-- foreground rides. It is needed to aggregate local operating windows without
-- attempting to infer a historical clock from a UTC timestamp. It stores no
-- GPS, address, or route data.
alter table public.ride_events
  add column time_zone text;

comment on column public.ride_events.time_zone is
  'Browser IANA time zone captured when a foreground ride starts. Used only for aggregate local-time analysis; legacy rides remain null rather than being guessed.';
