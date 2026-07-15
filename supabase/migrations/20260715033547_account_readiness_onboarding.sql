create table public.user_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  setup_completed_at timestamptz,
  first_week_completed_at timestamptz,
  first_activity_completed_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_onboarding enable row level security;

grant select, insert, update on public.user_onboarding to authenticated;

create policy "Users can view their own onboarding"
  on public.user_onboarding for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own onboarding"
  on public.user_onboarding for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own onboarding"
  on public.user_onboarding for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_events_target_created_idx
  on public.admin_audit_events (target_user_id, created_at desc);

create index admin_audit_events_admin_created_idx
  on public.admin_audit_events (admin_user_id, created_at desc);

alter table public.admin_audit_events enable row level security;

revoke all on public.admin_audit_events from anon, authenticated;
