-- Beta 0.10.3: owner-confirmed broad labels for already stored coarse zone keys.
-- No coordinates, addresses, routes, or provider response payloads are stored.
create table public.user_zone_labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  zone_key text not null,
  label text not null check (char_length(trim(label)) between 1 and 80),
  source text not null default 'user' check (source in ('user', 'suggested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, zone_key)
);

create index user_zone_labels_user_updated_idx
  on public.user_zone_labels (user_id, updated_at desc);

alter table public.user_zone_labels enable row level security;

create policy "Users read their zone labels"
  on public.user_zone_labels for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users insert their zone labels"
  on public.user_zone_labels for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users update their zone labels"
  on public.user_zone_labels for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.user_zone_labels from anon;
revoke delete, truncate, references, trigger on public.user_zone_labels from authenticated;
grant select, insert, update on public.user_zone_labels to authenticated;
grant all on public.user_zone_labels to service_role;

comment on table public.user_zone_labels is
  'Owner-confirmed broad place labels for existing private coarse zone keys. Stores no coordinates, addresses, or reverse-geocoding payloads.';
