-- Delivery state belongs to the durable in-app notification. This makes email
-- retries safe without coupling payment confirmation to an external provider.
alter table public.notifications
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_attempts integer not null default 0,
  add column if not exists email_last_error text;

alter table public.notifications
  drop constraint if exists notifications_email_attempts_nonnegative;

alter table public.notifications
  add constraint notifications_email_attempts_nonnegative
  check (email_attempts >= 0) not valid;

alter table public.notifications
  validate constraint notifications_email_attempts_nonnegative;

create or replace function public.record_notification_email_failure(
  p_notification_id uuid,
  p_error text
)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.notifications
     set email_attempts = email_attempts + 1,
         email_last_error = left(p_error, 1000)
   where id = p_notification_id;
$$;

revoke all on function public.record_notification_email_failure(uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_notification_email_failure(uuid, text)
  to service_role;

grant select, insert, update on table public.notifications to service_role;

-- The subscription route reassigns a browser endpoint to the currently logged
-- in account. It uses the server client so account changes cannot be blocked by
-- the previous owner's RLS policy.
grant select, insert, update, delete on table public.push_subscriptions to service_role;
