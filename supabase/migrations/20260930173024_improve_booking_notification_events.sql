-- Describe every provider response accurately and create durable notifications
-- for both sides. API workers deliver these rows through push and email.
create or replace function public.after_booking_item_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client uuid;
  booking_code text;
  provider_owner uuid;
  event_title text;
  event_body text;
begin
  if new.provider_status is not distinct from old.provider_status then
    return new;
  end if;

  select b.client_id, b.code into client, booking_code
    from public.bookings b where b.id = new.booking_id;
  select sp.owner_id into provider_owner
    from public.service_providers sp where sp.id = new.provider_id;

  event_title := case new.provider_status::text
    when 'confirmada' then 'Solicitud aceptada'
    when 'rechazada' then 'Solicitud rechazada'
    when 'expirada' then 'Solicitud expirada'
    when 'cancelada' then 'Solicitud cancelada'
    else 'Solicitud actualizada'
  end;
  event_body := new.provider_name || ': ' || replace(new.provider_status::text, '_', ' ');

  if client is not null then
    insert into public.notifications(user_id, type, title, body, href, dedupe_key)
    values(client, 'booking_status', event_title, event_body,
      '/mis-reservas/' || booking_code,
      'booking-status:' || new.id::text || ':' || new.provider_status::text || ':' || client::text)
    on conflict do nothing;
  end if;

  if provider_owner is not null and new.provider_status::text in ('expirada', 'cancelada') then
    insert into public.notifications(user_id, type, title, body, href, dedupe_key)
    values(provider_owner, 'booking_status', event_title,
      new.service_name || ': ' || replace(new.provider_status::text, '_', ' '),
      '/prestador/dashboard#solicitudes',
      'booking-status:' || new.id::text || ':' || new.provider_status::text || ':' || provider_owner::text)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.after_booking_item_status_change() from public, anon, authenticated;
