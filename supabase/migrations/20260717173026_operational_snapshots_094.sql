create table public.operational_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_id uuid not null references public.weeks(id) on delete cascade,
  day_date date not null,
  shift_id text,
  recorded_at timestamptz not null default now(),
  app_totals jsonb not null default '{}'::jsonb,
  rides_by_app jsonb not null default '{}'::jsonb,
  day_mileage numeric not null default 0 check (day_mileage >= 0),
  source text not null default 'quick_update' check (source = 'quick_update'),
  event_key text not null unique,
  created_at timestamptz not null default now()
);

create index operational_snapshots_user_recorded_idx
  on public.operational_snapshots (user_id, recorded_at);
create index operational_snapshots_user_day_idx
  on public.operational_snapshots (user_id, day_date, recorded_at);
create index operational_snapshots_week_shift_idx
  on public.operational_snapshots (week_id, shift_id, recorded_at);

alter table public.operational_snapshots enable row level security;

create policy "Users read their operational snapshots"
  on public.operational_snapshots for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert their operational snapshots"
  on public.operational_snapshots for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users delete their operational snapshots"
  on public.operational_snapshots for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.operational_snapshots to authenticated;
grant all on public.operational_snapshots to service_role;

comment on table public.operational_snapshots is
  'Append-only cumulative operational observations captured after successful Quick Updates.';
