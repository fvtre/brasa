-- Scheduling modes for services that remain on site versus rentals that only
-- require the provider during delivery/setup and pickup.
alter table public.provider_services
  add column if not exists schedule_mode text not null default 'continuous',
  add column if not exists inventory_capacity numeric(10, 2);

alter table public.provider_services
  drop constraint if exists provider_services_schedule_mode_check;

alter table public.provider_services
  add constraint provider_services_schedule_mode_check
  check (schedule_mode in ('continuous', 'delivery_pickup'));

alter table public.provider_services
  drop constraint if exists provider_services_delivery_times_check;

alter table public.provider_services
  add constraint provider_services_delivery_times_check
  check (
    schedule_mode <> 'delivery_pickup'
    or coalesce(buffer_before_minutes, 0) > 0
    or coalesce(buffer_after_minutes, 0) > 0
  );

alter table public.provider_services
  drop constraint if exists provider_services_inventory_capacity_check;

alter table public.provider_services
  add constraint provider_services_inventory_capacity_check
  check (inventory_capacity is null or inventory_capacity > 0);

alter table public.booking_items
  add column if not exists booked_duration_hours numeric(8, 2),
  add column if not exists schedule_mode text,
  add column if not exists buffer_before_minutes integer,
  add column if not exists buffer_after_minutes integer;

alter table public.booking_items
  drop constraint if exists booking_items_schedule_mode_check;

alter table public.booking_items
  add constraint booking_items_schedule_mode_check
  check (schedule_mode is null or schedule_mode in ('continuous', 'delivery_pickup'));

create index if not exists booking_items_active_service_inventory_idx
  on public.booking_items(service_id, provider_status, booking_id)
  where service_id is not null;

create or replace function public.service_schedule_blocks(
  p_schedule_mode text,
  p_event_date date,
  p_event_time time without time zone,
  p_duration_hours numeric,
  p_buffer_before_minutes integer,
  p_buffer_after_minutes integer
)
returns table(block_start timestamp without time zone, block_end timestamp without time zone)
language sql
immutable
set search_path = public
as $$
  with values_for_schedule as (
    select
      p_event_date + p_event_time as event_start,
      (p_event_date + p_event_time)
        + make_interval(secs => round(greatest(coalesce(p_duration_hours, 1), 0) * 3600)::integer)
          as event_end,
      greatest(coalesce(p_buffer_before_minutes, 0), 0) as before_minutes,
      greatest(coalesce(p_buffer_after_minutes, 0), 0) as after_minutes,
      coalesce(p_schedule_mode, 'continuous') as mode
  )
  select
    event_start - make_interval(mins => before_minutes),
    case
      when mode = 'delivery_pickup' then event_start
      else event_end + make_interval(mins => after_minutes)
    end
  from values_for_schedule
  where mode <> 'delivery_pickup' or before_minutes > 0

  union all

  select
    event_end,
    event_end + make_interval(mins => after_minutes)
  from values_for_schedule
  where mode = 'delivery_pickup' and after_minutes > 0;
$$;

create or replace function public.is_provider_service_available(
  p_provider_id uuid,
  p_service_id uuid,
  p_date date,
  p_start_time time without time zone,
  p_guests integer
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_service public.provider_services%rowtype;
  v_duration_hours numeric;
  v_requested_block record;
begin
  select ps.*
  into v_service
  from public.provider_services ps
  where ps.id = p_service_id
    and ps.provider_id = p_provider_id
    and ps.active = true;

  if not found then
    return false;
  end if;

  v_duration_hours := public.get_service_duration_hours(v_service.id, p_guests);

  if v_service.schedule_mode = 'delivery_pickup'
     and coalesce(v_service.buffer_before_minutes, 0) = 0
     and coalesce(v_service.buffer_after_minutes, 0) = 0 then
    return false;
  end if;

  for v_requested_block in
    select *
    from public.service_schedule_blocks(
      v_service.schedule_mode,
      p_date,
      p_start_time,
      v_duration_hours,
      v_service.buffer_before_minutes,
      v_service.buffer_after_minutes
    )
  loop
    if not exists (
      select 1
      from public.provider_availability pa
      where pa.provider_id = p_provider_id
        and pa.available = true
        and pa.start_time is not null
        and pa.end_time is not null
        and pa.date between v_requested_block.block_start::date - 1
                        and v_requested_block.block_end::date
        and (
          pa.category_slug = v_service.category_slug
          or (
            pa.category_slug is null
            and not exists (
              select 1
              from public.provider_availability category_availability
              where category_availability.provider_id = p_provider_id
                and category_availability.category_slug = v_service.category_slug
                and category_availability.available = true
                and category_availability.start_time is not null
                and category_availability.end_time is not null
                and category_availability.date between v_requested_block.block_start::date - 1
                                                   and v_requested_block.block_end::date
            )
          )
        )
        and pa.date + pa.start_time <= v_requested_block.block_start
        and case
              when pa.end_time <= pa.start_time
                then pa.date + pa.end_time + interval '1 day'
              else pa.date + pa.end_time
            end >= v_requested_block.block_end
    ) then
      return false;
    end if;
  end loop;

  if exists (
    select 1
    from public.booking_items bi
    join public.bookings b on b.id = bi.booking_id
    join public.provider_services existing_service on existing_service.id = bi.service_id
    cross join lateral public.service_schedule_blocks(
      coalesce(bi.schedule_mode, existing_service.schedule_mode, 'continuous'),
      b.event_date,
      b.event_time,
      coalesce(
        bi.booked_duration_hours,
        public.get_service_duration_hours(bi.service_id, b.guests)
      ),
      coalesce(bi.buffer_before_minutes, existing_service.buffer_before_minutes, 0),
      coalesce(bi.buffer_after_minutes, existing_service.buffer_after_minutes, 0)
    ) existing_block
    cross join lateral public.service_schedule_blocks(
      v_service.schedule_mode,
      p_date,
      p_start_time,
      v_duration_hours,
      v_service.buffer_before_minutes,
      v_service.buffer_after_minutes
    ) requested_block
    where bi.provider_id = p_provider_id
      and b.status::text not in ('cancelada', 'completada', 'expirada')
      and bi.provider_status::text not in ('cancelada', 'rechazada', 'expirada')
      and (
        bi.provider_status::text not in ('pendiente', 'esperando_confirmacion')
        or bi.expires_at is null
        or bi.expires_at > now()
      )
      and existing_block.block_start < requested_block.block_end
      and existing_block.block_end > requested_block.block_start
  ) then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.validate_booking_item_schedule_and_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_service public.provider_services%rowtype;
  v_reserved_quantity numeric;
  v_duration numeric;
begin
  if new.provider_id is null or new.service_id is null then
    return new;
  end if;

  select b.* into strict v_booking
  from public.bookings b
  where b.id = new.booking_id;

  select ps.* into strict v_service
  from public.provider_services ps
  where ps.id = new.service_id
    and ps.provider_id = new.provider_id;

  -- Serializes bookings for one provider, closing the race between the public
  -- availability check and the booking item insert.
  perform pg_advisory_xact_lock(hashtextextended(new.provider_id::text, 0));

  if not public.is_provider_service_available(
    new.provider_id,
    new.service_id,
    v_booking.event_date,
    v_booking.event_time,
    v_booking.guests
  ) then
    raise exception 'El prestador % ya no está disponible para ese horario.', new.provider_name;
  end if;

  v_duration := public.get_service_duration_hours(new.service_id, v_booking.guests);
  new.booked_duration_hours := v_duration;
  new.schedule_mode := v_service.schedule_mode;
  new.buffer_before_minutes := v_service.buffer_before_minutes;
  new.buffer_after_minutes := v_service.buffer_after_minutes;
  new.category_slug := v_service.category_slug;

  if v_service.schedule_mode = 'delivery_pickup'
     and v_service.inventory_capacity is not null then
    select coalesce(sum(existing_item.quantity), 0)
    into v_reserved_quantity
    from public.booking_items existing_item
    join public.bookings existing_booking on existing_booking.id = existing_item.booking_id
    join public.provider_services existing_service on existing_service.id = existing_item.service_id
    where existing_item.service_id = new.service_id
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
            < (v_booking.event_date + v_booking.event_time)
              + make_interval(secs => round(v_duration * 3600)::integer)
              + make_interval(mins => coalesce(v_service.buffer_after_minutes, 0))
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
              - make_interval(mins => coalesce(v_service.buffer_before_minutes, 0));

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

drop trigger if exists booking_items_validate_schedule_inventory
  on public.booking_items;

create trigger booking_items_validate_schedule_inventory
before insert on public.booking_items
for each row
execute function public.validate_booking_item_schedule_and_inventory();

revoke all on function public.service_schedule_blocks(text, date, time without time zone, numeric, integer, integer)
  from public;
grant execute on function public.service_schedule_blocks(text, date, time without time zone, numeric, integer, integer)
  to anon, authenticated, service_role;

revoke all on function public.validate_booking_item_schedule_and_inventory()
  from public;

grant execute on function public.is_provider_service_available(uuid, uuid, date, time without time zone, integer)
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';
