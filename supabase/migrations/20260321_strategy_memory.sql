-- Strategy memory persistence for app.partenaire.io
-- Intended shape:
-- - personal mutable drafts per (client_id, owner_user_id)
-- - shared append-only generated history for the team

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
  if tg_table_name = 'strategy_drafts' then
    new.updated_by_user_id = auth.uid();
  end if;
  return new;
end;
$$;

create table if not exists public.strategy_drafts (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  client_name text not null,
  owner_user_id uuid not null default auth.uid(),
  status text not null default 'draft',
  version integer not null default 1,
  draft jsonb not null,
  summary text null,
  generated_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid null default auth.uid(),
  constraint strategy_drafts_status_check
    check (status in ('draft', 'generated', 'approved'))
);

create unique index if not exists strategy_drafts_client_owner_uidx
  on public.strategy_drafts (client_id, owner_user_id);

create index if not exists strategy_drafts_owner_updated_idx
  on public.strategy_drafts (owner_user_id, updated_at desc);

create index if not exists strategy_drafts_client_updated_idx
  on public.strategy_drafts (client_id, updated_at desc);

drop trigger if exists set_strategy_drafts_updated_at on public.strategy_drafts;
create trigger set_strategy_drafts_updated_at
before update on public.strategy_drafts
for each row
execute function public.set_strategy_memory_updated_at();

create table if not exists public.strategy_outputs (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  client_name text not null,
  created_by_user_id uuid not null default auth.uid(),
  strategy_type text not null,
  objective text not null,
  output_mode text not null,
  status text not null default 'generated',
  draft_snapshot jsonb not null,
  output jsonb not null,
  summary text null,
  generated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint strategy_outputs_status_check
    check (status in ('draft', 'generated', 'approved', 'archived'))
);

create index if not exists strategy_outputs_client_generated_idx
  on public.strategy_outputs (client_id, generated_at desc);

create index if not exists strategy_outputs_creator_generated_idx
  on public.strategy_outputs (created_by_user_id, generated_at desc);

alter table public.strategy_drafts enable row level security;
alter table public.strategy_outputs enable row level security;

drop policy if exists "strategy_drafts_select" on public.strategy_drafts;
create policy "strategy_drafts_select"
on public.strategy_drafts
for select
using (
  public.can_read_strategy_memory()
  and (
    owner_user_id = auth.uid()
    or public.current_command_center_role() in ('super_admin', 'admin', 'manager')
  )
);

drop policy if exists "strategy_drafts_insert" on public.strategy_drafts;
create policy "strategy_drafts_insert"
on public.strategy_drafts
for insert
with check (
  public.can_write_strategy_memory()
  and owner_user_id = auth.uid()
);

drop policy if exists "strategy_drafts_update" on public.strategy_drafts;
create policy "strategy_drafts_update"
on public.strategy_drafts
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

drop policy if exists "strategy_drafts_delete" on public.strategy_drafts;
create policy "strategy_drafts_delete"
on public.strategy_drafts
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

drop policy if exists "strategy_outputs_delete" on public.strategy_outputs;
create policy "strategy_outputs_delete"
on public.strategy_outputs
for delete
using (
  public.current_command_center_role() in ('super_admin', 'admin')
);
