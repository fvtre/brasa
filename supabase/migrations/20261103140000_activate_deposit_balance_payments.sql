-- Activa el plan 30/70 para reservas nuevas y para reservas existentes que
-- todavía no tienen ninguna transacción Webpay vigente o confirmada.
alter table public.bookings
  alter column payment_plan set default 'deposit_balance';

update public.bookings b
set payment_plan = 'deposit_balance', updated_at = now()
where b.payment_plan = 'legacy_full'
  and b.status in ('pendiente', 'esperando_confirmacion', 'confirmada', 'esperando_pago')
  and not exists (
    select 1
    from public.payments p
    where p.booking_id = b.id
      and p.status in ('pendiente', 'pagado', 'autorizado')
  );
