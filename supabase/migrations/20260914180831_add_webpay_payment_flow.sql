-- Los valores enum deben confirmarse antes de ser usados por la migración siguiente.
alter type public.booking_status add value if not exists 'expirada';
alter type public.booking_status add value if not exists 'esperando_pago';
alter type public.booking_status add value if not exists 'pago_expirado';
alter type public.payment_status add value if not exists 'expirado';
