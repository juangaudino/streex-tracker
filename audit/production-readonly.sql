-- STREEX production integrity audit. SELECT-only by design.
-- Output contains aggregate counts only; no email, user id, note, or earnings value.
-- Run against the confirmed active project: ywbrovislvqkfzsyqpiv.
with week_base as (
  select id, user_id, start_date, end_date, status, weekly_goal, entries,
    case when jsonb_typeof(entries) = 'array' then jsonb_array_length(entries) end entry_count
  from public.weeks
), days as (
  select w.*, item.value as day_json
  from week_base w
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(entries) = 'array' then entries else '[]'::jsonb end
  ) item
), shifts as (
  select d.*, item.value as shift_json, item.ordinality as shift_no
  from days d
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(day_json->'shifts') = 'array' then day_json->'shifts' else '[]'::jsonb end
  ) with ordinality item(value, ordinality)
), duplicate_snapshots as (
  select count(*) copies
  from public.earnings_snapshots
  group by user_id, week_id, day_date, app, previous_amount, new_amount, delta, coalesce(shift_id, '')
  having count(*) > 1
), app_values as (
  select value
  from days
  cross join lateral jsonb_each(day_json->'apps')
), bonuses as (
  select item.value as bonus
  from days
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(day_json->'bonuses') = 'array' then day_json->'bonuses' else '[]'::jsonb end
  ) item
)
select jsonb_build_object(
  'weeks_total', (select count(*) from week_base),
  'users_with_weeks', (select count(distinct user_id) from week_base),
  'invalid_week_ranges', (select count(*) from week_base where
    start_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or end_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or (start_date::date > end_date::date)),
  'invalid_statuses', (select count(*) from week_base where status not in ('open', 'closed')),
  'negative_weekly_goals', (select count(*) from week_base where weekly_goal < 0),
  'invalid_entry_counts', (select count(*) from week_base where entry_count is null or entry_count <> 7),
  'days_total', (select count(*) from days),
  'malformed_day_dates', (select count(*) from days where coalesce(day_json->>'date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  'negative_day_mileage', (select count(*) from days where jsonb_typeof(day_json->'mileage') = 'number' and (day_json->>'mileage')::numeric < 0),
  'non_numeric_app_earnings', (select count(*) from app_values where jsonb_typeof(value) <> 'number'),
  'negative_app_earnings', (select count(*) from app_values where jsonb_typeof(value) = 'number' and (value #>> '{}')::numeric < 0),
  'non_numeric_bonuses', (select count(*) from bonuses where jsonb_typeof(bonus->'amount') <> 'number'),
  'negative_bonuses', (select count(*) from bonuses where jsonb_typeof(bonus->'amount') = 'number' and (bonus->>'amount')::numeric < 0),
  'shifts_total', (select count(*) from shifts),
  'inverted_shifts', (select count(*) from shifts where nullif(shift_json->>'endTime', '') is not null and (shift_json->>'startTime')::timestamp >= (shift_json->>'endTime')::timestamp),
  'shifts_outside_day', (select count(*) from shifts where left(shift_json->>'startTime', 10) is distinct from day_json->>'date' or (nullif(shift_json->>'endTime', '') is not null and left(shift_json->>'endTime', 10) is distinct from day_json->>'date')),
  'negative_shift_metrics', (select count(*) from shifts where
    (jsonb_typeof(shift_json->'miles') = 'number' and (shift_json->>'miles')::numeric < 0)
    or (jsonb_typeof(shift_json->'rideCount') = 'number' and (shift_json->>'rideCount')::numeric < 0)
    or (jsonb_typeof(shift_json->'earnings') = 'number' and (shift_json->>'earnings')::numeric < 0)),
  'snapshot_count', (select count(*) from public.earnings_snapshots),
  'snapshot_delta_mismatches', (select count(*) from public.earnings_snapshots where abs((new_amount - previous_amount) - delta) >= 0.01),
  'orphaned_snapshots', (select count(*) from public.earnings_snapshots snapshot left join public.weeks week on week.id = snapshot.week_id and week.user_id = snapshot.user_id where week.id is null),
  'duplicate_snapshot_groups', (select count(*) from duplicate_snapshots),
  'excess_duplicate_snapshot_rows', (select coalesce(sum(copies - 1), 0) from duplicate_snapshots),
  'users_missing_settings', (select count(*) from (select distinct user_id from week_base except select user_id from public.user_settings) missing)
) as audit_counts;
