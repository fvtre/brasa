create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.can_read_booking(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.bookings b
      where b.id = p_booking_id
        and (
          b.client_id = (select auth.uid())
          or exists (
            select 1
            from public.profiles profile
            where profile.id = (select auth.uid())
              and profile.role = 'administrador'::public.user_role
          )
          or exists (
            select 1
            from public.booking_items bi
            join public.service_providers sp
              on sp.id = bi.provider_id
            where bi.booking_id = b.id
              and sp.owner_id = (select auth.uid())
          )
        )
    );
$$;

revoke all on function private.can_read_booking(uuid) from public;
grant execute on function private.can_read_booking(uuid) to authenticated;

drop policy if exists bookings_read_participants
  on public.bookings;

create policy bookings_read_participants
on public.bookings for select
to authenticated
using (private.can_read_booking(id));

drop policy if exists booking_items_read_participants
  on public.booking_items;

create policy booking_items_read_participants
on public.booking_items for select
to authenticated
using (private.can_read_booking(booking_id));
