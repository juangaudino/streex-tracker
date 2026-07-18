drop policy if exists "Users delete their operational snapshots" on public.operational_snapshots;
revoke delete on public.operational_snapshots from authenticated;

comment on table public.operational_snapshots is
  'Append-only cumulative operational observations captured after successful Quick Updates. Authenticated owners may select and insert; rows change only through parent-account/week cascade cleanup.';
