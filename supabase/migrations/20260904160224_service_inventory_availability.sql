-- Expose only the remaining quantity for one rental service and time window.
-- Booking rows remain private; the scalar result is intentionally public so the
-- marketplace can prevent customers from requesting more units than exist.
create or replace function public.get_available_service_inventory(
  p_service_id uuid,
  p_event_date date,
  p_event_time time without time zone,
  p_guests integer default 0
)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_service public.provider_services%rowtype;
  v_duration numeric;
  v_reserved_quantity numeric := 0;
begin
  select ps.*
  into v_service
  from public.provider_services ps
  where ps.id = p_service_id
    and ps.active = true;

  if not found
     or v_service.schedule_mode <> 'delivery_pickup'
     or v_service.inventory_capacity is null then
    return null;
  end if;

  v_duration := public.get_service_duration_hours(p_service_id, p_guests);

  select coalesce(sum(existing_item.quantity), 0)
  into v_reserved_quantity
  from public.booking_items existing_item
  join public.bookings existing_booking
    on existing_booking.id = existing_item.booking_id
  join public.provider_services existing_service
    on existing_service.id = existing_item.service_id
  where existing_item.service_id = p_service_id
    and existing_booking.status::text not in ('cancelada', 'completada', 'expirada')
    and existing_item.provider_status::text not in ('cancelada', 'rechazada', 'expirada')
    and (
      existing_item.provider_status::text not in ('pendiente', 'esperando_confirmacion')
      or existing_item.expires_at is null
      or existing_item.expires_at > now()
    )
    and (existing_booking.event_date + existing_booking.event_time)
          - make_interval(
              mins => coalesce(
                existing_item.buffer_before_minutes,
                existing_service.buffer_before_minutes,
                0
              )
            )
          < (p_event_date + p_event_time)
            + make_interval(secs => round(v_duration * 3600)::integer)
            + make_interval(mins => coalesce(v_service.buffer_after_minutes, 0))
    and (existing_booking.event_date + existing_booking.event_time)
          + make_interval(
              secs => round(
                coalesce(
                  existing_item.booked_duration_hours,
                  public.get_service_duration_hours(
                    existing_item.service_id,
                    existing_booking.guests
                  )
                ) * 3600
              )::integer
            )
          + make_interval(
              mins => coalesce(
                existing_item.buffer_after_minutes,
                existing_service.buffer_after_minutes,
                0
              )
            )
          > (p_event_date + p_event_time)
            - make_interval(mins => coalesce(v_service.buffer_before_minutes, 0));

  return greatest(v_service.inventory_capacity - v_reserved_quantity, 0);
end;
$$;

revoke all on function public.get_available_service_inventory(
  uuid,
  date,
  time without time zone,
  integer
) from public, anon, authenticated;

grant execute on function public.get_available_service_inventory(
  uuid,
  date,
  time without time zone,
  integer
) to anon, authenticated, service_role;

-- Preserve the RPC signature used by the app, but pass the real guest count
-- supplied in each item so dynamic durations remain part of slot validation.
create or replace function public.get_common_available_slots(
  p_event_date date,
  p_items jsonb
)
returns table(slot_time time without time zone)
language sql
stable
security definer
set search_path = ''
as $$
  with requested as (
    select
      sp.id as provider_id,
      ps.id as service_id,
      greatest(coalesce((item ->> 'guests')::integer, 0), 0) as guests
    from jsonb_array_elements(p_items) item
    join public.service_providers sp
      on sp.active = true
      and (
        sp.slug = item ->> 'providerSlug'
        or sp.id::text = item ->> 'providerSlug'
      )
    join public.provider_services ps
      on ps.provider_id = sp.id
      and ps.active = true
      and (
        ps.external_key = item ->> 'serviceKey'
        or ps.id::text = item ->> 'serviceKey'
      )
  ),
  candidate_slots as (
    select generated::time as slot_time
    from generate_series(
      p_event_date::timestamp,
      p_event_date::timestamp + interval '23 hours 30 minutes',
      interval '30 minutes'
    ) generated
  )
  select cs.slot_time
  from candidate_slots cs
  where (select count(*) from requested) = jsonb_array_length(p_items)
    and not exists (
      select 1
      from requested r
      where not public.is_provider_service_available(
        r.provider_id,
        r.service_id,
        p_event_date,
        cs.slot_time,
        r.guests
      )
    )
  order by cs.slot_time;
$$;

revoke all on function public.get_common_available_slots(date, jsonb)
  from public, anon, authenticated;
grant execute on function public.get_common_available_slots(date, jsonb)
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';
