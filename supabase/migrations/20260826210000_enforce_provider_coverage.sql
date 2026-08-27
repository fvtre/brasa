-- Impide reservar prestadores fuera de las comunas que declararon cubrir.
-- La comprobacion vive en PostgreSQL para no depender de datos del navegador.

create or replace function public.validate_booking_item_provider_coverage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_comuna text;
  v_provider_comuna text;
  v_provider_coverage text[];
  v_has_coverage boolean;
begin
  if new.provider_id is null then
    return new;
  end if;

  select b.comuna
  into v_booking_comuna
  from public.bookings b
  where b.id = new.booking_id;

  -- Las reservas legacy sin comuna conservan su comportamiento actual.
  if nullif(btrim(v_booking_comuna), '') is null then
    return new;
  end if;

  select sp.comuna, sp.coverage
  into v_provider_comuna, v_provider_coverage
  from public.service_providers sp
  where sp.id = new.provider_id;

  select exists (
    select 1
    from unnest(
      case
        when coalesce(cardinality(v_provider_coverage), 0) > 0
          then v_provider_coverage
        when nullif(btrim(v_provider_comuna), '') is not null
          then array[v_provider_comuna]
        else array[]::text[]
      end
    ) as covered_comuna
    where lower(btrim(covered_comuna)) = lower(btrim(v_booking_comuna))
  )
  into v_has_coverage;

  if not v_has_coverage then
    raise exception using
      errcode = 'P0001',
      message = format(
        'El prestador %s no tiene cobertura en %s.',
        new.provider_name,
        v_booking_comuna
      );
  end if;

  return new;
end;
$$;

drop trigger if exists booking_items_validate_provider_coverage
  on public.booking_items;

create trigger booking_items_validate_provider_coverage
before insert on public.booking_items
for each row
execute function public.validate_booking_item_provider_coverage();

revoke all on function public.validate_booking_item_provider_coverage()
  from public;

notify pgrst, 'reload schema';
