-- A push endpoint represents one browser/device and must belong to only one
-- authenticated account. Keep the most recently refreshed owner when cleaning
-- historical duplicates created by account switching on the same device.
with ranked_subscriptions as (
  select
    id,
    row_number() over (
      partition by endpoint
      order by updated_at desc nulls last, created_at desc, id desc
    ) as position
  from public.push_subscriptions
)
delete from public.push_subscriptions
where id in (
  select id
  from ranked_subscriptions
  where position > 1
);

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_user_id_endpoint_key;

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_user_endpoint_key;

create unique index if not exists push_subscriptions_endpoint_unique_idx
  on public.push_subscriptions (endpoint);

-- Private delivery ledger used by server routes to make status/message pushes
-- idempotent. It is deliberately inaccessible to browser roles.
create table if not exists public.push_event_deliveries (
  event_key text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists push_event_deliveries_user_created_idx
  on public.push_event_deliveries (user_id, created_at desc);

alter table public.push_event_deliveries enable row level security;

revoke all on table public.push_event_deliveries from anon, authenticated;
grant select, insert, delete on table public.push_event_deliveries to service_role;
