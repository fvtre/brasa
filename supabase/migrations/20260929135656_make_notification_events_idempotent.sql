-- Give booking notifications stable keys so the database trigger, push route
-- and email retry all refer to the same durable notification.
create or replace function public.after_booking_item_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client uuid;
  provider_owner uuid;
begin
  if new.provider_id is null then return new; end if;
  select client_id into client from public.bookings where id = new.booking_id;
  select owner_id into provider_owner from public.service_providers where id = new.provider_id;

  if client is not null then
    insert into public.conversations(booking_id, client_id, provider_id)
    values(new.booking_id, client, new.provider_id)
    on conflict(booking_id, client_id, provider_id) do nothing;
  end if;

  if provider_owner is not null then
    insert into public.notifications(user_id, type, title, body, href, dedupe_key)
    values(
      provider_owner,
      'booking_request',
      'Nueva solicitud de evento',
      new.service_name,
      '/prestador/dashboard#solicitudes',
      'booking-request:' || new.id::text || ':' || provider_owner::text
    )
    on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.after_booking_item_insert() from public, anon, authenticated;

create or replace function public.after_booking_item_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client uuid;
  booking_code text;
begin
  if new.provider_status is distinct from old.provider_status then
    select client_id, code into client, booking_code
      from public.bookings where id = new.booking_id;
    if client is not null then
      insert into public.notifications(user_id, type, title, body, href, dedupe_key)
      values(
        client,
        'booking_status',
        case when new.provider_status = 'confirmada' then 'Solicitud aceptada' else 'Solicitud rechazada' end,
        new.provider_name || ': ' || replace(new.provider_status::text, '_', ' '),
        '/mis-reservas/' || booking_code,
        'booking-status:' || new.id::text || ':' || new.provider_status::text || ':' || client::text
      )
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.after_booking_item_status_change() from public, anon, authenticated;
