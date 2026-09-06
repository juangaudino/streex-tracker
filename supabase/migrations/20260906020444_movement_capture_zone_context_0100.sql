create table public.ride_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_id uuid not null references public.weeks(id) on delete cascade,
  day_date date not null,
  shift_id text,
  app text,
  status text not null default 'active' check (status in ('active', 'completed', 'linked_single', 'linked_batch', 'cancelled')),
  started_at timestamptz not null,
  ended_at timestamptz,
  start_zone_key text,
  end_zone_key text,
  start_capture_status text not null default 'unavailable' check (start_capture_status in ('captured', 'unavailable', 'denied', 'stale', 'imprecise')),
  end_capture_status text not null default 'unavailable' check (end_capture_status in ('captured', 'unavailable', 'denied', 'stale', 'imprecise')),
  start_accuracy_class text check (start_accuracy_class in ('high', 'usable')),
  end_accuracy_class text check (end_accuracy_class in ('high', 'usable')),
  source text not null default 'foreground_browser' check (source = 'foreground_browser'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create unique index ride_events_one_active_per_user
  on public.ride_events (user_id)
  where status = 'active';
create index ride_events_user_day_idx on public.ride_events (user_id, day_date, started_at desc);
create index ride_events_week_idx on public.ride_events (week_id, started_at desc);

alter table public.ride_events enable row level security;

create policy "Users read their ride events"
  on public.ride_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users insert their ride events"
  on public.ride_events for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users update their ride events"
  on public.ride_events for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete their ride events"
  on public.ride_events for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.ride_events to authenticated;
grant all on public.ride_events to service_role;

comment on table public.ride_events is
  'Owner-scoped foreground ride context. Stores coarse derived zones only; never raw coordinates or routes.';

create table public.ride_update_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app text not null,
  kind text not null check (kind in ('single', 'batch')),
  earnings_snapshot_id uuid not null unique references public.earnings_snapshots(id) on delete restrict,
  operational_event_key text,
  created_at timestamptz not null default now()
);

create table public.ride_update_batch_events (
  batch_id uuid not null references public.ride_update_batches(id) on delete cascade,
  ride_event_id uuid not null references public.ride_events(id) on delete cascade,
  primary key (batch_id, ride_event_id),
  unique (ride_event_id)
);

create index ride_update_batches_user_created_idx on public.ride_update_batches (user_id, created_at desc);

alter table public.ride_update_batches enable row level security;
alter table public.ride_update_batch_events enable row level security;

create policy "Users read their ride update batches"
  on public.ride_update_batches for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users insert their ride update batches"
  on public.ride_update_batches for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.earnings_snapshots snapshot
      where snapshot.id = earnings_snapshot_id
        and snapshot.user_id = (select auth.uid())
    )
  );
create policy "Users read their ride batch events"
  on public.ride_update_batch_events for select to authenticated
  using (exists (select 1 from public.ride_update_batches batch where batch.id = batch_id and batch.user_id = (select auth.uid())));
create policy "Users insert their ride batch events"
  on public.ride_update_batch_events for insert to authenticated
  with check (
    exists (select 1 from public.ride_update_batches batch where batch.id = batch_id and batch.user_id = (select auth.uid()))
    and exists (select 1 from public.ride_events ride where ride.id = ride_event_id and ride.user_id = (select auth.uid()))
  );

grant select, insert on public.ride_update_batches to authenticated;
grant select, insert on public.ride_update_batch_events to authenticated;
grant all on public.ride_update_batches, public.ride_update_batch_events to service_role;
