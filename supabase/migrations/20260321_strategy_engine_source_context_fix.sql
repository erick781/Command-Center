drop index if exists public.strategy_source_context_profile_type_uidx;

create index if not exists strategy_source_context_profile_type_idx
  on public.strategy_source_context (profile_id, source_type);

create unique index if not exists strategy_source_context_profile_request_type_uidx
  on public.strategy_source_context (profile_id, request_id, source_type);

create index if not exists strategy_source_context_profile_request_updated_idx
  on public.strategy_source_context (profile_id, request_id, updated_at desc);
