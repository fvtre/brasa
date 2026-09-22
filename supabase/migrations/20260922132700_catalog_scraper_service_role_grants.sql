-- The server-side catalog importer uses the service role. Table-level grants
-- are still required even though that role bypasses RLS.
grant select, insert, update on table public.catalog_providers to service_role;
grant select, insert, update on table public.products to service_role;
grant select, insert on table public.product_prices to service_role;
