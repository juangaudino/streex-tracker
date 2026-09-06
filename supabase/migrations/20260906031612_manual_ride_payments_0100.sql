alter table public.ride_events
  drop constraint if exists ride_events_source_check;

alter table public.ride_events
  add constraint ride_events_source_check
  check (source in ('foreground_browser', 'manual_after_shift'));

create table public.ride_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ride_event_id uuid not null references public.ride_events(id) on delete cascade,
  earnings_snapshot_id uuid not null unique references public.earnings_snapshots(id) on delete restrict,
  kind text not null check (kind in ('manual_base', 'late_tip', 'adjustment')),
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index ride_payments_user_observed_idx on public.ride_payments (user_id, observed_at desc);
create index ride_payments_ride_idx on public.ride_payments (ride_event_id, observed_at);

alter table public.ride_payments enable row level security;

create policy "Users read their ride payments"
  on public.ride_payments for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert their ride payments"
  on public.ride_payments for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.ride_events ride where ride.id = ride_event_id and ride.user_id = (select auth.uid()))
    and exists (select 1 from public.earnings_snapshots snapshot where snapshot.id = earnings_snapshot_id and snapshot.user_id = (select auth.uid()))
  );

create policy "Users delete their ride payments"
  on public.ride_payments for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.ride_payments to authenticated;
grant all on public.ride_payments to service_role;

comment on table public.ride_payments is
  'Owner-scoped later payment context for a ride. Financial truth remains the linked append-only earnings snapshot.';
