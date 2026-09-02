begin;

with fixtures(slug, business_name, category_slug, service_name, price, unit_name) as (
  values
    ('demo-fuego-central', 'Fuego Central · Demo', 'parrilleros', 'Parrillero para eventos', 85000, 'por evento'),
    ('demo-bar-nomade', 'Bar Nómade · Demo', 'bartenders', 'Barra y bartender', 75000, 'por evento'),
    ('demo-servicio-mesa', 'Servicio de Mesa · Demo', 'garzones', 'Garzón profesional', 45000, 'por evento'),
    ('demo-mesa-sabores', 'Mesa de Sabores · Demo', 'catering', 'Cóctel para eventos', 12500, 'por persona'),
    ('demo-dulce-momento', 'Dulce Momento · Demo', 'pasteleria', 'Torta personalizada', 55000, 'por unidad'),
    ('demo-ritmo-eventos', 'Ritmo Eventos · Demo', 'dj', 'DJ e iluminación', 160000, 'por evento'),
    ('demo-ambienta-studio', 'Ambienta Studio · Demo', 'decoracion', 'Decoración temática', 95000, 'por evento'),
    ('demo-luz-y-recuerdo', 'Luz y Recuerdo · Demo', 'fotografia', 'Cobertura fotográfica', 140000, 'por evento'),
    ('demo-monta-eventos', 'Monta Eventos · Demo', 'mobiliario', 'Pack de mesas y sillas', 65000, 'por pack'),
    ('demo-brasa-verde', 'Brasa Verde · Demo', 'parrilleros-veganos', 'Parrilla vegana completa', 14500, 'por persona')
), upserted as (
  insert into public.service_providers (
    slug, business_name, category_slug, tagline, bio, comuna, region,
    coverage, image_url, active, verified, featured
  )
  select
    slug,
    business_name,
    category_slug,
    'Perfil demostrativo para validar Brasa IA',
    'Prestador ficticio creado exclusivamente para pruebas funcionales del marketplace.',
    'Santiago Centro',
    'Región Metropolitana',
    array['Santiago Centro','Providencia','Ñuñoa','La Florida','Puente Alto'],
    '/images/cat-' || case when category_slug = 'parrilleros-veganos' then 'parrilleros' else category_slug end || '.png',
    true,
    false,
    false
  from fixtures
  on conflict (slug) do update set
    business_name = excluded.business_name,
    category_slug = excluded.category_slug,
    tagline = excluded.tagline,
    bio = excluded.bio,
    coverage = excluded.coverage,
    image_url = excluded.image_url,
    active = true
  returning id, slug, category_slug
)
insert into public.provider_categories (provider_id, category_slug, description)
select id, category_slug, 'Configuración demostrativa para pruebas de recomendación.'
from upserted
on conflict (provider_id, category_slug) do nothing;

with fixtures(slug, category_slug, service_name, price, unit_name) as (
  values
    ('demo-fuego-central', 'parrilleros', 'Parrillero para eventos', 85000, 'por evento'),
    ('demo-bar-nomade', 'bartenders', 'Barra y bartender', 75000, 'por evento'),
    ('demo-servicio-mesa', 'garzones', 'Garzón profesional', 45000, 'por evento'),
    ('demo-mesa-sabores', 'catering', 'Cóctel para eventos', 12500, 'por persona'),
    ('demo-dulce-momento', 'pasteleria', 'Torta personalizada', 55000, 'por unidad'),
    ('demo-ritmo-eventos', 'dj', 'DJ e iluminación', 160000, 'por evento'),
    ('demo-ambienta-studio', 'decoracion', 'Decoración temática', 95000, 'por evento'),
    ('demo-luz-y-recuerdo', 'fotografia', 'Cobertura fotográfica', 140000, 'por evento'),
    ('demo-monta-eventos', 'mobiliario', 'Pack de mesas y sillas', 65000, 'por pack'),
    ('demo-brasa-verde', 'parrilleros-veganos', 'Parrilla vegana completa', 14500, 'por persona')
)
insert into public.provider_services (
  provider_id, external_key, category_slug, name, description,
  price, unit, duration_hours, popular, active
)
select
  sp.id,
  'demo-' || fixtures.category_slug,
  fixtures.category_slug,
  fixtures.service_name,
  'Servicio ficticio con precio publicado para validar el planificador.',
  fixtures.price,
  fixtures.unit_name,
  2,
  true,
  true
from fixtures
join public.service_providers sp on sp.slug = fixtures.slug
on conflict (provider_id, external_key) do update set
  category_slug = excluded.category_slug,
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  unit = excluded.unit,
  duration_hours = excluded.duration_hours,
  active = true;

commit;
