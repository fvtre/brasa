-- Las cancelaciones iniciadas por el cliente se notifican de forma consolidada
-- desde el endpoint, con montos de devolución y compensación. El trigger sigue
-- cubriendo rechazos, expiraciones y cancelaciones administrativas.
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

  if new.provider_status::text = 'cancelada'
     and exists (
       select 1
       from public.booking_cancellations bc
       where bc.booking_id = new.booking_id
         and bc.status in ('reembolso_confirmado', 'completada')
     ) then
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

revoke all on function public.after_booking_item_status_change()
  from public, anon, authenticated;
