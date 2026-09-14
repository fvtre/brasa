-- Webpay se ejecuta exclusivamente en Route Handlers con la clave secreta.
-- service_role omite RLS, pero aun necesita privilegios SQL de tabla.
grant select, insert, update on table public.payments to service_role;
grant select, update on table public.bookings to service_role;
grant select, update on table public.booking_items to service_role;
