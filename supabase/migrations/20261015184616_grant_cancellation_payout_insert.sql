-- La finalización de cancelaciones crea la liquidación si el pago
-- confirmado todavía no había generado una. La función se ejecuta como
-- service_role (SECURITY INVOKER), por lo que necesita este permiso explícito.
grant insert on table public.provider_payouts to service_role;
