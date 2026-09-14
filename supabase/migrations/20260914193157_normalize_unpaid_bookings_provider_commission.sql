-- Normaliza solamente reservas creadas con el antiguo recargo de 8% al cliente.
-- Se excluyen reservas canceladas y cualquier reserva con pago vigente o exitoso.
update public.bookings as b
set
  platform_fee = round(b.subtotal * 0.10)::integer,
  total = b.subtotal,
  updated_at = now()
where b.status in (
  'pendiente'::public.booking_status,
  'esperando_confirmacion'::public.booking_status,
  'confirmada'::public.booking_status,
  'esperando_pago'::public.booking_status
)
and b.total = b.subtotal + b.platform_fee
and b.platform_fee = round(b.subtotal * 0.08)::integer
and not exists (
  select 1
  from public.payments as p
  where p.booking_id = b.id
    and p.status in (
      'pendiente'::public.payment_status,
      'autorizado'::public.payment_status,
      'pagado'::public.payment_status
    )
);
