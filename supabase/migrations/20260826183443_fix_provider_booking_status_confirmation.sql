-- Prevent two overlapping requests from being confirmed for the same provider.
-- Pending requests can coexist for legacy/testing purposes, but confirmation is
-- serialized and only the first compatible request can win.
create or replace function public.validate_booking_item_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_service public.provider_services%rowtype;
  v_duration numeric;
  v_reserved_quantity numeric;
begin
  if new.provider_status::text <> 'confirmada'
     or old.provider_status::text = 'confirmada' then
    return new;
  end if;

  if new.provider_id is null then
    return new;
  end if;

  select b.* into strict v_booking
  from public.bookings b
  where b.id = new.booking_id;

  perform pg_advisory_xact_lock(hashtextextended(new.provider_id::text, 0));

  if new.service_id is not null then
    select ps.* into strict v_service
    from public.provider_services ps
    where ps.id = new.service_id
      and ps.provider_id = new.provider_id;

    v_duration := coalesce(
      new.booked_duration_hours,
      public.get_service_duration_hours(new.service_id, v_booking.guests)
    );
  else
    v_duration := coalesce(new.booked_duration_hours, 1);
  end if;

  if exists (
    select 1
    from public.booking_items existing_item
    join public.bookings existing_booking
      on existing_booking.id = existing_item.booking_id
    left join public.provider_services existing_service
      on existing_service.id = existing_item.service_id
    cross join lateral public.service_schedule_blocks(
      coalesce(existing_item.schedule_mode, existing_service.schedule_mode, 'continuous'),
      existing_booking.event_date,
      existing_booking.event_time,
      coalesce(
        existing_item.booked_duration_hours,
        case
          when existing_item.service_id is not null
            then public.get_service_duration_hours(existing_item.service_id, existing_booking.guests)
          else 1
        end
      ),
      coalesce(existing_item.buffer_before_minutes, existing_service.buffer_before_minutes, 0),
      coalesce(existing_item.buffer_after_minutes, existing_service.buffer_after_minutes, 0)
    ) existing_block
    cross join lateral public.service_schedule_blocks(
      coalesce(new.schedule_mode, v_service.schedule_mode, 'continuous'),
      v_booking.event_date,
      v_booking.event_time,
      v_duration,
      coalesce(new.buffer_before_minutes, v_service.buffer_before_minutes, 0),
      coalesce(new.buffer_after_minutes, v_service.buffer_after_minutes, 0)
    ) requested_block
    where existing_item.id <> new.id
      and existing_item.provider_id = new.provider_id
      and existing_item.provider_status::text in (
        'confirmada',
        'en_preparacion',
        'en_curso'
      )
      and existing_booking.status::text not in ('cancelada', 'expirada')
      and existing_block.block_start < requested_block.block_end
      and existing_block.block_end > requested_block.block_start
  ) then
    raise exception
      'Ya confirmaste otra reserva que ocupa ese horario. Rechaza esta solicitud o coordina otro horario.';
  end if;

  if new.service_id is not null
     and v_service.schedule_mode = 'delivery_pickup'
     and v_service.inventory_capacity is not null then
    select coalesce(sum(existing_item.quantity), 0)
    into v_reserved_quantity
    from public.booking_items existing_item
    join public.bookings existing_booking
      on existing_booking.id = existing_item.booking_id
    left join public.provider_services existing_service
      on existing_service.id = existing_item.service_id
    where existing_item.id <> new.id
      and existing_item.service_id = new.service_id
      and existing_item.provider_status::text in (
        'confirmada',
        'en_preparacion',
        'en_curso'
      )
      and existing_booking.status::text not in ('cancelada', 'expirada')
      and (existing_booking.event_date + existing_booking.event_time)
            - make_interval(
                mins => coalesce(
                  existing_item.buffer_before_minutes,
                  existing_service.buffer_before_minutes,
                  0
                )
              )
            < (v_booking.event_date + v_booking.event_time)
              + make_interval(secs => round(v_duration * 3600)::integer)
              + make_interval(mins => coalesce(new.buffer_after_minutes, v_service.buffer_after_minutes, 0))
      and (existing_booking.event_date + existing_booking.event_time)
            + make_interval(
                secs => round(
                  coalesce(
                    existing_item.booked_duration_hours,
                    public.get_service_duration_hours(existing_item.service_id, existing_booking.guests)
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
            > (v_booking.event_date + v_booking.event_time)
              - make_interval(mins => coalesce(new.buffer_before_minutes, v_service.buffer_before_minutes, 0));

    if v_reserved_quantity + new.quantity > v_service.inventory_capacity then
      raise exception
        'No hay suficiente stock de %. Disponible para ese horario: %.',
        v_service.name,
        greatest(v_service.inventory_capacity - v_reserved_quantity, 0);
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_booking_item_confirmation()
  from public;

drop trigger if exists booking_items_validate_confirmation
  on public.booking_items;

create trigger booking_items_validate_confirmation
before update of provider_status on public.booking_items
for each row
execute function public.validate_booking_item_confirmation();

create or replace function public.refresh_booking_status_from_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bid uuid;
  total_count integer;
  waiting_count integer;
  confirmed_count integer;
  completed_count integer;
  cancelled_count integer;
begin
  bid := case when tg_op = 'DELETE' then old.booking_id else new.booking_id end;

  select
    count(*),
    count(*) filter (
      where provider_status::text in ('pendiente', 'esperando_confirmacion')
    ),
    count(*) filter (
      where provider_status::text in ('confirmada', 'en_preparacion', 'en_curso')
    ),
    count(*) filter (where provider_status::text = 'completada'),
    count(*) filter (
      where provider_status::text in ('cancelada', 'rechazada', 'expirada')
    )
  into
    total_count,
    waiting_count,
    confirmed_count,
    completed_count,
    cancelled_count
  from public.booking_items
  where booking_id = bid;

  if total_count = 0 then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  update public.bookings
  set status = case
    when cancelled_count = total_count
      then 'cancelada'::public.booking_status
    when completed_count = total_count
      then 'completada'::public.booking_status
    when waiting_count > 0
      then 'esperando_confirmacion'::public.booking_status
    when confirmed_count + completed_count > 0
      then 'confirmada'::public.booking_status
    else status
  end,
  updated_at = now()
  where id = bid;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.provider_update_booking_item_status(
  p_item_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking_id uuid;
  v_current_status public.booking_status;
  v_expires_at timestamptz;
  v_item_status public.booking_status;
  v_booking_status public.booking_status;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if p_action not in ('accept', 'reject') then
    raise exception 'Acción no válida.';
  end if;

  select bi.booking_id, bi.provider_status, bi.expires_at
  into v_booking_id, v_current_status, v_expires_at
  from public.booking_items bi
  join public.service_providers sp on sp.id = bi.provider_id
  where bi.id = p_item_id
    and sp.owner_id = v_user_id
  for update of bi;

  if v_booking_id is null then
    raise exception 'No tienes permiso para modificar esta solicitud.';
  end if;

  if v_current_status::text not in ('pendiente', 'esperando_confirmacion') then
    raise exception 'Esta solicitud ya fue respondida.';
  end if;

  if v_expires_at is not null and v_expires_at <= now() then
    raise exception 'La solicitud expiró. El horario ya fue liberado.';
  end if;

  v_item_status := case
    when p_action = 'accept' then 'confirmada'::public.booking_status
    else 'rechazada'::public.booking_status
  end;

  update public.booking_items
  set provider_status = v_item_status,
      responded_at = now()
  where id = p_item_id;

  -- booking_items_refresh_booking recalculates the parent booking in the same
  -- transaction using enum-safe values.
  select b.status into v_booking_status
  from public.bookings b
  where b.id = v_booking_id;

  return jsonb_build_object(
    'ok', true,
    'itemId', p_item_id,
    'bookingId', v_booking_id,
    'providerStatus', v_item_status::text,
    'bookingStatus', v_booking_status::text,
    'respondedAt', now()
  );
end;
$$;

grant execute on function public.provider_update_booking_item_status(uuid, text)
  to authenticated, service_role;

notify pgrst, 'reload schema';
