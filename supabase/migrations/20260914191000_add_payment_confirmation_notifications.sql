alter table public.notifications
  add column if not exists dedupe_key text;

create unique index if not exists notifications_dedupe_key_unique_idx
  on public.notifications (dedupe_key)
  where dedupe_key is not null;

-- Acceso exclusivo de los Route Handlers que usan la clave secreta.
grant select, insert on table public.notifications to service_role;
grant select on table public.service_providers to service_role;
grant select, delete on table public.push_subscriptions to service_role;
grant insert on table public.push_delivery_events to service_role;
