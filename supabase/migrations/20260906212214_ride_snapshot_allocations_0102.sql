-- Beta 0.10.2: an editable allocation ledger. The earnings snapshot remains the
-- immutable observed financial record; these rows only explain portions of it.
create table public.earnings_snapshot_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  earnings_snapshot_id uuid not null references public.earnings_snapshots(id) on delete restrict,
  ride_event_id uuid references public.ride_events(id) on delete restrict,
  allocation_set_id uuid not null default gen_random_uuid(),
  kind text not null check (kind in ('ride_base', 'late_tip', 'adjustment', 'update_interval', 'unassigned')),
  amount numeric(12, 2) not null check (amount > 0),
  observed_at timestamptz not null,
  attributed_day_date date,
  shift_id text,
  effective_start_at timestamptz,
  effective_end_at timestamptz,
  note text,
  is_current boolean not null default true,
  replaced_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (kind in ('ride_base', 'late_tip', 'adjustment') and ride_event_id is not null)
    or (kind in ('update_interval', 'unassigned') and ride_event_id is null)
  ),
  check (effective_end_at is null or effective_start_at is null or effective_end_at >= effective_start_at)
);

create index earnings_snapshot_allocations_user_snapshot_idx
  on public.earnings_snapshot_allocations (user_id, earnings_snapshot_id, is_current, created_at);
create index earnings_snapshot_allocations_user_ride_idx
  on public.earnings_snapshot_allocations (user_id, ride_event_id, is_current, observed_at desc)
  where ride_event_id is not null;

alter table public.earnings_snapshot_allocations enable row level security;

create policy "Users read their snapshot allocations"
  on public.earnings_snapshot_allocations for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert their snapshot allocations"
  on public.earnings_snapshot_allocations for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.earnings_snapshots snapshot
      where snapshot.id = earnings_snapshot_id
        and snapshot.user_id = (select auth.uid())
    )
    and (ride_event_id is null or exists (
      select 1 from public.ride_events ride
      where ride.id = ride_event_id
        and ride.user_id = (select auth.uid())
    ))
  );

-- Allocation revisions are append-only in the application: old rows are only
-- retired by setting is_current false and replaced by a new allocation set.
create policy "Users retire their snapshot allocations"
  on public.earnings_snapshot_allocations for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.earnings_snapshot_allocations from anon;
revoke delete, truncate, references, trigger on public.earnings_snapshot_allocations from authenticated;
grant select, insert, update on public.earnings_snapshot_allocations to authenticated;
grant all on public.earnings_snapshot_allocations to service_role;

comment on table public.earnings_snapshot_allocations is
  'Owner-scoped editable allocation ledger for portions of immutable observed earnings snapshots. It never changes reported totals or the source snapshot.';
