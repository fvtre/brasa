create or replace function public.get_my_provider_booking_payments()
returns table (
  booking_id uuid,
  payment_state text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    bi.booking_id,
    case
      when bool_or(p.status in ('pagado', 'autorizado')) then 'pagada'
      when bool_or(p.status = 'pendiente') then 'pendiente'
      else 'sin_pago'
    end as payment_state
  from public.booking_items as bi
  join public.service_providers as sp
    on sp.id = bi.provider_id
  left join public.payments as p
    on p.booking_id = bi.booking_id
  where (select auth.uid()) is not null
    and sp.owner_id = (select auth.uid())
  group by bi.booking_id;
$$;

revoke all on function public.get_my_provider_booking_payments()
  from public, anon, service_role;
grant execute on function public.get_my_provider_booking_payments()
  to authenticated;
