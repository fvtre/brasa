create table if not exists public.security_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  outcome text not null default 'success' check (outcome in ('success', 'failure')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists security_audit_events_created_at_idx on public.security_audit_events (created_at desc);
create index if not exists security_audit_events_actor_created_idx on public.security_audit_events (actor_id, created_at desc);
alter table public.security_audit_events enable row level security;
create policy security_audit_events_admin_read on public.security_audit_events for select to authenticated using (public.current_role() = 'administrador'::public.user_role);
create policy security_audit_events_admin_insert on public.security_audit_events for insert to authenticated with check (public.current_role() = 'administrador'::public.user_role and actor_id = (select auth.uid()));
grant select, insert on table public.security_audit_events to authenticated, service_role;
comment on table public.security_audit_events is 'Bitácora inmutable de acciones administrativas; no almacena IP, credenciales ni tokens.';
