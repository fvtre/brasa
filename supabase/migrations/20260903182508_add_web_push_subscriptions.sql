create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_user_endpoint_key unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_owner_select
  on public.push_subscriptions;
create policy push_subscriptions_owner_select
  on public.push_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_owner_insert
  on public.push_subscriptions;
create policy push_subscriptions_owner_insert
  on public.push_subscriptions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_owner_update
  on public.push_subscriptions;
create policy push_subscriptions_owner_update
  on public.push_subscriptions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_owner_delete
  on public.push_subscriptions;
create policy push_subscriptions_owner_delete
  on public.push_subscriptions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete
  on public.push_subscriptions to authenticated;

create table if not exists public.push_delivery_events (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (booking_id, user_id)
);

create index if not exists push_delivery_events_user_id_idx
  on public.push_delivery_events (user_id);

alter table public.push_delivery_events enable row level security;

revoke all on public.push_delivery_events from anon, authenticated;
