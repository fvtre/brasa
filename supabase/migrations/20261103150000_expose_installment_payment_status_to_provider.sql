-- El prestador debe distinguir un anticipo de un pago total.
drop function if exists public.get_my_provider_booking_payments();

create function public.get_my_provider_booking_payments()
returns table (
  booking_id uuid,
  payment_state text,
  paid_amount bigint,
  booking_total integer,
  payment_plan text,
  balance_due_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    bi.booking_id,
    case
      when coalesce(sum(p.amount) filter (where p.status in ('pagado', 'autorizado')), 0) >= b.total
        then 'pagada'
      when coalesce(sum(p.amount) filter (where p.status in ('pagado', 'autorizado')), 0) > 0
        then 'anticipo_pagado'
      when bool_or(p.status = 'pendiente') then 'pendiente'
      else 'sin_pago'
    end as payment_state,
    coalesce(sum(p.amount) filter (where p.status in ('pagado', 'autorizado')), 0)::bigint as paid_amount,
    b.total as booking_total,
    b.payment_plan,
    b.balance_due_at
  from public.booking_items bi
  join public.service_providers sp on sp.id = bi.provider_id
  join public.bookings b on b.id = bi.booking_id
  left join public.payments p on p.booking_id = bi.booking_id
  where (select auth.uid()) is not null
    and sp.owner_id = (select auth.uid())
  group by bi.booking_id, b.total, b.payment_plan, b.balance_due_at;
$$;

revoke all on function public.get_my_provider_booking_payments()
  from public, anon, service_role;
grant execute on function public.get_my_provider_booking_payments()
  to authenticated;
