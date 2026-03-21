create extension if not exists pgcrypto;

create or replace function public.current_auth_email()
returns text
language sql
stable
as $$
  select nullif(lower(coalesce(auth.jwt() ->> 'email', '')), '');
$$;

create or replace function public.current_command_center_role()
returns text
language sql
stable
as $$
  select ur.role
  from public.user_roles ur
  where lower(ur.email) = public.current_auth_email()
  order by case ur.role
    when 'super_admin' then 1
    when 'admin' then 2
    when 'manager' then 3
    when 'viewer' then 4
    else 5
  end
  limit 1;
$$;

create or replace function public.can_read_strategy_memory()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.user_roles ur
      where lower(ur.email) = public.current_auth_email()
    );
$$;

create or replace function public.can_write_strategy_memory()
returns boolean
language sql
stable
as $$
  select public.current_command_center_role() in ('super_admin', 'admin', 'manager');
$$;

create or replace function public.set_strategy_memory_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  if tg_table_name in ('strategy_profiles', 'strategy_requests') then
    new.updated_by_user_id = auth.uid();
  end if;
  return new;
end;
$$;

create table if not exists public.strategy_profiles (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  client_name text not null,
  status text not null default 'active',
  identity jsonb not null default '{}'::jsonb,
  business jsonb not null default '{}'::jsonb,
  offers jsonb not null default '{}'::jsonb,
  audience jsonb not null default '{}'::jsonb,
  funnel jsonb not null default '{}'::jsonb,
  marketing jsonb not null default '{}'::jsonb,
  performance_history jsonb not null default '{}'::jsonb,
  operations jsonb not null default '{}'::jsonb,
  compliance jsonb not null default '{}'::jsonb,
  internal_notes jsonb not null default '{}'::jsonb,
  connected_source_summary jsonb not null default '{}'::jsonb,
  completeness_score integer not null default 0,
  missing_important_fields jsonb not null default '[]'::jsonb,
  recommended_missing_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid null default auth.uid(),
  constraint strategy_profiles_status_check check (status in ('active', 'archived'))
);

drop trigger if exists set_strategy_profiles_updated_at on public.strategy_profiles;
create trigger set_strategy_profiles_updated_at
before update on public.strategy_profiles
for each row
execute function public.set_strategy_memory_updated_at();

create table if not exists public.strategy_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.strategy_profiles(id) on delete cascade,
  client_id text not null,
  owner_user_id uuid not null default auth.uid(),
  status text not null default 'draft',
  objective text not null,
  stage text not null,
  time_horizon text not null,
  priority_kpi text null,
  main_problem text null,
  severity text null,
  started_at_hint text null,
  recent_changes jsonb not null default '[]'::jsonb,
  tested_context jsonb not null default '{}'::jsonb,
  constraints jsonb not null default '{}'::jsonb,
  requested_outputs jsonb not null default '[]'::jsonb,
  manual_notes text null,
  missing_questions jsonb not null default '[]'::jsonb,
  answered_missing_context jsonb not null default '{}'::jsonb,
  retrieved_context_snapshot jsonb not null default '{}'::jsonb,
  data_confidence jsonb not null default '{}'::jsonb,
  generator_version text null,
  generated_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid null default auth.uid(),
  constraint strategy_requests_status_check
    check (status in ('draft', 'ready_for_generation', 'generated', 'approved', 'archived'))
);

drop trigger if exists set_strategy_requests_updated_at on public.strategy_requests;
create trigger set_strategy_requests_updated_at
before update on public.strategy_requests
for each row
execute function public.set_strategy_memory_updated_at();

create index if not exists strategy_requests_profile_owner_idx
  on public.strategy_requests (profile_id, owner_user_id, updated_at desc);

create index if not exists strategy_requests_client_updated_idx
  on public.strategy_requests (client_id, updated_at desc);

create table if not exists public.strategy_source_context (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.strategy_profiles(id) on delete cascade,
  request_id uuid null references public.strategy_requests(id) on delete cascade,
  source_type text not null,
  source_label text null,
  is_connected boolean not null default false,
  freshness_status text not null default 'unknown',
  last_synced_at timestamptz null,
  confidence_score numeric null,
  is_estimated boolean not null default false,
  warnings jsonb not null default '[]'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint strategy_source_context_freshness_check
    check (freshness_status in ('today', 'days_1_2', 'stale', 'missing', 'unknown'))
);

create unique index if not exists strategy_source_context_profile_type_uidx
  on public.strategy_source_context (profile_id, source_type);

drop trigger if exists set_strategy_source_context_updated_at on public.strategy_source_context;
create trigger set_strategy_source_context_updated_at
before update on public.strategy_source_context
for each row
execute function public.set_strategy_memory_updated_at();

alter table public.strategy_outputs
  add column if not exists request_id uuid null references public.strategy_requests(id) on delete restrict,
  add column if not exists profile_id uuid null references public.strategy_profiles(id) on delete restrict,
  add column if not exists provider text null,
  add column if not exists model text null,
  add column if not exists prompt_version text null,
  add column if not exists input_snapshot jsonb null,
  add column if not exists executive_summary text null,
  add column if not exists client_summary text null,
  add column if not exists confidence_score numeric null,
  add column if not exists confidence_note text null,
  add column if not exists source_confidence_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists approved_at timestamptz null,
  add column if not exists approved_by_user_id uuid null,
  add column if not exists archived_at timestamptz null;

alter table public.strategy_outputs
  drop constraint if exists strategy_outputs_status_check;

alter table public.strategy_outputs
  add constraint strategy_outputs_status_check
    check (status in ('generated', 'review_needed', 'approved', 'converted', 'archived'));

create index if not exists strategy_profiles_client_idx
  on public.strategy_profiles (client_id);

create index if not exists strategy_outputs_profile_generated_idx
  on public.strategy_outputs (profile_id, generated_at desc);

create index if not exists strategy_outputs_request_created_idx
  on public.strategy_outputs (request_id, created_at desc);

create index if not exists strategy_outputs_status_generated_idx
  on public.strategy_outputs (status, generated_at desc);

alter table public.strategy_profiles enable row level security;
alter table public.strategy_requests enable row level security;
alter table public.strategy_source_context enable row level security;
alter table public.strategy_outputs enable row level security;

drop policy if exists "strategy_profiles_select" on public.strategy_profiles;
create policy "strategy_profiles_select"
on public.strategy_profiles
for select
using (
  public.can_read_strategy_memory()
);

drop policy if exists "strategy_profiles_insert" on public.strategy_profiles;
create policy "strategy_profiles_insert"
on public.strategy_profiles
for insert
with check (
  public.can_write_strategy_memory()
);

drop policy if exists "strategy_profiles_update" on public.strategy_profiles;
create policy "strategy_profiles_update"
on public.strategy_profiles
for update
using (
  public.can_write_strategy_memory()
)
with check (
  public.can_write_strategy_memory()
);

drop policy if exists "strategy_profiles_delete" on public.strategy_profiles;
create policy "strategy_profiles_delete"
on public.strategy_profiles
for delete
using (
  public.current_command_center_role() in ('super_admin', 'admin')
);

drop policy if exists "strategy_requests_select" on public.strategy_requests;
create policy "strategy_requests_select"
on public.strategy_requests
for select
using (
  public.can_read_strategy_memory()
  and (
    owner_user_id = auth.uid()
    or public.current_command_center_role() in ('super_admin', 'admin', 'manager')
  )
);

drop policy if exists "strategy_requests_insert" on public.strategy_requests;
create policy "strategy_requests_insert"
on public.strategy_requests
for insert
with check (
  public.can_write_strategy_memory()
  and owner_user_id = auth.uid()
);

drop policy if exists "strategy_requests_update" on public.strategy_requests;
create policy "strategy_requests_update"
on public.strategy_requests
for update
using (
  public.can_write_strategy_memory()
  and (
    owner_user_id = auth.uid()
    or public.current_command_center_role() in ('super_admin', 'admin', 'manager')
  )
)
with check (
  public.can_write_strategy_memory()
  and (
    owner_user_id = auth.uid()
    or public.current_command_center_role() in ('super_admin', 'admin', 'manager')
  )
);

drop policy if exists "strategy_requests_delete" on public.strategy_requests;
create policy "strategy_requests_delete"
on public.strategy_requests
for delete
using (
  public.current_command_center_role() in ('super_admin', 'admin')
);

drop policy if exists "strategy_source_context_select" on public.strategy_source_context;
create policy "strategy_source_context_select"
on public.strategy_source_context
for select
using (
  public.can_read_strategy_memory()
);

drop policy if exists "strategy_source_context_insert" on public.strategy_source_context;
create policy "strategy_source_context_insert"
on public.strategy_source_context
for insert
with check (
  public.can_write_strategy_memory()
);

drop policy if exists "strategy_source_context_update" on public.strategy_source_context;
create policy "strategy_source_context_update"
on public.strategy_source_context
for update
using (
  public.can_write_strategy_memory()
)
with check (
  public.can_write_strategy_memory()
);

drop policy if exists "strategy_source_context_delete" on public.strategy_source_context;
create policy "strategy_source_context_delete"
on public.strategy_source_context
for delete
using (
  public.current_command_center_role() in ('super_admin', 'admin')
);

drop policy if exists "strategy_outputs_select" on public.strategy_outputs;
create policy "strategy_outputs_select"
on public.strategy_outputs
for select
using (
  public.can_read_strategy_memory()
);

drop policy if exists "strategy_outputs_insert" on public.strategy_outputs;
create policy "strategy_outputs_insert"
on public.strategy_outputs
for insert
with check (
  public.can_write_strategy_memory()
  and created_by_user_id = auth.uid()
);

drop policy if exists "strategy_outputs_update" on public.strategy_outputs;
create policy "strategy_outputs_update"
on public.strategy_outputs
for update
using (
  public.current_command_center_role() in ('super_admin', 'admin', 'manager')
)
with check (
  public.current_command_center_role() in ('super_admin', 'admin', 'manager')
);

drop policy if exists "strategy_outputs_delete" on public.strategy_outputs;
create policy "strategy_outputs_delete"
on public.strategy_outputs
for delete
using (
  public.current_command_center_role() in ('super_admin', 'admin')
);
