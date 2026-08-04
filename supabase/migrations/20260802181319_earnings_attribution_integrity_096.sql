create table public.earnings_attributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_id uuid not null references public.earnings_snapshots(id) on delete cascade,
  amount numeric not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending', 'resolved', 'excluded')),
  mode text not null default 'unassigned'
    check (mode in ('exact', 'update_interval', 'shift_distributed', 'day_only', 'unassigned')),
  attributed_day_date date,
  shift_id text,
  effective_start_at timestamptz,
  effective_end_at timestamptz,
  source text not null default 'automatic'
    check (source in ('automatic', 'user', 'retroactive')),
  confidence text not null default 'unassigned'
    check (confidence in ('confirmed', 'estimated', 'unassigned')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint earnings_attributions_snapshot_unique unique (snapshot_id),
  constraint earnings_attributions_effective_range check (
    effective_start_at is null
    or effective_end_at is null
    or effective_end_at >= effective_start_at
  ),
  constraint earnings_attributions_resolved_target check (
    status <> 'resolved'
    or (
      attributed_day_date is not null
      and mode <> 'unassigned'
      and confidence <> 'unassigned'
    )
  )
);

create index earnings_attributions_user_status_idx
  on public.earnings_attributions (user_id, status, updated_at desc);

create index earnings_attributions_user_day_idx
  on public.earnings_attributions (user_id, attributed_day_date, shift_id);

alter table public.earnings_attributions enable row level security;

create policy "Users read their own earnings attributions"
  on public.earnings_attributions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert their own earnings attributions"
  on public.earnings_attributions for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.earnings_snapshots snapshot
      where snapshot.id = snapshot_id
        and snapshot.user_id = (select auth.uid())
    )
  );

create policy "Users update their own earnings attributions"
  on public.earnings_attributions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.earnings_snapshots snapshot
      where snapshot.id = snapshot_id
        and snapshot.user_id = (select auth.uid())
    )
  );

grant select, insert, update on public.earnings_attributions to authenticated;
grant all on public.earnings_attributions to service_role;

comment on table public.earnings_attributions is
  'Owner-scoped interpretation layer that separates when an earnings delta was observed from when it was operationally earned. Original earnings snapshots remain immutable evidence.';
