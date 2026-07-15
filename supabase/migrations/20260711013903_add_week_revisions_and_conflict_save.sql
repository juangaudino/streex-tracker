create table public.week_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_id uuid not null references public.weeks(id) on delete cascade,
  source_updated_at timestamptz not null,
  start_date text not null,
  end_date text not null,
  weekly_goal numeric not null,
  weekly_hours_goal numeric not null default 0,
  status text not null check (status in ('open', 'closed')),
  entries jsonb not null,
  reason text not null default 'before_update' check (reason in ('before_update', 'before_restore')),
  created_at timestamptz not null default now()
);

create index week_revisions_owner_week_created_at_idx
  on public.week_revisions (user_id, week_id, created_at desc);

alter table public.week_revisions enable row level security;

grant select, insert on public.week_revisions to authenticated;

create policy "Users can view their own week revisions"
  on public.week_revisions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own week revisions"
  on public.week_revisions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create or replace function public.update_week_with_revision(
  p_week_id uuid,
  p_expected_updated_at timestamptz,
  p_start_date text,
  p_end_date text,
  p_weekly_goal numeric,
  p_weekly_hours_goal numeric,
  p_status text,
  p_entries jsonb
)
returns table (save_status text, saved_updated_at timestamptz, revision_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_week public.weeks%rowtype;
  next_updated_at timestamptz := now();
  saved_revision_id uuid;
begin
  select *
    into current_week
    from public.weeks
   where id = p_week_id
     and user_id = (select auth.uid())
     and updated_at = p_expected_updated_at
   for update;

  if not found then
    return query select 'conflict'::text, null::timestamptz, null::uuid;
    return;
  end if;

  if p_status not in ('open', 'closed') then
    raise exception 'Invalid week status.' using errcode = '22023';
  end if;

  insert into public.week_revisions (
    user_id,
    week_id,
    source_updated_at,
    start_date,
    end_date,
    weekly_goal,
    weekly_hours_goal,
    status,
    entries,
    reason
  ) values (
    current_week.user_id,
    current_week.id,
    current_week.updated_at,
    current_week.start_date,
    current_week.end_date,
    current_week.weekly_goal,
    current_week.weekly_hours_goal,
    current_week.status,
    current_week.entries,
    'before_update'
  )
  returning id into saved_revision_id;

  update public.weeks
     set start_date = p_start_date,
         end_date = p_end_date,
         weekly_goal = p_weekly_goal,
         weekly_hours_goal = p_weekly_hours_goal,
         status = p_status,
         entries = p_entries,
         updated_at = next_updated_at
   where id = current_week.id
     and user_id = current_week.user_id;

  return query select 'saved'::text, next_updated_at, saved_revision_id;
end;
$$;

create or replace function public.restore_week_revision(
  p_week_id uuid,
  p_revision_id uuid,
  p_expected_updated_at timestamptz
)
returns table (save_status text, saved_updated_at timestamptz, revision_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_week public.weeks%rowtype;
  requested_revision public.week_revisions%rowtype;
  next_updated_at timestamptz := now();
  saved_revision_id uuid;
begin
  select *
    into current_week
    from public.weeks
   where id = p_week_id
     and user_id = (select auth.uid())
     and updated_at = p_expected_updated_at
   for update;

  if not found then
    return query select 'conflict'::text, null::timestamptz, null::uuid;
    return;
  end if;

  select *
    into requested_revision
    from public.week_revisions
   where id = p_revision_id
     and week_id = current_week.id
     and user_id = current_week.user_id;

  if not found then
    raise exception 'Revision not found.' using errcode = 'P0002';
  end if;

  insert into public.week_revisions (
    user_id,
    week_id,
    source_updated_at,
    start_date,
    end_date,
    weekly_goal,
    weekly_hours_goal,
    status,
    entries,
    reason
  ) values (
    current_week.user_id,
    current_week.id,
    current_week.updated_at,
    current_week.start_date,
    current_week.end_date,
    current_week.weekly_goal,
    current_week.weekly_hours_goal,
    current_week.status,
    current_week.entries,
    'before_restore'
  )
  returning id into saved_revision_id;

  update public.weeks
     set start_date = requested_revision.start_date,
         end_date = requested_revision.end_date,
         weekly_goal = requested_revision.weekly_goal,
         weekly_hours_goal = requested_revision.weekly_hours_goal,
         status = requested_revision.status,
         entries = requested_revision.entries,
         updated_at = next_updated_at
   where id = current_week.id
     and user_id = current_week.user_id;

  return query select 'saved'::text, next_updated_at, saved_revision_id;
end;
$$;

create or replace function public.list_week_revisions(p_week_id uuid)
returns table (
  id uuid,
  source_updated_at timestamptz,
  start_date text,
  end_date text,
  weekly_goal numeric,
  weekly_hours_goal numeric,
  status text,
  entries jsonb,
  reason text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    revision.id,
    revision.source_updated_at,
    revision.start_date,
    revision.end_date,
    revision.weekly_goal,
    revision.weekly_hours_goal,
    revision.status,
    revision.entries,
    revision.reason,
    revision.created_at
  from public.week_revisions revision
  where revision.week_id = p_week_id
    and revision.user_id = (select auth.uid())
  order by revision.created_at desc
  limit 50;
$$;

grant execute on function public.update_week_with_revision(uuid, timestamptz, text, text, numeric, numeric, text, jsonb) to authenticated;
grant execute on function public.restore_week_revision(uuid, uuid, timestamptz) to authenticated;
grant execute on function public.list_week_revisions(uuid) to authenticated;
