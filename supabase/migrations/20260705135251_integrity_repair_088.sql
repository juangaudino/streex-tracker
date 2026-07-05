-- Beta 0.8.8: one-time integrity repair plus snapshot idempotency.
-- The backup schema is not exposed to the Data API and is accessible only to
-- privileged database operators. Every repair remains reversible.

create schema if not exists streex_internal;
revoke all on schema streex_internal from public, anon, authenticated;

create table if not exists streex_internal.integrity_repair_20260705 (
  backup_id bigint generated always as identity primary key,
  repair_kind text not null,
  source_table text not null,
  source_id uuid not null,
  payload jsonb not null,
  backed_up_at timestamptz not null default now()
);

revoke all on streex_internal.integrity_repair_20260705 from public, anon, authenticated;

-- Back up each week that has excessive shift-mile components or a completed
-- shift whose stored blocks exceed its edited boundaries.
insert into streex_internal.integrity_repair_20260705 (repair_kind, source_table, source_id, payload)
select 'week_json_before_repair', 'weeks', week.id, to_jsonb(week)
from public.weeks week
where exists (
  select 1
  from jsonb_array_elements(week.entries) day_item(day_json)
  where (
    jsonb_typeof(day_json->'mileage') = 'number'
    and (
      select coalesce(sum(
        case when jsonb_typeof(shift_item.shift_json->'miles') = 'number'
          then (shift_item.shift_json->>'miles')::numeric else 0 end
      ), 0)
      from jsonb_array_elements(
        case when jsonb_typeof(day_json->'shifts') = 'array' then day_json->'shifts' else '[]'::jsonb end
      ) shift_item(shift_json)
    ) > (day_json->>'mileage')::numeric + 0.02
  )
  or exists (
    select 1
    from jsonb_array_elements(
      case when jsonb_typeof(day_json->'shifts') = 'array' then day_json->'shifts' else '[]'::jsonb end
    ) shift_item(shift_json)
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(shift_json->'blocks') = 'array' then shift_json->'blocks' else '[]'::jsonb end
    ) block_item(block_json)
    where nullif(shift_json->>'endTime', '') is not null
      and (
        (block_json->>'startTime')::timestamp < (shift_json->>'startTime')::timestamp
        or block_json->>'endTime' is null
        or (block_json->>'endTime')::timestamp > (shift_json->>'endTime')::timestamp
      )
  )
);

-- Repair JSON in-place. Mileage reductions are taken from the most recent
-- shift backwards, matching the application's accumulated-day correction
-- semantics. Work blocks are clamped to the edited shift boundaries and
-- invalid zero/negative blocks are removed without collapsing valid pauses.
do $$
declare
  week_row record;
  entries_json jsonb;
  day_json jsonb;
  shifts_json jsonb;
  shift_json jsonb;
  blocks_json jsonb;
  block_json jsonb;
  repaired_blocks jsonb;
  day_index integer;
  shift_index integer;
  block_index integer;
  shift_count integer;
  block_count integer;
  shift_sum numeric;
  day_miles numeric;
  shift_miles numeric;
  excess numeric;
  reduction numeric;
  shift_start timestamp;
  shift_end timestamp;
  block_start timestamp;
  block_end timestamp;
  changed boolean;
begin
  for week_row in
    select week.id, week.entries
    from public.weeks week
    where exists (
      select 1 from streex_internal.integrity_repair_20260705 backup
      where backup.repair_kind = 'week_json_before_repair'
        and backup.source_id = week.id
    )
  loop
    entries_json := week_row.entries;
    changed := false;

    for day_index in 0..jsonb_array_length(entries_json) - 1 loop
      day_json := entries_json->day_index;
      shifts_json := case when jsonb_typeof(day_json->'shifts') = 'array'
        then day_json->'shifts' else '[]'::jsonb end;
      shift_count := jsonb_array_length(shifts_json);

      if shift_count > 0 and jsonb_typeof(day_json->'mileage') = 'number' then
        day_miles := greatest(0, (day_json->>'mileage')::numeric);
        select coalesce(sum(
          case when jsonb_typeof(item.value->'miles') = 'number'
            then greatest(0, (item.value->>'miles')::numeric) else 0 end
        ), 0) into shift_sum
        from jsonb_array_elements(shifts_json) item(value);

        excess := round(shift_sum - day_miles, 2);
        if excess > 0.02 then
          for shift_index in reverse shift_count - 1..0 loop
            exit when excess <= 0;
            shift_json := shifts_json->shift_index;
            shift_miles := case when jsonb_typeof(shift_json->'miles') = 'number'
              then greatest(0, (shift_json->>'miles')::numeric) else 0 end;
            reduction := least(shift_miles, excess);
            shift_json := jsonb_set(
              shift_json,
              '{miles}',
              to_jsonb(round(shift_miles - reduction, 2)),
              true
            );
            shifts_json := jsonb_set(shifts_json, array[shift_index::text], shift_json);
            excess := round(excess - reduction, 2);
            changed := true;
          end loop;
        end if;
      end if;

      if shift_count > 0 then
        for shift_index in 0..shift_count - 1 loop
          shift_json := shifts_json->shift_index;
          if nullif(shift_json->>'endTime', '') is null
            or jsonb_typeof(shift_json->'blocks') is distinct from 'array'
            or jsonb_array_length(shift_json->'blocks') = 0 then
            continue;
          end if;

          shift_start := (shift_json->>'startTime')::timestamp;
          shift_end := (shift_json->>'endTime')::timestamp;
          blocks_json := shift_json->'blocks';
          block_count := jsonb_array_length(blocks_json);
          repaired_blocks := '[]'::jsonb;

          for block_index in 0..block_count - 1 loop
            block_json := blocks_json->block_index;
            block_start := case when block_index = 0
              then shift_start else (block_json->>'startTime')::timestamp end;
            block_start := greatest(block_start, shift_start);

            block_end := case
              when block_index = block_count - 1 then shift_end
              when nullif(block_json->>'endTime', '') is null then null
              else least((block_json->>'endTime')::timestamp, shift_end)
            end;

            if block_end is not null and block_end <= block_start then
              changed := true;
              continue;
            end if;

            block_json := jsonb_set(block_json, '{startTime}', to_jsonb(to_char(block_start, 'YYYY-MM-DD"T"HH24:MI:SS')), true);
            if block_end is not null then
              block_json := jsonb_set(block_json, '{endTime}', to_jsonb(to_char(block_end, 'YYYY-MM-DD"T"HH24:MI:SS')), true);
            end if;
            repaired_blocks := repaired_blocks || jsonb_build_array(block_json);
          end loop;

          if repaired_blocks is distinct from blocks_json then
            shift_json := jsonb_set(shift_json, '{blocks}', repaired_blocks, true);
            shifts_json := jsonb_set(shifts_json, array[shift_index::text], shift_json);
            changed := true;
          end if;
        end loop;
      end if;

      if shifts_json is distinct from day_json->'shifts' then
        day_json := jsonb_set(day_json, '{shifts}', shifts_json, true);
        entries_json := jsonb_set(entries_json, array[day_index::text], day_json);
      end if;
    end loop;

    if changed then
      update public.weeks
      set entries = entries_json, updated_at = now()
      where id = week_row.id;
    end if;
  end loop;
end
$$;

-- Preserve every redundant row before retaining the earliest copy.
insert into streex_internal.integrity_repair_20260705 (repair_kind, source_table, source_id, payload)
select 'duplicate_snapshot_before_delete', 'earnings_snapshots', duplicate.id, to_jsonb(duplicate)
from (
  select snapshot.*,
    row_number() over (
      partition by user_id, week_id, day_date, app, previous_amount, new_amount, delta, coalesce(shift_id, '')
      order by created_at, id
    ) as duplicate_rank
  from public.earnings_snapshots snapshot
) duplicate
where duplicate.duplicate_rank > 1;

delete from public.earnings_snapshots snapshot
using (
  select id
  from (
    select id,
      row_number() over (
        partition by user_id, week_id, day_date, app, previous_amount, new_amount, delta, coalesce(shift_id, '')
        order by created_at, id
      ) as duplicate_rank
    from public.earnings_snapshots
  ) ranked
  where duplicate_rank > 1
) duplicate
where snapshot.id = duplicate.id;

-- A logical week revision supplies one stable key for concurrent/retried
-- writes. Existing rows and older clients receive random legacy keys so the
-- column can be fully unique and PostgREST can target it with ON CONFLICT.
alter table public.earnings_snapshots
  add column if not exists event_key text;

update public.earnings_snapshots
set event_key = 'legacy:' || id::text
where event_key is null;

alter table public.earnings_snapshots
  alter column event_key set default ('legacy:' || gen_random_uuid()::text),
  alter column event_key set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'earnings_snapshots_event_key_unique'
      and conrelid = 'public.earnings_snapshots'::regclass
  ) then
    drop index if exists public.earnings_snapshots_event_key_unique;
    alter table public.earnings_snapshots
      add constraint earnings_snapshots_event_key_unique unique (event_key);
  end if;
end
$$;
