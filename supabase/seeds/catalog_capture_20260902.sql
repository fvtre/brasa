begin;

insert into public.catalog_providers (name, type, website, delivery_cost, active, last_sync_at)
select 'Jumbo', 'scraping', 'https://www.jumbo.cl', 0, true, now()
where not exists (select 1 from public.catalog_providers where name = 'Jumbo');

insert into public.catalog_providers (name, type, website, delivery_cost, active, last_sync_at)
select 'Lider', 'scraping', 'https://super.lider.cl', 0, true, now()
where not exists (select 1 from public.catalog_providers where name = 'Lider');

insert into public.products (name, category, unit, active)
select 'Punta picana', 'Carnes', 'kg', true
where not exists (select 1 from public.products where name = 'Punta picana' and category = 'Carnes');

insert into public.products (name, category, unit, active)
select 'Longaniza parrillera', 'Carnes', 'kg', true
where not exists (select 1 from public.products where name = 'Longaniza parrillera' and category = 'Carnes');

insert into public.product_prices (product_id, catalog_provider_id, price, price_per_kg, stock, product_url, captured_at)
select p.id, cp.id, 19990, 19990, true,
       'https://www.jumbo.cl/punta-de-picana-cat-v-frigosorno-granel/p', now()
from public.products p
join public.catalog_providers cp on cp.name = 'Jumbo'
where p.name = 'Punta picana' and p.category = 'Carnes'
  and not exists (
    select 1 from public.product_prices pp
    where pp.product_id = p.id and pp.catalog_provider_id = cp.id
      and pp.product_url = 'https://www.jumbo.cl/punta-de-picana-cat-v-frigosorno-granel/p'
      and pp.captured_at::date = current_date
  );

insert into public.product_prices (product_id, catalog_provider_id, price, price_per_kg, stock, product_url, captured_at)
select p.id, cp.id, 4890, 4890, true,
       'https://super.lider.cl/ip/todas-las-carnes/00780193000659', now()
from public.products p
join public.catalog_providers cp on cp.name = 'Lider'
where p.name = 'Longaniza parrillera' and p.category = 'Carnes'
  and not exists (
    select 1 from public.product_prices pp
    where pp.product_id = p.id and pp.catalog_provider_id = cp.id
      and pp.product_url = 'https://super.lider.cl/ip/todas-las-carnes/00780193000659'
      and pp.captured_at::date = current_date
  );

update public.catalog_providers
set last_sync_at = now()
where name in ('Jumbo', 'Lider');

commit;
