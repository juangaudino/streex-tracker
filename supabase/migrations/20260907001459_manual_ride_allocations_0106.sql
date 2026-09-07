-- Beta 0.10.6: owner-confirmed allocations for historical/manual daily totals
-- that predate an immutable Quick Actions snapshot. These rows never modify the
-- source daily total stored in weeks.entries.
create table public.manual_ride_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_id uuid not null references public.weeks(id) on delete cascade,
  day_date date not null,
  app text not null,
  ride_event_id uuid references public.ride_events(id) on delete restrict,
  allocation_set_id uuid not null default gen_random_uuid(),
  kind text not null check (kind in ('ride_base', 'unassigned')),
  amount numeric(12, 2) not null check (amount > 0),
  source_total numeric(12, 2) not null check (source_total > 0),
  note text,
  is_current boolean not null default true,
  replaced_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (kind = 'ride_base' and ride_event_id is not null)
    or (kind = 'unassigned' and ride_event_id is null)
  )
);

create index manual_ride_allocations_user_scope_idx
  on public.manual_ride_allocations (user_id, week_id, day_date, app, is_current, created_at);
create index manual_ride_allocations_user_ride_idx
  on public.manual_ride_allocations (user_id, ride_event_id, is_current, created_at desc)
  where ride_event_id is not null;

alter table public.manual_ride_allocations enable row level security;

create policy "Users read their manual ride allocations"
  on public.manual_ride_allocations for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert their manual ride allocations"
  on public.manual_ride_allocations for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.weeks week
      where week.id = week_id and week.user_id = (select auth.uid())
    )
    and (ride_event_id is null or exists (
      select 1 from public.ride_events ride
      where ride.id = ride_event_id and ride.user_id = (select auth.uid())
    ))
  );

create policy "Users retire their manual ride allocations"
  on public.manual_ride_allocations for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.manual_ride_allocations from anon;
revoke delete, truncate, references, trigger on public.manual_ride_allocations from authenticated;
grant select, insert, update on public.manual_ride_allocations to authenticated;
grant all on public.manual_ride_allocations to service_role;

comment on table public.manual_ride_allocations is
  'Owner-confirmed revision ledger for a manual/historical daily app total. It never changes the source weekly entry or its reported financial total.';
