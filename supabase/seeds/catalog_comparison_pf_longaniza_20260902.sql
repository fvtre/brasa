begin;

insert into public.products (name, category, brand, unit, active)
select 'PF Longaniza parrillera 1 kg', 'Carnes', 'PF', 'kg', true
where not exists (
  select 1 from public.products
  where name = 'PF Longaniza parrillera 1 kg' and category = 'Carnes'
);

insert into public.product_prices (
  product_id, catalog_provider_id, price, price_per_kg,
  stock, product_url, captured_at
)
select
  p.id, cp.id, source.price, source.price, true, source.url, now()
from public.products p
cross join (
  values
    ('Lider', 4890, 'https://super.lider.cl/ip/todas-las-carnes/00780193000659'),
    ('Jumbo', 6190, 'https://www.jumbo.cl/longaniza-parrillera-pf-1-kg-987930/p')
) as source(provider_name, price, url)
join public.catalog_providers cp on cp.name = source.provider_name
where p.name = 'PF Longaniza parrillera 1 kg'
  and p.category = 'Carnes'
  and not exists (
    select 1
    from public.product_prices existing
    where existing.product_id = p.id
      and existing.catalog_provider_id = cp.id
      and existing.product_url = source.url
      and existing.captured_at::date = current_date
  );

update public.catalog_providers
set last_sync_at = now()
where name in ('Jumbo', 'Lider');

commit;
