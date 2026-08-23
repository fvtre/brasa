-- BRASA · parche de autenticación/permisos
-- Ejecutar DESPUÉS de 001_brasa_core.sql en proyectos ya creados.
-- Este archivo es idempotente y corrige:
-- 1) permisos Data API cuando "Automatically expose new tables" está desactivado,
-- 2) perfiles ausentes/desincronizados,
-- 3) roles cliente/prestador según user_metadata,
-- 4) acceso de cliente/prestador/admin bajo RLS.

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
begin
  requested_role := case
    when new.raw_user_meta_data->>'role' = 'prestador'
      then 'prestador'::public.user_role
    else 'cliente'::public.user_role
  end;

  insert into public.profiles(id, full_name, email, phone, role)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.raw_user_meta_data->>'phone',
    requested_role
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    role = case
      when public.profiles.role = 'administrador'::public.user_role
        then public.profiles.role
      else excluded.role
    end;

  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Repara o crea el perfil del usuario autenticado usando auth.users como fuente.
-- Nunca permite autoasignarse administrador.
create or replace function public.ensure_my_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  auth_user auth.users%rowtype;
  desired_role public.user_role;
  result_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'No authenticated user';
  end if;

  select * into auth_user
  from auth.users
  where id = auth.uid();

  if auth_user.id is null then
    raise exception 'Authenticated user not found';
  end if;

  desired_role := case
    when auth_user.raw_user_meta_data->>'role' = 'prestador'
      then 'prestador'::public.user_role
    else 'cliente'::public.user_role
  end;

  insert into public.profiles(id, full_name, email, phone, role)
  values(
    auth_user.id,
    coalesce(auth_user.raw_user_meta_data->>'full_name', ''),
    auth_user.email,
    auth_user.raw_user_meta_data->>'phone',
    desired_role
  )
  on conflict (id) do update set
    full_name = case
      when coalesce(excluded.full_name, '') <> '' then excluded.full_name
      else public.profiles.full_name
    end,
    email = excluded.email,
    phone = coalesce(excluded.phone, public.profiles.phone),
    role = case
      when public.profiles.role = 'administrador'::public.user_role
        then public.profiles.role
      else desired_role
    end,
    updated_at = now();

  select * into result_profile
  from public.profiles
  where id = auth_user.id;

  return result_profile;
end
$$;

-- Corrige cuentas ya creadas como prestador que hayan quedado con rol cliente.
update public.profiles p
set
  full_name = case
    when coalesce(u.raw_user_meta_data->>'full_name', '') <> ''
      then u.raw_user_meta_data->>'full_name'
    else p.full_name
  end,
  email = u.email,
  phone = coalesce(u.raw_user_meta_data->>'phone', p.phone),
  role = case
    when p.role = 'administrador'::public.user_role then p.role
    when u.raw_user_meta_data->>'role' = 'prestador' then 'prestador'::public.user_role
    else p.role
  end,
  updated_at = now()
from auth.users u
where p.id = u.id;

-- Permisos Data API. RLS sigue siendo la capa que decide qué filas puede usar cada rol.
grant usage on schema public to anon, authenticated;

grant select on public.service_categories to anon, authenticated;
grant select on public.service_providers to anon, authenticated;
grant select on public.provider_services to anon, authenticated;
grant select on public.provider_availability to anon, authenticated;
grant select on public.reviews to anon, authenticated;
grant select on public.catalog_providers to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.product_prices to anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.service_providers to authenticated;
grant select, insert, update, delete on public.provider_services to authenticated;
grant select, insert, update, delete on public.provider_availability to authenticated;
grant select, insert, update on public.bookings to authenticated;
grant select, insert, update on public.booking_items to authenticated;
grant select, insert, update, delete on public.reviews to authenticated;
grant select, insert, update, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert, update, delete on public.ai_plans to authenticated;
grant select on public.payments to authenticated;

grant execute on function public.current_role() to anon, authenticated;
grant execute on function public.ensure_my_profile() to authenticated;
