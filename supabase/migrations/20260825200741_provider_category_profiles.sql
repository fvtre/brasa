alter table public.provider_categories
  add column if not exists description text,
  add column if not exists cover_image_url text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.provider_category_gallery (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null,
  category_slug text not null,
  image_url text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (provider_id, category_slug, image_url)
);

alter table public.provider_category_gallery
  drop constraint if exists provider_category_gallery_provider_category_fkey;

alter table public.provider_category_gallery
  add constraint provider_category_gallery_provider_category_fkey
  foreign key (provider_id, category_slug)
  references public.provider_categories(provider_id, category_slug)
  on update cascade
  on delete cascade;

create index if not exists provider_category_gallery_order_idx
  on public.provider_category_gallery(provider_id, category_slug, sort_order, created_at);

alter table public.provider_category_gallery enable row level security;

drop policy if exists provider_category_gallery_public_read
  on public.provider_category_gallery;
create policy provider_category_gallery_public_read
on public.provider_category_gallery for select
to anon, authenticated
using (true);

drop policy if exists provider_category_gallery_owner_insert
  on public.provider_category_gallery;
create policy provider_category_gallery_owner_insert
on public.provider_category_gallery for insert
to authenticated
with check (
  exists (
    select 1
    from public.service_providers sp
    where sp.id = provider_id
      and (sp.owner_id = (select auth.uid()) or public.current_role() = 'administrador')
  )
);

drop policy if exists provider_category_gallery_owner_update
  on public.provider_category_gallery;
create policy provider_category_gallery_owner_update
on public.provider_category_gallery for update
to authenticated
using (
  exists (
    select 1
    from public.service_providers sp
    where sp.id = provider_id
      and (sp.owner_id = (select auth.uid()) or public.current_role() = 'administrador')
  )
)
with check (
  exists (
    select 1
    from public.service_providers sp
    where sp.id = provider_id
      and (sp.owner_id = (select auth.uid()) or public.current_role() = 'administrador')
  )
);

drop policy if exists provider_category_gallery_owner_delete
  on public.provider_category_gallery;
create policy provider_category_gallery_owner_delete
on public.provider_category_gallery for delete
to authenticated
using (
  exists (
    select 1
    from public.service_providers sp
    where sp.id = provider_id
      and (sp.owner_id = (select auth.uid()) or public.current_role() = 'administrador')
  )
);

grant select on public.provider_category_gallery to anon, authenticated;
grant insert, update, delete on public.provider_category_gallery to authenticated;

alter table public.provider_availability
  add column if not exists category_slug text;

alter table public.provider_availability
  drop constraint if exists provider_availability_provider_category_fkey;

alter table public.provider_availability
  add constraint provider_availability_provider_category_fkey
  foreign key (provider_id, category_slug)
  references public.provider_categories(provider_id, category_slug)
  on update cascade
  on delete restrict;

-- Detener la migración si los datos actuales violarían la nueva regla.
-- No se eliminan filas ni se corrigen horarios automáticamente.
-- Consulta de diagnóstico equivalente para identificar las filas antes del push:
-- select
--   first_slot.id as first_slot_id,
--   second_slot.id as second_slot_id,
--   first_slot.provider_id,
--   coalesce(first_slot.category_slug, '__legacy__') as category_scope
-- from public.provider_availability first_slot
-- join public.provider_availability second_slot
--   on first_slot.id < second_slot.id
--  and first_slot.provider_id = second_slot.provider_id
--  and coalesce(first_slot.category_slug, '__legacy__') =
--      coalesce(second_slot.category_slug, '__legacy__')
--  and tsrange(
--        first_slot.date + first_slot.start_time,
--        case when first_slot.end_time <= first_slot.start_time
--          then first_slot.date + first_slot.end_time + interval '1 day'
--          else first_slot.date + first_slot.end_time end,
--        '[)'
--      ) && tsrange(
--        second_slot.date + second_slot.start_time,
--        case when second_slot.end_time <= second_slot.start_time
--          then second_slot.date + second_slot.end_time + interval '1 day'
--          else second_slot.date + second_slot.end_time end,
--        '[)'
--      )
-- where first_slot.available = true
--   and second_slot.available = true
--   and first_slot.start_time is not null
--   and first_slot.end_time is not null
--   and second_slot.start_time is not null
--   and second_slot.end_time is not null;
do $$
declare
  v_conflict_count bigint;
begin
  select count(*)
  into v_conflict_count
  from public.provider_availability first_slot
  join public.provider_availability second_slot
    on first_slot.id < second_slot.id
   and first_slot.provider_id = second_slot.provider_id
   and coalesce(first_slot.category_slug, '__legacy__') =
       coalesce(second_slot.category_slug, '__legacy__')
   and tsrange(
         first_slot.date + first_slot.start_time,
         case
           when first_slot.end_time <= first_slot.start_time
             then first_slot.date + first_slot.end_time + interval '1 day'
           else first_slot.date + first_slot.end_time
         end,
         '[)'
       ) && tsrange(
         second_slot.date + second_slot.start_time,
         case
           when second_slot.end_time <= second_slot.start_time
             then second_slot.date + second_slot.end_time + interval '1 day'
           else second_slot.date + second_slot.end_time
         end,
         '[)'
       )
  where first_slot.available = true
    and second_slot.available = true
    and first_slot.start_time is not null
    and first_slot.end_time is not null
    and second_slot.start_time is not null
    and second_slot.end_time is not null;

  if v_conflict_count > 0 then
    raise exception using
      errcode = '23P01',
      message = format(
        'provider_availability contiene %s solapamiento(s) activos dentro de la misma categoría (NULL se considera legacy). Corrija esos datos antes de volver a ejecutar la migración.',
        v_conflict_count
      );
  end if;
end;
$$;

alter table public.provider_availability
  drop constraint if exists provider_availability_provider_id_date_start_time_end_time_key;

drop index if exists public.provider_availability_unique_slot_idx;
create unique index provider_availability_unique_slot_idx
  on public.provider_availability(provider_id, category_slug, date, start_time, end_time)
  nulls not distinct;

alter table public.provider_availability
  drop constraint if exists provider_availability_no_overlap;

alter table public.provider_availability
  add constraint provider_availability_no_overlap
  exclude using gist (
    provider_id with =,
    (coalesce(category_slug, '__legacy__')) with =,
    tsrange(
      date + start_time,
      case
        when end_time <= start_time
          then date + end_time + interval '1 day'
        else date + end_time
      end,
      '[)'
    ) with &&
  )
  where (
    available = true
    and start_time is not null
    and end_time is not null
  );

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
  v_duration_hours numeric := 1;
  v_buffer_before integer := 0;
  v_buffer_after integer := 0;
  v_category_slug text;
  v_event_start timestamp;
  v_event_end timestamp;
  v_block_start timestamp;
  v_block_end timestamp;
begin
  select
    public.get_service_duration_hours(ps.id, p_guests),
    coalesce(ps.buffer_before_minutes, 0),
    coalesce(ps.buffer_after_minutes, 0),
    ps.category_slug
  into
    v_duration_hours,
    v_buffer_before,
    v_buffer_after,
    v_category_slug
  from public.provider_services ps
  where ps.id = p_service_id
    and ps.provider_id = p_provider_id
    and ps.active = true;

  if not found then
    return false;
  end if;

  v_event_start := p_date + p_start_time;
  v_event_end := v_event_start + make_interval(
    secs => round(v_duration_hours * 3600)::integer
  );
  v_block_start := v_event_start - make_interval(mins => v_buffer_before);
  v_block_end := v_event_end + make_interval(mins => v_buffer_after);

  if not exists (
    select 1
    from public.provider_availability pa
    where pa.provider_id = p_provider_id
      and pa.available = true
      and pa.start_time is not null
      and pa.end_time is not null
      and pa.date between p_date - 1 and p_date
      and (
        pa.category_slug = v_category_slug
        or (
          pa.category_slug is null
          and not exists (
            select 1
            from public.provider_availability category_availability
            where category_availability.provider_id = p_provider_id
              and category_availability.category_slug = v_category_slug
              and category_availability.available = true
              and category_availability.start_time is not null
              and category_availability.end_time is not null
              and (
                category_availability.date = p_date
                or (
                  category_availability.date = p_date - 1
                  and category_availability.end_time <=
                      category_availability.start_time
                )
              )
          )
        )
      )
      and (pa.date + pa.start_time) <= v_block_start
      and (
        case
          when pa.end_time <= pa.start_time
            then pa.date + pa.end_time + interval '1 day'
          else pa.date + pa.end_time
        end
      ) >= v_block_end
  ) then
    return false;
  end if;

  if exists (
    select 1
    from public.booking_items bi
    join public.bookings b on b.id = bi.booking_id
    join public.provider_services existing_service on existing_service.id = bi.service_id
    where bi.provider_id = p_provider_id
      and existing_service.category_slug = v_category_slug
      and b.status::text not in ('cancelada', 'completada', 'expirada')
      and bi.provider_status::text not in ('cancelada', 'rechazada', 'expirada')
      and (
        bi.provider_status::text not in ('pendiente', 'esperando_confirmacion')
        or bi.expires_at is null
        or bi.expires_at > now()
      )
      and b.event_date between p_date - 1 and p_date + 1
      and (
        (b.event_date + b.event_time)
        - make_interval(mins => coalesce(existing_service.buffer_before_minutes, 0))
      ) < v_block_end
      and (
        (b.event_date + b.event_time)
        + make_interval(
            secs => round(
              public.get_service_duration_hours(bi.service_id, b.guests) * 3600
            )::integer
          )
        + make_interval(mins => coalesce(existing_service.buffer_after_minutes, 0))
      ) > v_block_start
  ) then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.get_available_provider_alternatives(
  p_category text,
  p_event_date date,
  p_event_time time without time zone,
  p_guests integer default 0
)
returns table(
  provider_id uuid,
  provider_slug text,
  service_id uuid,
  business_name text,
  category_slug text,
  comuna text,
  rating numeric,
  verified boolean,
  featured boolean,
  service_name text,
  price integer,
  unit text,
  pricing_mode text,
  duration_hours numeric,
  image_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sp.id,
    sp.slug,
    ps.id,
    sp.business_name,
    ps.category_slug,
    sp.comuna,
    sp.rating,
    sp.verified,
    sp.featured,
    ps.name,
    ps.price,
    ps.unit,
    ps.pricing_mode,
    public.get_service_duration_hours(ps.id, p_guests),
    coalesce(pc.cover_image_url, sp.image_url)
  from public.service_providers sp
  join public.provider_services ps on ps.provider_id = sp.id
  join public.provider_categories pc
    on pc.provider_id = sp.id
   and pc.category_slug = ps.category_slug
  where sp.active = true
    and ps.active = true
    and ps.category_slug = p_category
    and (
      p_guests = 0
      or ps.max_guests is null
      or ps.max_guests >= p_guests
    )
    and (
      p_guests = 0
      or ps.min_guests is null
      or ps.min_guests <= p_guests
    )
    and public.is_provider_service_available(
      sp.id,
      ps.id,
      p_event_date,
      p_event_time,
      p_guests
    )
  order by sp.featured desc, sp.verified desc, sp.rating desc, ps.price asc;
$$;
