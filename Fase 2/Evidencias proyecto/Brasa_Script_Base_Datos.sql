-- ============================================================================
-- BRASA - SCRIPT CONSOLIDADO DE BASE DE DATOS
-- Proyecto APT · Ingeniería Informática · Duoc UC · Fase 2
-- Motor: PostgreSQL 15+ / Supabase
-- Generado: 14 de octubre de 2026
-- ============================================================================
--
-- Propósito
--   Recrear el esquema de datos, funciones, triggers, políticas RLS, permisos
--   y automatizaciones de BRASA a partir del historial versionado del proyecto.
--
-- Ejecución recomendada
--   1. Crear un proyecto Supabase vacío.
--   2. Abrir SQL Editor con un rol propietario del proyecto.
--   3. Ejecutar este archivo completo, respetando el orden incluido.
--   4. Configurar por separado las variables y secretos de la aplicación.
--
-- Consideraciones
--   - No contiene contraseñas, API keys, tokens ni datos de producción.
--   - No incluye datos demo de supabase/seeds.
--   - No incluye la promoción de una cuenta específica a administrador.
--   - Las extensiones y tareas programadas dependen de las capacidades del
--     proyecto Supabase donde se ejecute.
--
-- Migraciones incluidas: 29
-- ============================================================================

-- ============================================================================
-- MIGRACIÓN: 001_brasa_core.sql
-- ============================================================================

-- BRASA Marketplace · esquema base Supabase
-- Ejecutar en Supabase SQL Editor o con supabase db push.

create extension if not exists pgcrypto;

create type public.user_role as enum ('cliente','prestador','administrador');
create type public.booking_status as enum ('pendiente','esperando_confirmacion','confirmada','en_preparacion','en_curso','completada','cancelada');
create type public.payment_status as enum ('pendiente','autorizado','pagado','fallido','reembolsado');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  role public.user_role not null default 'cliente',
  avatar_url text,
  comuna text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.service_providers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  slug text unique,
  business_name text not null,
  category_slug text not null,
  tagline text,
  bio text,
  comuna text,
  region text default 'Región Metropolitana',
  coverage text[] not null default '{}',
  experience_years int not null default 0,
  events_done int not null default 0,
  verified boolean not null default false,
  featured boolean not null default false,
  active boolean not null default true,
  image_url text,
  gallery text[] not null default '{}',
  rating numeric(3,2) not null default 0,
  reviews_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index service_providers_category_idx on public.service_providers(category_slug);
create index service_providers_owner_idx on public.service_providers(owner_id);

create table public.provider_services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.service_providers(id) on delete cascade,
  external_key text,
  name text not null,
  description text,
  price integer not null check (price >= 0),
  unit text not null default 'por evento',
  duration_hours numeric(5,2),
  max_guests int,
  includes text[] not null default '{}',
  excludes text[] not null default '{}',
  popular boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_id, external_key)
);

create table public.provider_availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.service_providers(id) on delete cascade,
  date date not null,
  start_time time,
  end_time time,
  available boolean not null default true,
  notes text,
  unique(provider_id,date,start_time,end_time)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('BR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  client_id uuid not null references public.profiles(id) on delete restrict,
  event_name text not null default 'Mi evento',
  event_date date not null,
  event_time time not null,
  comuna text,
  address text not null,
  guests int not null check (guests > 0),
  budget integer not null default 0,
  subtotal integer not null default 0,
  platform_fee integer not null default 0,
  total integer not null default 0,
  status public.booking_status not null default 'pendiente',
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bookings_client_idx on public.bookings(client_id, created_at desc);
create index bookings_status_idx on public.bookings(status);

create table public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider_id uuid references public.service_providers(id) on delete set null,
  service_id uuid references public.provider_services(id) on delete set null,
  provider_slug text,
  provider_name text not null,
  category_slug text not null,
  service_external_key text,
  service_name text not null,
  unit text not null,
  unit_price integer not null default 0,
  quantity numeric(10,2) not null default 1,
  line_total integer not null default 0,
  provider_status public.booking_status not null default 'esperando_confirmacion',
  provider_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index booking_items_booking_idx on public.booking_items(booking_id);
create index booking_items_provider_idx on public.booking_items(provider_id);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider_id uuid not null references public.service_providers(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  quality int check (quality between 1 and 5),
  punctuality int check (punctuality between 1 and 5),
  attention int check (attention between 1 and 5),
  value_rating int check (value_rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique(booking_id,provider_id,client_id)
);

create table public.favorites (
  client_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.service_providers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(client_id,provider_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.service_providers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(booking_id,client_id,provider_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.catalog_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'manual',
  website text,
  delivery_cost integer not null default 0,
  active boolean not null default true,
  last_sync_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  brand text,
  unit text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  catalog_provider_id uuid not null references public.catalog_providers(id) on delete cascade,
  price integer not null check (price >= 0),
  price_per_kg integer,
  stock boolean not null default true,
  product_url text,
  captured_at timestamptz not null default now()
);

create index product_prices_latest_idx on public.product_prices(product_id,captured_at desc);

create table public.ai_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  prompt text,
  input jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider text not null default 'webpay',
  external_id text,
  amount integer not null,
  status public.payment_status not null default 'pendiente',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger providers_touch before update on public.service_providers for each row execute function public.touch_updated_at();
create trigger services_touch before update on public.provider_services for each row execute function public.touch_updated_at();
create trigger bookings_touch before update on public.bookings for each row execute function public.touch_updated_at();
create trigger booking_items_touch before update on public.booking_items for each row execute function public.touch_updated_at();
create trigger payments_touch before update on public.payments for each row execute function public.touch_updated_at();

-- Crear perfil al registrarse. El rol inicial se lee desde user_metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare requested_role public.user_role;
begin
  requested_role := case
    when new.raw_user_meta_data->>'role' = 'prestador' then 'prestador'::public.user_role
    else 'cliente'::public.user_role
  end;

  insert into public.profiles(id,full_name,email,phone,role)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.email,
    new.raw_user_meta_data->>'phone',
    requested_role
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Helper de permisos
create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() $$;

-- RLS
alter table public.profiles enable row level security;
alter table public.service_categories enable row level security;
alter table public.service_providers enable row level security;
alter table public.provider_services enable row level security;
alter table public.provider_availability enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.catalog_providers enable row level security;
alter table public.products enable row level security;
alter table public.product_prices enable row level security;
alter table public.ai_plans enable row level security;
alter table public.payments enable row level security;

-- perfiles
create policy profiles_select_self_or_admin on public.profiles for select using (id=auth.uid() or public.current_role()='administrador');
create policy profiles_update_self_or_admin on public.profiles for update using (id=auth.uid() or public.current_role()='administrador') with check (id=auth.uid() or public.current_role()='administrador');

-- contenido público marketplace
create policy categories_public_read on public.service_categories for select using (active or public.current_role()='administrador');
create policy providers_public_read on public.service_providers for select using (active or owner_id=auth.uid() or public.current_role()='administrador');
create policy services_public_read on public.provider_services for select using (active or public.current_role()='administrador' or exists(select 1 from public.service_providers p where p.id=provider_id and p.owner_id=auth.uid()));
create policy availability_public_read on public.provider_availability for select using (true);
create policy reviews_public_read on public.reviews for select using (true);

-- prestadores gestionan lo propio
create policy providers_owner_insert on public.service_providers for insert with check (owner_id=auth.uid() and public.current_role() in ('prestador','administrador'));
create policy providers_owner_update on public.service_providers for update using (owner_id=auth.uid() or public.current_role()='administrador') with check (owner_id=auth.uid() or public.current_role()='administrador');
create policy services_owner_write on public.provider_services for all using (exists(select 1 from public.service_providers p where p.id=provider_id and (p.owner_id=auth.uid() or public.current_role()='administrador'))) with check (exists(select 1 from public.service_providers p where p.id=provider_id and (p.owner_id=auth.uid() or public.current_role()='administrador')));
create policy availability_owner_write on public.provider_availability for all using (exists(select 1 from public.service_providers p where p.id=provider_id and (p.owner_id=auth.uid() or public.current_role()='administrador'))) with check (exists(select 1 from public.service_providers p where p.id=provider_id and (p.owner_id=auth.uid() or public.current_role()='administrador')));

-- bookings: cliente propio, prestador si participa, admin todo
create policy bookings_read_participants on public.bookings for select using (
  client_id=auth.uid() or public.current_role()='administrador' or exists(
    select 1 from public.booking_items bi join public.service_providers sp on sp.id=bi.provider_id
    where bi.booking_id=bookings.id and sp.owner_id=auth.uid()
  )
);
create policy bookings_client_insert on public.bookings for insert with check (client_id=auth.uid());
create policy bookings_client_update on public.bookings for update using (client_id=auth.uid() or public.current_role()='administrador') with check (client_id=auth.uid() or public.current_role()='administrador');

create policy booking_items_read_participants on public.booking_items for select using (
  public.current_role()='administrador' or exists(select 1 from public.bookings b where b.id=booking_id and b.client_id=auth.uid()) or exists(select 1 from public.service_providers sp where sp.id=provider_id and sp.owner_id=auth.uid())
);
create policy booking_items_client_insert on public.booking_items for insert with check (exists(select 1 from public.bookings b where b.id=booking_id and b.client_id=auth.uid()));
create policy booking_items_provider_update on public.booking_items for update using (public.current_role()='administrador' or exists(select 1 from public.service_providers sp where sp.id=provider_id and sp.owner_id=auth.uid())) with check (public.current_role()='administrador' or exists(select 1 from public.service_providers sp where sp.id=provider_id and sp.owner_id=auth.uid()));

-- reseñas y favoritos
create policy reviews_client_insert on public.reviews for insert with check (client_id=auth.uid() and exists(select 1 from public.bookings b where b.id=booking_id and b.client_id=auth.uid() and b.status='completada'));
create policy favorites_owner_all on public.favorites for all using (client_id=auth.uid()) with check (client_id=auth.uid());

-- chat
create policy conversations_participants_read on public.conversations for select using (client_id=auth.uid() or public.current_role()='administrador' or exists(select 1 from public.service_providers sp where sp.id=provider_id and sp.owner_id=auth.uid()));
create policy conversations_client_insert on public.conversations for insert with check (client_id=auth.uid());
create policy messages_participants_read on public.messages for select using (exists(select 1 from public.conversations c where c.id=conversation_id and (c.client_id=auth.uid() or exists(select 1 from public.service_providers sp where sp.id=c.provider_id and sp.owner_id=auth.uid()))) or public.current_role()='administrador');
create policy messages_participants_insert on public.messages for insert with check (sender_id=auth.uid() and exists(select 1 from public.conversations c where c.id=conversation_id and (c.client_id=auth.uid() or exists(select 1 from public.service_providers sp where sp.id=c.provider_id and sp.owner_id=auth.uid()))));

create policy notifications_owner_read on public.notifications for select using (user_id=auth.uid() or public.current_role()='administrador');
create policy notifications_owner_update on public.notifications for update using (user_id=auth.uid() or public.current_role()='administrador');

-- catálogo público, administración escribe
create policy catalog_public_read on public.catalog_providers for select using (active or public.current_role()='administrador');
create policy products_public_read on public.products for select using (active or public.current_role()='administrador');
create policy prices_public_read on public.product_prices for select using (true);
create policy catalog_admin_all on public.catalog_providers for all using (public.current_role()='administrador') with check (public.current_role()='administrador');
create policy products_admin_all on public.products for all using (public.current_role()='administrador') with check (public.current_role()='administrador');
create policy prices_admin_all on public.product_prices for all using (public.current_role()='administrador') with check (public.current_role()='administrador');

create policy ai_plans_owner_all on public.ai_plans for all using (user_id=auth.uid() or public.current_role()='administrador') with check (user_id=auth.uid() or public.current_role()='administrador');
create policy payments_participants_read on public.payments for select using (public.current_role()='administrador' or exists(select 1 from public.bookings b where b.id=booking_id and b.client_id=auth.uid()));

-- Categorías iniciales
insert into public.service_categories(slug,name,description,icon,sort_order) values
('parrilleros','Parrilleros','Asados y experiencias a la parrilla','Flame',1),
('bartenders','Bartenders / Coctelería','Barras y coctelería para eventos','Martini',2),
('garzones','Garzones','Atención profesional para invitados','Users',3),
('catering','Catering / Picoteo','Banquetería, picoteos y menús','Utensils',4),
('pasteleria','Pastelería','Tortas, postres y mesas dulces','CakeSlice',5),
('dj','DJ','Música, sonido e iluminación','Music',6),
('decoracion','Decoración','Ambientación y decoración temática','PartyPopper',7),
('fotografia','Fotografía','Fotografía y video profesional','Camera',8),
('mobiliario','Mobiliario','Mesas, sillas y equipamiento','Armchair',9)
on conflict(slug) do update set name=excluded.name, description=excluded.description, icon=excluded.icon, sort_order=excluded.sort_order;

-- Crear primer administrador: después de registrar una cuenta, ejecutar:
-- update public.profiles set role='administrador' where email='TU_EMAIL';

-- Estado agregado de la reserva según respuestas de prestadores.
create or replace function public.refresh_booking_status_from_items()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  bid uuid;
  total_count int;
  waiting_count int;
  confirmed_count int;
  completed_count int;
  cancelled_count int;
begin
  if TG_OP = 'DELETE' then bid := old.booking_id; else bid := new.booking_id; end if;

  select count(*),
         count(*) filter(where provider_status in ('pendiente','esperando_confirmacion')),
         count(*) filter(where provider_status in ('confirmada','en_preparacion','en_curso')),
         count(*) filter(where provider_status='completada'),
         count(*) filter(where provider_status='cancelada')
  into total_count, waiting_count, confirmed_count, completed_count, cancelled_count
  from public.booking_items where booking_id=bid;

  if total_count = 0 then if TG_OP='DELETE' then return old; else return new; end if; end if;

  update public.bookings set status = case
    when cancelled_count = total_count then 'cancelada'::public.booking_status
    when completed_count = total_count then 'completada'::public.booking_status
    when waiting_count > 0 then 'esperando_confirmacion'::public.booking_status
    when confirmed_count + completed_count = total_count then 'confirmada'::public.booking_status
    else status
  end where id=bid;

  if TG_OP='DELETE' then return old; else return new; end if;
end $$;

drop trigger if exists booking_items_refresh_booking on public.booking_items;
create trigger booking_items_refresh_booking
after insert or update of provider_status or delete on public.booking_items
for each row execute function public.refresh_booking_status_from_items();

-- Conversación + notificaciones automáticas al crear solicitudes.
create or replace function public.after_booking_item_insert()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  client uuid;
  provider_owner uuid;
begin
  if new.provider_id is null then return new; end if;
  select client_id into client from public.bookings where id=new.booking_id;
  select owner_id into provider_owner from public.service_providers where id=new.provider_id;

  if client is not null then
    insert into public.conversations(booking_id,client_id,provider_id)
    values(new.booking_id,client,new.provider_id)
    on conflict(booking_id,client_id,provider_id) do nothing;
  end if;

  if provider_owner is not null then
    insert into public.notifications(user_id,type,title,body,href)
    values(provider_owner,'booking_request','Nueva solicitud de evento',new.service_name,'/prestador/dashboard');
  end if;
  return new;
end $$;

drop trigger if exists booking_item_created_actions on public.booking_items;
create trigger booking_item_created_actions after insert on public.booking_items
for each row execute function public.after_booking_item_insert();

create or replace function public.after_booking_item_status_change()
returns trigger language plpgsql security definer set search_path=public as $$
declare client uuid;
begin
  if new.provider_status is distinct from old.provider_status then
    select client_id into client from public.bookings where id=new.booking_id;
    if client is not null then
      insert into public.notifications(user_id,type,title,body,href)
      values(client,'booking_status','Tu solicitud fue actualizada',new.provider_name || ': ' || replace(new.provider_status::text,'_',' '),'/cliente/dashboard');
    end if;
  end if;
  return new;
end $$;

drop trigger if exists booking_item_status_notification on public.booking_items;
create trigger booking_item_status_notification after update of provider_status on public.booking_items
for each row execute function public.after_booking_item_status_change();

-- Rating agregado del prestador.
create or replace function public.refresh_provider_rating()
returns trigger language plpgsql security definer set search_path=public as $$
declare pid uuid := coalesce(new.provider_id,old.provider_id);
begin
  update public.service_providers p set
    rating=coalesce((select round(avg(r.rating)::numeric,2) from public.reviews r where r.provider_id=pid),0),
    reviews_count=(select count(*) from public.reviews r where r.provider_id=pid)
  where p.id=pid;
  if TG_OP='DELETE' then return old; else return new; end if;
end $$;

drop trigger if exists reviews_refresh_rating on public.reviews;
create trigger reviews_refresh_rating after insert or update or delete on public.reviews
for each row execute function public.refresh_provider_rating();

-- Realtime para chat, notificaciones y cambios de solicitudes.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='booking_items') then
    alter publication supabase_realtime add table public.booking_items;
  end if;
end $$;

-- Storage inicial.
insert into storage.buckets(id,name,public) values ('avatars','avatars',true) on conflict(id) do nothing;
insert into storage.buckets(id,name,public) values ('provider-gallery','provider-gallery',true) on conflict(id) do nothing;

create policy avatars_public_read on storage.objects for select using (bucket_id='avatars');
create policy avatars_owner_insert on storage.objects for insert to authenticated with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy avatars_owner_update on storage.objects for update to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy avatars_owner_delete on storage.objects for delete to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);

create policy gallery_public_read on storage.objects for select using (bucket_id='provider-gallery');
create policy gallery_owner_insert on storage.objects for insert to authenticated with check (bucket_id='provider-gallery' and exists(select 1 from public.service_providers sp where sp.id::text=(storage.foldername(name))[1] and (sp.owner_id=auth.uid() or public.current_role()='administrador')));
create policy gallery_owner_update on storage.objects for update to authenticated using (bucket_id='provider-gallery' and exists(select 1 from public.service_providers sp where sp.id::text=(storage.foldername(name))[1] and (sp.owner_id=auth.uid() or public.current_role()='administrador')));
create policy gallery_owner_delete on storage.objects for delete to authenticated using (bucket_id='provider-gallery' and exists(select 1 from public.service_providers sp where sp.id::text=(storage.foldername(name))[1] and (sp.owner_id=auth.uid() or public.current_role()='administrador')));

-- ============================================================
-- Data API grants + reparación de perfil (Brasa auth hardening)
-- ============================================================

grant usage on schema public to anon, authenticated;

grant select on public.service_categories to anon, authenticated;
grant select on public.service_providers to anon, authenticated;
grant select on public.provider_services to anon, authenticated;
grant select on public.provider_availability to anon, authenticated;
grant select on public.reviews to anon, authenticated;
grant select on public.catalog_providers to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.product_prices to anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.service_providers to authenticated;
grant select, insert, update, delete on public.provider_services to authenticated;
grant select, insert, update, delete on public.provider_availability to authenticated;
grant select, insert, update on public.bookings to authenticated;
grant select, insert, update on public.booking_items to authenticated;
grant select, insert, update, delete on public.reviews to authenticated;
grant select, insert, update, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert, update, delete on public.ai_plans to authenticated;
grant select on public.payments to authenticated;

grant execute on function public.current_role() to anon, authenticated;

create or replace function public.ensure_my_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  auth_user auth.users%rowtype;
  desired_role public.user_role;
  result_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'No authenticated user';
  end if;

  select * into auth_user from auth.users where id = auth.uid();

  desired_role := case
    when auth_user.raw_user_meta_data->>'role' = 'prestador'
      then 'prestador'::public.user_role
    else 'cliente'::public.user_role
  end;

  insert into public.profiles(id, full_name, email, phone, role)
  values(
    auth_user.id,
    coalesce(auth_user.raw_user_meta_data->>'full_name', ''),
    auth_user.email,
    auth_user.raw_user_meta_data->>'phone',
    desired_role
  )
  on conflict (id) do update set
    full_name = case when coalesce(excluded.full_name, '') <> '' then excluded.full_name else public.profiles.full_name end,
    email = excluded.email,
    phone = coalesce(excluded.phone, public.profiles.phone),
    role = case when public.profiles.role = 'administrador'::public.user_role then public.profiles.role else desired_role end,
    updated_at = now();

  select * into result_profile from public.profiles where id = auth_user.id;
  return result_profile;
end
$$;

grant execute on function public.ensure_my_profile() to authenticated;

-- ============================================================================
-- MIGRACIÓN: 002_auth_hardening.sql
-- ============================================================================

-- BRASA · parche de autenticación/permisos
-- Ejecutar DESPUÉS de 001_brasa_core.sql en proyectos ya creados.
-- Este archivo es idempotente y corrige:
-- 1) permisos Data API cuando "Automatically expose new tables" está desactivado,
-- 2) perfiles ausentes/desincronizados,
-- 3) roles cliente/prestador según user_metadata,
-- 4) acceso de cliente/prestador/admin bajo RLS.

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
begin
  requested_role := case
    when new.raw_user_meta_data->>'role' = 'prestador'
      then 'prestador'::public.user_role
    else 'cliente'::public.user_role
  end;

  insert into public.profiles(id, full_name, email, phone, role)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.raw_user_meta_data->>'phone',
    requested_role
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    role = case
      when public.profiles.role = 'administrador'::public.user_role
        then public.profiles.role
      else excluded.role
    end;

  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Repara o crea el perfil del usuario autenticado usando auth.users como fuente.
-- Nunca permite autoasignarse administrador.
create or replace function public.ensure_my_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  auth_user auth.users%rowtype;
  desired_role public.user_role;
  result_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'No authenticated user';
  end if;

  select * into auth_user
  from auth.users
  where id = auth.uid();

  if auth_user.id is null then
    raise exception 'Authenticated user not found';
  end if;

  desired_role := case
    when auth_user.raw_user_meta_data->>'role' = 'prestador'
      then 'prestador'::public.user_role
    else 'cliente'::public.user_role
  end;

  insert into public.profiles(id, full_name, email, phone, role)
  values(
    auth_user.id,
    coalesce(auth_user.raw_user_meta_data->>'full_name', ''),
    auth_user.email,
    auth_user.raw_user_meta_data->>'phone',
    desired_role
  )
  on conflict (id) do update set
    full_name = case
      when coalesce(excluded.full_name, '') <> '' then excluded.full_name
      else public.profiles.full_name
    end,
    email = excluded.email,
    phone = coalesce(excluded.phone, public.profiles.phone),
    role = case
      when public.profiles.role = 'administrador'::public.user_role
        then public.profiles.role
      else desired_role
    end,
    updated_at = now();

  select * into result_profile
  from public.profiles
  where id = auth_user.id;

  return result_profile;
end
$$;

-- Corrige cuentas ya creadas como prestador que hayan quedado con rol cliente.
update public.profiles p
set
  full_name = case
    when coalesce(u.raw_user_meta_data->>'full_name', '') <> ''
      then u.raw_user_meta_data->>'full_name'
    else p.full_name
  end,
  email = u.email,
  phone = coalesce(u.raw_user_meta_data->>'phone', p.phone),
  role = case
    when p.role = 'administrador'::public.user_role then p.role
    when u.raw_user_meta_data->>'role' = 'prestador' then 'prestador'::public.user_role
    else p.role
  end,
  updated_at = now()
from auth.users u
where p.id = u.id;

-- Permisos Data API. RLS sigue siendo la capa que decide qué filas puede usar cada rol.
grant usage on schema public to anon, authenticated;

grant select on public.service_categories to anon, authenticated;
grant select on public.service_providers to anon, authenticated;
grant select on public.provider_services to anon, authenticated;
grant select on public.provider_availability to anon, authenticated;
grant select on public.reviews to anon, authenticated;
grant select on public.catalog_providers to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.product_prices to anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.service_providers to authenticated;
grant select, insert, update, delete on public.provider_services to authenticated;
grant select, insert, update, delete on public.provider_availability to authenticated;
grant select, insert, update on public.bookings to authenticated;
grant select, insert, update on public.booking_items to authenticated;
grant select, insert, update, delete on public.reviews to authenticated;
grant select, insert, update, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert, update, delete on public.ai_plans to authenticated;
grant select on public.payments to authenticated;

grant execute on function public.current_role() to anon, authenticated;
grant execute on function public.ensure_my_profile() to authenticated;

-- ============================================================================
-- MIGRACIÓN: 20260825200741_provider_category_profiles.sql
-- ============================================================================

alter table public.provider_categories
  add column if not exists description text,
  add column if not exists cover_image_url text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.provider_category_gallery (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null,
  category_slug text not null,
  image_url text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (provider_id, category_slug, image_url)
);

alter table public.provider_category_gallery
  drop constraint if exists provider_category_gallery_provider_category_fkey;

alter table public.provider_category_gallery
  add constraint provider_category_gallery_provider_category_fkey
  foreign key (provider_id, category_slug)
  references public.provider_categories(provider_id, category_slug)
  on update cascade
  on delete cascade;

create index if not exists provider_category_gallery_order_idx
  on public.provider_category_gallery(provider_id, category_slug, sort_order, created_at);

alter table public.provider_category_gallery enable row level security;

drop policy if exists provider_category_gallery_public_read
  on public.provider_category_gallery;
create policy provider_category_gallery_public_read
on public.provider_category_gallery for select
to anon, authenticated
using (true);

drop policy if exists provider_category_gallery_owner_insert
  on public.provider_category_gallery;
create policy provider_category_gallery_owner_insert
on public.provider_category_gallery for insert
to authenticated
with check (
  exists (
    select 1
    from public.service_providers sp
    where sp.id = provider_id
      and (sp.owner_id = (select auth.uid()) or public.current_role() = 'administrador')
  )
);

drop policy if exists provider_category_gallery_owner_update
  on public.provider_category_gallery;
create policy provider_category_gallery_owner_update
on public.provider_category_gallery for update
to authenticated
using (
  exists (
    select 1
    from public.service_providers sp
    where sp.id = provider_id
      and (sp.owner_id = (select auth.uid()) or public.current_role() = 'administrador')
  )
)
with check (
  exists (
    select 1
    from public.service_providers sp
    where sp.id = provider_id
      and (sp.owner_id = (select auth.uid()) or public.current_role() = 'administrador')
  )
);

drop policy if exists provider_category_gallery_owner_delete
  on public.provider_category_gallery;
create policy provider_category_gallery_owner_delete
on public.provider_category_gallery for delete
to authenticated
using (
  exists (
    select 1
    from public.service_providers sp
    where sp.id = provider_id
      and (sp.owner_id = (select auth.uid()) or public.current_role() = 'administrador')
  )
);

grant select on public.provider_category_gallery to anon, authenticated;
grant insert, update, delete on public.provider_category_gallery to authenticated;

alter table public.provider_availability
  add column if not exists category_slug text;

alter table public.provider_availability
  drop constraint if exists provider_availability_provider_category_fkey;

alter table public.provider_availability
  add constraint provider_availability_provider_category_fkey
  foreign key (provider_id, category_slug)
  references public.provider_categories(provider_id, category_slug)
  on update cascade
  on delete restrict;

-- Detener la migración si los datos actuales violarían la nueva regla.
-- No se eliminan filas ni se corrigen horarios automáticamente.
-- Consulta de diagnóstico equivalente para identificar las filas antes del push:
-- select
--   first_slot.id as first_slot_id,
--   second_slot.id as second_slot_id,
--   first_slot.provider_id,
--   coalesce(first_slot.category_slug, '__legacy__') as category_scope
-- from public.provider_availability first_slot
-- join public.provider_availability second_slot
--   on first_slot.id < second_slot.id
--  and first_slot.provider_id = second_slot.provider_id
--  and coalesce(first_slot.category_slug, '__legacy__') =
--      coalesce(second_slot.category_slug, '__legacy__')
--  and tsrange(
--        first_slot.date + first_slot.start_time,
--        case when first_slot.end_time <= first_slot.start_time
--          then first_slot.date + first_slot.end_time + interval '1 day'
--          else first_slot.date + first_slot.end_time end,
--        '[)'
--      ) && tsrange(
--        second_slot.date + second_slot.start_time,
--        case when second_slot.end_time <= second_slot.start_time
--          then second_slot.date + second_slot.end_time + interval '1 day'
--          else second_slot.date + second_slot.end_time end,
--        '[)'
--      )
-- where first_slot.available = true
--   and second_slot.available = true
--   and first_slot.start_time is not null
--   and first_slot.end_time is not null
--   and second_slot.start_time is not null
--   and second_slot.end_time is not null;
do $$
declare
  v_conflict_count bigint;
begin
  select count(*)
  into v_conflict_count
  from public.provider_availability first_slot
  join public.provider_availability second_slot
    on first_slot.id < second_slot.id
   and first_slot.provider_id = second_slot.provider_id
   and coalesce(first_slot.category_slug, '__legacy__') =
       coalesce(second_slot.category_slug, '__legacy__')
   and tsrange(
         first_slot.date + first_slot.start_time,
         case
           when first_slot.end_time <= first_slot.start_time
             then first_slot.date + first_slot.end_time + interval '1 day'
           else first_slot.date + first_slot.end_time
         end,
         '[)'
       ) && tsrange(
         second_slot.date + second_slot.start_time,
         case
           when second_slot.end_time <= second_slot.start_time
             then second_slot.date + second_slot.end_time + interval '1 day'
           else second_slot.date + second_slot.end_time
         end,
         '[)'
       )
  where first_slot.available = true
    and second_slot.available = true
    and first_slot.start_time is not null
    and first_slot.end_time is not null
    and second_slot.start_time is not null
    and second_slot.end_time is not null;

  if v_conflict_count > 0 then
    raise exception using
      errcode = '23P01',
      message = format(
        'provider_availability contiene %s solapamiento(s) activos dentro de la misma categoría (NULL se considera legacy). Corrija esos datos antes de volver a ejecutar la migración.',
        v_conflict_count
      );
  end if;
end;
$$;

alter table public.provider_availability
  drop constraint if exists provider_availability_provider_id_date_start_time_end_time_key;

drop index if exists public.provider_availability_unique_slot_idx;
create unique index provider_availability_unique_slot_idx
  on public.provider_availability(provider_id, category_slug, date, start_time, end_time)
  nulls not distinct;

alter table public.provider_availability
  drop constraint if exists provider_availability_no_overlap;

alter table public.provider_availability
  add constraint provider_availability_no_overlap
  exclude using gist (
    provider_id with =,
    (coalesce(category_slug, '__legacy__')) with =,
    tsrange(
      date + start_time,
      case
        when end_time <= start_time
          then date + end_time + interval '1 day'
        else date + end_time
      end,
      '[)'
    ) with &&
  )
  where (
    available = true
    and start_time is not null
    and end_time is not null
  );

create or replace function public.is_provider_service_available(
  p_provider_id uuid,
  p_service_id uuid,
  p_date date,
  p_start_time time without time zone,
  p_guests integer
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_duration_hours numeric := 1;
  v_buffer_before integer := 0;
  v_buffer_after integer := 0;
  v_category_slug text;
  v_event_start timestamp;
  v_event_end timestamp;
  v_block_start timestamp;
  v_block_end timestamp;
begin
  select
    public.get_service_duration_hours(ps.id, p_guests),
    coalesce(ps.buffer_before_minutes, 0),
    coalesce(ps.buffer_after_minutes, 0),
    ps.category_slug
  into
    v_duration_hours,
    v_buffer_before,
    v_buffer_after,
    v_category_slug
  from public.provider_services ps
  where ps.id = p_service_id
    and ps.provider_id = p_provider_id
    and ps.active = true;

  if not found then
    return false;
  end if;

  v_event_start := p_date + p_start_time;
  v_event_end := v_event_start + make_interval(
    secs => round(v_duration_hours * 3600)::integer
  );
  v_block_start := v_event_start - make_interval(mins => v_buffer_before);
  v_block_end := v_event_end + make_interval(mins => v_buffer_after);

  if not exists (
    select 1
    from public.provider_availability pa
    where pa.provider_id = p_provider_id
      and pa.available = true
      and pa.start_time is not null
      and pa.end_time is not null
      and pa.date between p_date - 1 and p_date
      and (
        pa.category_slug = v_category_slug
        or (
          pa.category_slug is null
          and not exists (
            select 1
            from public.provider_availability category_availability
            where category_availability.provider_id = p_provider_id
              and category_availability.category_slug = v_category_slug
              and category_availability.available = true
              and category_availability.start_time is not null
              and category_availability.end_time is not null
              and (
                category_availability.date = p_date
                or (
                  category_availability.date = p_date - 1
                  and category_availability.end_time <=
                      category_availability.start_time
                )
              )
          )
        )
      )
      and (pa.date + pa.start_time) <= v_block_start
      and (
        case
          when pa.end_time <= pa.start_time
            then pa.date + pa.end_time + interval '1 day'
          else pa.date + pa.end_time
        end
      ) >= v_block_end
  ) then
    return false;
  end if;

  if exists (
    select 1
    from public.booking_items bi
    join public.bookings b on b.id = bi.booking_id
    join public.provider_services existing_service on existing_service.id = bi.service_id
    where bi.provider_id = p_provider_id
      and existing_service.category_slug = v_category_slug
      and b.status::text not in ('cancelada', 'completada', 'expirada')
      and bi.provider_status::text not in ('cancelada', 'rechazada', 'expirada')
      and (
        bi.provider_status::text not in ('pendiente', 'esperando_confirmacion')
        or bi.expires_at is null
        or bi.expires_at > now()
      )
      and b.event_date between p_date - 1 and p_date + 1
      and (
        (b.event_date + b.event_time)
        - make_interval(mins => coalesce(existing_service.buffer_before_minutes, 0))
      ) < v_block_end
      and (
        (b.event_date + b.event_time)
        + make_interval(
            secs => round(
              public.get_service_duration_hours(bi.service_id, b.guests) * 3600
            )::integer
          )
        + make_interval(mins => coalesce(existing_service.buffer_after_minutes, 0))
      ) > v_block_start
  ) then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.get_available_provider_alternatives(
  p_category text,
  p_event_date date,
  p_event_time time without time zone,
  p_guests integer default 0
)
returns table(
  provider_id uuid,
  provider_slug text,
  service_id uuid,
  business_name text,
  category_slug text,
  comuna text,
  rating numeric,
  verified boolean,
  featured boolean,
  service_name text,
  price integer,
  unit text,
  pricing_mode text,
  duration_hours numeric,
  image_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sp.id,
    sp.slug,
    ps.id,
    sp.business_name,
    ps.category_slug,
    sp.comuna,
    sp.rating,
    sp.verified,
    sp.featured,
    ps.name,
    ps.price,
    ps.unit,
    ps.pricing_mode,
    public.get_service_duration_hours(ps.id, p_guests),
    coalesce(pc.cover_image_url, sp.image_url)
  from public.service_providers sp
  join public.provider_services ps on ps.provider_id = sp.id
  join public.provider_categories pc
    on pc.provider_id = sp.id
   and pc.category_slug = ps.category_slug
  where sp.active = true
    and ps.active = true
    and ps.category_slug = p_category
    and (
      p_guests = 0
      or ps.max_guests is null
      or ps.max_guests >= p_guests
    )
    and (
      p_guests = 0
      or ps.min_guests is null
      or ps.min_guests <= p_guests
    )
    and public.is_provider_service_available(
      sp.id,
      ps.id,
      p_event_date,
      p_event_time,
      p_guests
    )
  order by sp.featured desc, sp.verified desc, sp.rating desc, ps.price asc;
$$;

-- ============================================================================
-- MIGRACIÓN: 20260825212950_fix_booking_items_rls_recursion.sql
-- ============================================================================

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.can_read_booking(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.bookings b
      where b.id = p_booking_id
        and (
          b.client_id = (select auth.uid())
          or exists (
            select 1
            from public.profiles profile
            where profile.id = (select auth.uid())
              and profile.role = 'administrador'::public.user_role
          )
          or exists (
            select 1
            from public.booking_items bi
            join public.service_providers sp
              on sp.id = bi.provider_id
            where bi.booking_id = b.id
              and sp.owner_id = (select auth.uid())
          )
        )
    );
$$;

revoke all on function private.can_read_booking(uuid) from public;
grant execute on function private.can_read_booking(uuid) to authenticated;

drop policy if exists bookings_read_participants
  on public.bookings;

create policy bookings_read_participants
on public.bookings for select
to authenticated
using (private.can_read_booking(id));

drop policy if exists booking_items_read_participants
  on public.booking_items;

create policy booking_items_read_participants
on public.booking_items for select
to authenticated
using (private.can_read_booking(booking_id));

-- ============================================================================
-- MIGRACIÓN: 20260826181429_service_fulfillment_scheduling.sql
-- ============================================================================

-- Scheduling modes for services that remain on site versus rentals that only
-- require the provider during delivery/setup and pickup.
alter table public.provider_services
  add column if not exists schedule_mode text not null default 'continuous',
  add column if not exists inventory_capacity numeric(10, 2);

alter table public.provider_services
  drop constraint if exists provider_services_schedule_mode_check;

alter table public.provider_services
  add constraint provider_services_schedule_mode_check
  check (schedule_mode in ('continuous', 'delivery_pickup'));

alter table public.provider_services
  drop constraint if exists provider_services_delivery_times_check;

alter table public.provider_services
  add constraint provider_services_delivery_times_check
  check (
    schedule_mode <> 'delivery_pickup'
    or coalesce(buffer_before_minutes, 0) > 0
    or coalesce(buffer_after_minutes, 0) > 0
  );

alter table public.provider_services
  drop constraint if exists provider_services_inventory_capacity_check;

alter table public.provider_services
  add constraint provider_services_inventory_capacity_check
  check (inventory_capacity is null or inventory_capacity > 0);

alter table public.booking_items
  add column if not exists booked_duration_hours numeric(8, 2),
  add column if not exists schedule_mode text,
  add column if not exists buffer_before_minutes integer,
  add column if not exists buffer_after_minutes integer;

alter table public.booking_items
  drop constraint if exists booking_items_schedule_mode_check;

alter table public.booking_items
  add constraint booking_items_schedule_mode_check
  check (schedule_mode is null or schedule_mode in ('continuous', 'delivery_pickup'));

create index if not exists booking_items_active_service_inventory_idx
  on public.booking_items(service_id, provider_status, booking_id)
  where service_id is not null;

create or replace function public.service_schedule_blocks(
  p_schedule_mode text,
  p_event_date date,
  p_event_time time without time zone,
  p_duration_hours numeric,
  p_buffer_before_minutes integer,
  p_buffer_after_minutes integer
)
returns table(block_start timestamp without time zone, block_end timestamp without time zone)
language sql
immutable
set search_path = public
as $$
  with values_for_schedule as (
    select
      p_event_date + p_event_time as event_start,
      (p_event_date + p_event_time)
        + make_interval(secs => round(greatest(coalesce(p_duration_hours, 1), 0) * 3600)::integer)
          as event_end,
      greatest(coalesce(p_buffer_before_minutes, 0), 0) as before_minutes,
      greatest(coalesce(p_buffer_after_minutes, 0), 0) as after_minutes,
      coalesce(p_schedule_mode, 'continuous') as mode
  )
  select
    event_start - make_interval(mins => before_minutes),
    case
      when mode = 'delivery_pickup' then event_start
      else event_end + make_interval(mins => after_minutes)
    end
  from values_for_schedule
  where mode <> 'delivery_pickup' or before_minutes > 0

  union all

  select
    event_end,
    event_end + make_interval(mins => after_minutes)
  from values_for_schedule
  where mode = 'delivery_pickup' and after_minutes > 0;
$$;

create or replace function public.is_provider_service_available(
  p_provider_id uuid,
  p_service_id uuid,
  p_date date,
  p_start_time time without time zone,
  p_guests integer
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_service public.provider_services%rowtype;
  v_duration_hours numeric;
  v_requested_block record;
begin
  select ps.*
  into v_service
  from public.provider_services ps
  where ps.id = p_service_id
    and ps.provider_id = p_provider_id
    and ps.active = true;

  if not found then
    return false;
  end if;

  v_duration_hours := public.get_service_duration_hours(v_service.id, p_guests);

  if v_service.schedule_mode = 'delivery_pickup'
     and coalesce(v_service.buffer_before_minutes, 0) = 0
     and coalesce(v_service.buffer_after_minutes, 0) = 0 then
    return false;
  end if;

  for v_requested_block in
    select *
    from public.service_schedule_blocks(
      v_service.schedule_mode,
      p_date,
      p_start_time,
      v_duration_hours,
      v_service.buffer_before_minutes,
      v_service.buffer_after_minutes
    )
  loop
    if not exists (
      select 1
      from public.provider_availability pa
      where pa.provider_id = p_provider_id
        and pa.available = true
        and pa.start_time is not null
        and pa.end_time is not null
        and pa.date between v_requested_block.block_start::date - 1
                        and v_requested_block.block_end::date
        and (
          pa.category_slug = v_service.category_slug
          or (
            pa.category_slug is null
            and not exists (
              select 1
              from public.provider_availability category_availability
              where category_availability.provider_id = p_provider_id
                and category_availability.category_slug = v_service.category_slug
                and category_availability.available = true
                and category_availability.start_time is not null
                and category_availability.end_time is not null
                and category_availability.date between v_requested_block.block_start::date - 1
                                                   and v_requested_block.block_end::date
            )
          )
        )
        and pa.date + pa.start_time <= v_requested_block.block_start
        and case
              when pa.end_time <= pa.start_time
                then pa.date + pa.end_time + interval '1 day'
              else pa.date + pa.end_time
            end >= v_requested_block.block_end
    ) then
      return false;
    end if;
  end loop;

  if exists (
    select 1
    from public.booking_items bi
    join public.bookings b on b.id = bi.booking_id
    join public.provider_services existing_service on existing_service.id = bi.service_id
    cross join lateral public.service_schedule_blocks(
      coalesce(bi.schedule_mode, existing_service.schedule_mode, 'continuous'),
      b.event_date,
      b.event_time,
      coalesce(
        bi.booked_duration_hours,
        public.get_service_duration_hours(bi.service_id, b.guests)
      ),
      coalesce(bi.buffer_before_minutes, existing_service.buffer_before_minutes, 0),
      coalesce(bi.buffer_after_minutes, existing_service.buffer_after_minutes, 0)
    ) existing_block
    cross join lateral public.service_schedule_blocks(
      v_service.schedule_mode,
      p_date,
      p_start_time,
      v_duration_hours,
      v_service.buffer_before_minutes,
      v_service.buffer_after_minutes
    ) requested_block
    where bi.provider_id = p_provider_id
      and b.status::text not in ('cancelada', 'completada', 'expirada')
      and bi.provider_status::text not in ('cancelada', 'rechazada', 'expirada')
      and (
        bi.provider_status::text not in ('pendiente', 'esperando_confirmacion')
        or bi.expires_at is null
        or bi.expires_at > now()
      )
      and existing_block.block_start < requested_block.block_end
      and existing_block.block_end > requested_block.block_start
  ) then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.validate_booking_item_schedule_and_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_service public.provider_services%rowtype;
  v_reserved_quantity numeric;
  v_duration numeric;
begin
  if new.provider_id is null or new.service_id is null then
    return new;
  end if;

  select b.* into strict v_booking
  from public.bookings b
  where b.id = new.booking_id;

  select ps.* into strict v_service
  from public.provider_services ps
  where ps.id = new.service_id
    and ps.provider_id = new.provider_id;

  -- Serializes bookings for one provider, closing the race between the public
  -- availability check and the booking item insert.
  perform pg_advisory_xact_lock(hashtextextended(new.provider_id::text, 0));

  if not public.is_provider_service_available(
    new.provider_id,
    new.service_id,
    v_booking.event_date,
    v_booking.event_time,
    v_booking.guests
  ) then
    raise exception 'El prestador % ya no está disponible para ese horario.', new.provider_name;
  end if;

  v_duration := public.get_service_duration_hours(new.service_id, v_booking.guests);
  new.booked_duration_hours := v_duration;
  new.schedule_mode := v_service.schedule_mode;
  new.buffer_before_minutes := v_service.buffer_before_minutes;
  new.buffer_after_minutes := v_service.buffer_after_minutes;
  new.category_slug := v_service.category_slug;

  if v_service.schedule_mode = 'delivery_pickup'
     and v_service.inventory_capacity is not null then
    select coalesce(sum(existing_item.quantity), 0)
    into v_reserved_quantity
    from public.booking_items existing_item
    join public.bookings existing_booking on existing_booking.id = existing_item.booking_id
    join public.provider_services existing_service on existing_service.id = existing_item.service_id
    where existing_item.service_id = new.service_id
      and existing_booking.status::text not in ('cancelada', 'completada', 'expirada')
      and existing_item.provider_status::text not in ('cancelada', 'rechazada', 'expirada')
      and (
        existing_item.provider_status::text not in ('pendiente', 'esperando_confirmacion')
        or existing_item.expires_at is null
        or existing_item.expires_at > now()
      )
      and (existing_booking.event_date + existing_booking.event_time)
            - make_interval(
                mins => coalesce(
                  existing_item.buffer_before_minutes,
                  existing_service.buffer_before_minutes,
                  0
                )
              )
            < (v_booking.event_date + v_booking.event_time)
              + make_interval(secs => round(v_duration * 3600)::integer)
              + make_interval(mins => coalesce(v_service.buffer_after_minutes, 0))
      and (existing_booking.event_date + existing_booking.event_time)
            + make_interval(
                secs => round(
                  coalesce(
                    existing_item.booked_duration_hours,
                    public.get_service_duration_hours(existing_item.service_id, existing_booking.guests)
                  ) * 3600
                )::integer
              )
            + make_interval(
                mins => coalesce(
                  existing_item.buffer_after_minutes,
                  existing_service.buffer_after_minutes,
                  0
                )
              )
            > (v_booking.event_date + v_booking.event_time)
              - make_interval(mins => coalesce(v_service.buffer_before_minutes, 0));

    if v_reserved_quantity + new.quantity > v_service.inventory_capacity then
      raise exception
        'No hay suficiente stock de %. Disponible para ese horario: %.',
        v_service.name,
        greatest(v_service.inventory_capacity - v_reserved_quantity, 0);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists booking_items_validate_schedule_inventory
  on public.booking_items;

create trigger booking_items_validate_schedule_inventory
before insert on public.booking_items
for each row
execute function public.validate_booking_item_schedule_and_inventory();

revoke all on function public.service_schedule_blocks(text, date, time without time zone, numeric, integer, integer)
  from public;
grant execute on function public.service_schedule_blocks(text, date, time without time zone, numeric, integer, integer)
  to anon, authenticated, service_role;

revoke all on function public.validate_booking_item_schedule_and_inventory()
  from public;

grant execute on function public.is_provider_service_available(uuid, uuid, date, time without time zone, integer)
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- ============================================================================
-- MIGRACIÓN: 20260826183443_fix_provider_booking_status_confirmation.sql
-- ============================================================================

-- Prevent two overlapping requests from being confirmed for the same provider.
-- Pending requests can coexist for legacy/testing purposes, but confirmation is
-- serialized and only the first compatible request can win.
create or replace function public.validate_booking_item_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_service public.provider_services%rowtype;
  v_duration numeric;
  v_reserved_quantity numeric;
begin
  if new.provider_status::text <> 'confirmada'
     or old.provider_status::text = 'confirmada' then
    return new;
  end if;

  if new.provider_id is null then
    return new;
  end if;

  select b.* into strict v_booking
  from public.bookings b
  where b.id = new.booking_id;

  perform pg_advisory_xact_lock(hashtextextended(new.provider_id::text, 0));

  if new.service_id is not null then
    select ps.* into strict v_service
    from public.provider_services ps
    where ps.id = new.service_id
      and ps.provider_id = new.provider_id;

    v_duration := coalesce(
      new.booked_duration_hours,
      public.get_service_duration_hours(new.service_id, v_booking.guests)
    );
  else
    v_duration := coalesce(new.booked_duration_hours, 1);
  end if;

  if exists (
    select 1
    from public.booking_items existing_item
    join public.bookings existing_booking
      on existing_booking.id = existing_item.booking_id
    left join public.provider_services existing_service
      on existing_service.id = existing_item.service_id
    cross join lateral public.service_schedule_blocks(
      coalesce(existing_item.schedule_mode, existing_service.schedule_mode, 'continuous'),
      existing_booking.event_date,
      existing_booking.event_time,
      coalesce(
        existing_item.booked_duration_hours,
        case
          when existing_item.service_id is not null
            then public.get_service_duration_hours(existing_item.service_id, existing_booking.guests)
          else 1
        end
      ),
      coalesce(existing_item.buffer_before_minutes, existing_service.buffer_before_minutes, 0),
      coalesce(existing_item.buffer_after_minutes, existing_service.buffer_after_minutes, 0)
    ) existing_block
    cross join lateral public.service_schedule_blocks(
      coalesce(new.schedule_mode, v_service.schedule_mode, 'continuous'),
      v_booking.event_date,
      v_booking.event_time,
      v_duration,
      coalesce(new.buffer_before_minutes, v_service.buffer_before_minutes, 0),
      coalesce(new.buffer_after_minutes, v_service.buffer_after_minutes, 0)
    ) requested_block
    where existing_item.id <> new.id
      and existing_item.provider_id = new.provider_id
      and existing_item.provider_status::text in (
        'confirmada',
        'en_preparacion',
        'en_curso'
      )
      and existing_booking.status::text not in ('cancelada', 'expirada')
      and existing_block.block_start < requested_block.block_end
      and existing_block.block_end > requested_block.block_start
  ) then
    raise exception
      'Ya confirmaste otra reserva que ocupa ese horario. Rechaza esta solicitud o coordina otro horario.';
  end if;

  if new.service_id is not null
     and v_service.schedule_mode = 'delivery_pickup'
     and v_service.inventory_capacity is not null then
    select coalesce(sum(existing_item.quantity), 0)
    into v_reserved_quantity
    from public.booking_items existing_item
    join public.bookings existing_booking
      on existing_booking.id = existing_item.booking_id
    left join public.provider_services existing_service
      on existing_service.id = existing_item.service_id
    where existing_item.id <> new.id
      and existing_item.service_id = new.service_id
      and existing_item.provider_status::text in (
        'confirmada',
        'en_preparacion',
        'en_curso'
      )
      and existing_booking.status::text not in ('cancelada', 'expirada')
      and (existing_booking.event_date + existing_booking.event_time)
            - make_interval(
                mins => coalesce(
                  existing_item.buffer_before_minutes,
                  existing_service.buffer_before_minutes,
                  0
                )
              )
            < (v_booking.event_date + v_booking.event_time)
              + make_interval(secs => round(v_duration * 3600)::integer)
              + make_interval(mins => coalesce(new.buffer_after_minutes, v_service.buffer_after_minutes, 0))
      and (existing_booking.event_date + existing_booking.event_time)
            + make_interval(
                secs => round(
                  coalesce(
                    existing_item.booked_duration_hours,
                    public.get_service_duration_hours(existing_item.service_id, existing_booking.guests)
                  ) * 3600
                )::integer
              )
            + make_interval(
                mins => coalesce(
                  existing_item.buffer_after_minutes,
                  existing_service.buffer_after_minutes,
                  0
                )
              )
            > (v_booking.event_date + v_booking.event_time)
              - make_interval(mins => coalesce(new.buffer_before_minutes, v_service.buffer_before_minutes, 0));

    if v_reserved_quantity + new.quantity > v_service.inventory_capacity then
      raise exception
        'No hay suficiente stock de %. Disponible para ese horario: %.',
        v_service.name,
        greatest(v_service.inventory_capacity - v_reserved_quantity, 0);
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_booking_item_confirmation()
  from public;

drop trigger if exists booking_items_validate_confirmation
  on public.booking_items;

create trigger booking_items_validate_confirmation
before update of provider_status on public.booking_items
for each row
execute function public.validate_booking_item_confirmation();

create or replace function public.refresh_booking_status_from_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bid uuid;
  total_count integer;
  waiting_count integer;
  confirmed_count integer;
  completed_count integer;
  cancelled_count integer;
begin
  bid := case when tg_op = 'DELETE' then old.booking_id else new.booking_id end;

  select
    count(*),
    count(*) filter (
      where provider_status::text in ('pendiente', 'esperando_confirmacion')
    ),
    count(*) filter (
      where provider_status::text in ('confirmada', 'en_preparacion', 'en_curso')
    ),
    count(*) filter (where provider_status::text = 'completada'),
    count(*) filter (
      where provider_status::text in ('cancelada', 'rechazada', 'expirada')
    )
  into
    total_count,
    waiting_count,
    confirmed_count,
    completed_count,
    cancelled_count
  from public.booking_items
  where booking_id = bid;

  if total_count = 0 then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  update public.bookings
  set status = case
    when cancelled_count = total_count
      then 'cancelada'::public.booking_status
    when completed_count = total_count
      then 'completada'::public.booking_status
    when waiting_count > 0
      then 'esperando_confirmacion'::public.booking_status
    when confirmed_count + completed_count > 0
      then 'confirmada'::public.booking_status
    else status
  end,
  updated_at = now()
  where id = bid;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.provider_update_booking_item_status(
  p_item_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking_id uuid;
  v_current_status public.booking_status;
  v_expires_at timestamptz;
  v_item_status public.booking_status;
  v_booking_status public.booking_status;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if p_action not in ('accept', 'reject') then
    raise exception 'Acción no válida.';
  end if;

  select bi.booking_id, bi.provider_status, bi.expires_at
  into v_booking_id, v_current_status, v_expires_at
  from public.booking_items bi
  join public.service_providers sp on sp.id = bi.provider_id
  where bi.id = p_item_id
    and sp.owner_id = v_user_id
  for update of bi;

  if v_booking_id is null then
    raise exception 'No tienes permiso para modificar esta solicitud.';
  end if;

  if v_current_status::text not in ('pendiente', 'esperando_confirmacion') then
    raise exception 'Esta solicitud ya fue respondida.';
  end if;

  if v_expires_at is not null and v_expires_at <= now() then
    raise exception 'La solicitud expiró. El horario ya fue liberado.';
  end if;

  v_item_status := case
    when p_action = 'accept' then 'confirmada'::public.booking_status
    else 'rechazada'::public.booking_status
  end;

  update public.booking_items
  set provider_status = v_item_status,
      responded_at = now()
  where id = p_item_id;

  -- booking_items_refresh_booking recalculates the parent booking in the same
  -- transaction using enum-safe values.
  select b.status into v_booking_status
  from public.bookings b
  where b.id = v_booking_id;

  return jsonb_build_object(
    'ok', true,
    'itemId', p_item_id,
    'bookingId', v_booking_id,
    'providerStatus', v_item_status::text,
    'bookingStatus', v_booking_status::text,
    'respondedAt', now()
  );
end;
$$;

grant execute on function public.provider_update_booking_item_status(uuid, text)
  to authenticated, service_role;

notify pgrst, 'reload schema';

-- ============================================================================
-- MIGRACIÓN: 20260826183912_add_rejected_booking_status.sql
-- ============================================================================

alter type public.booking_status
  add value if not exists 'rechazada' after 'cancelada';

notify pgrst, 'reload schema';

-- ============================================================================
-- MIGRACIÓN: 20260826210000_enforce_provider_coverage.sql
-- ============================================================================

-- Impide reservar prestadores fuera de las comunas que declararon cubrir.
-- La comprobacion vive en PostgreSQL para no depender de datos del navegador.

create or replace function public.validate_booking_item_provider_coverage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_comuna text;
  v_provider_comuna text;
  v_provider_coverage text[];
  v_has_coverage boolean;
begin
  if new.provider_id is null then
    return new;
  end if;

  select b.comuna
  into v_booking_comuna
  from public.bookings b
  where b.id = new.booking_id;

  -- Las reservas legacy sin comuna conservan su comportamiento actual.
  if nullif(btrim(v_booking_comuna), '') is null then
    return new;
  end if;

  select sp.comuna, sp.coverage
  into v_provider_comuna, v_provider_coverage
  from public.service_providers sp
  where sp.id = new.provider_id;

  select exists (
    select 1
    from unnest(
      case
        when coalesce(cardinality(v_provider_coverage), 0) > 0
          then v_provider_coverage
        when nullif(btrim(v_provider_comuna), '') is not null
          then array[v_provider_comuna]
        else array[]::text[]
      end
    ) as covered_comuna
    where lower(btrim(covered_comuna)) = lower(btrim(v_booking_comuna))
  )
  into v_has_coverage;

  if not v_has_coverage then
    raise exception using
      errcode = 'P0001',
      message = format(
        'El prestador %s no tiene cobertura en %s.',
        new.provider_name,
        v_booking_comuna
      );
  end if;

  return new;
end;
$$;

drop trigger if exists booking_items_validate_provider_coverage
  on public.booking_items;

create trigger booking_items_validate_provider_coverage
before insert on public.booking_items
for each row
execute function public.validate_booking_item_provider_coverage();

revoke all on function public.validate_booking_item_provider_coverage()
  from public;

notify pgrst, 'reload schema';

-- ============================================================================
-- MIGRACIÓN: 20260903182508_add_web_push_subscriptions.sql
-- ============================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_user_endpoint_key unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_owner_select
  on public.push_subscriptions;
create policy push_subscriptions_owner_select
  on public.push_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_owner_insert
  on public.push_subscriptions;
create policy push_subscriptions_owner_insert
  on public.push_subscriptions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_owner_update
  on public.push_subscriptions;
create policy push_subscriptions_owner_update
  on public.push_subscriptions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_owner_delete
  on public.push_subscriptions;
create policy push_subscriptions_owner_delete
  on public.push_subscriptions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete
  on public.push_subscriptions to authenticated;

create table if not exists public.push_delivery_events (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (booking_id, user_id)
);

create index if not exists push_delivery_events_user_id_idx
  on public.push_delivery_events (user_id);

alter table public.push_delivery_events enable row level security;

revoke all on public.push_delivery_events from anon, authenticated;

-- ============================================================================
-- MIGRACIÓN: 20260904160224_service_inventory_availability.sql
-- ============================================================================

-- Expose only the remaining quantity for one rental service and time window.
-- Booking rows remain private; the scalar result is intentionally public so the
-- marketplace can prevent customers from requesting more units than exist.
create or replace function public.get_available_service_inventory(
  p_service_id uuid,
  p_event_date date,
  p_event_time time without time zone,
  p_guests integer default 0
)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_service public.provider_services%rowtype;
  v_duration numeric;
  v_reserved_quantity numeric := 0;
begin
  select ps.*
  into v_service
  from public.provider_services ps
  where ps.id = p_service_id
    and ps.active = true;

  if not found
     or v_service.schedule_mode <> 'delivery_pickup'
     or v_service.inventory_capacity is null then
    return null;
  end if;

  v_duration := public.get_service_duration_hours(p_service_id, p_guests);

  select coalesce(sum(existing_item.quantity), 0)
  into v_reserved_quantity
  from public.booking_items existing_item
  join public.bookings existing_booking
    on existing_booking.id = existing_item.booking_id
  join public.provider_services existing_service
    on existing_service.id = existing_item.service_id
  where existing_item.service_id = p_service_id
    and existing_booking.status::text not in ('cancelada', 'completada', 'expirada')
    and existing_item.provider_status::text not in ('cancelada', 'rechazada', 'expirada')
    and (
      existing_item.provider_status::text not in ('pendiente', 'esperando_confirmacion')
      or existing_item.expires_at is null
      or existing_item.expires_at > now()
    )
    and (existing_booking.event_date + existing_booking.event_time)
          - make_interval(
              mins => coalesce(
                existing_item.buffer_before_minutes,
                existing_service.buffer_before_minutes,
                0
              )
            )
          < (p_event_date + p_event_time)
            + make_interval(secs => round(v_duration * 3600)::integer)
            + make_interval(mins => coalesce(v_service.buffer_after_minutes, 0))
    and (existing_booking.event_date + existing_booking.event_time)
          + make_interval(
              secs => round(
                coalesce(
                  existing_item.booked_duration_hours,
                  public.get_service_duration_hours(
                    existing_item.service_id,
                    existing_booking.guests
                  )
                ) * 3600
              )::integer
            )
          + make_interval(
              mins => coalesce(
                existing_item.buffer_after_minutes,
                existing_service.buffer_after_minutes,
                0
              )
            )
          > (p_event_date + p_event_time)
            - make_interval(mins => coalesce(v_service.buffer_before_minutes, 0));

  return greatest(v_service.inventory_capacity - v_reserved_quantity, 0);
end;
$$;

revoke all on function public.get_available_service_inventory(
  uuid,
  date,
  time without time zone,
  integer
) from public, anon, authenticated;

grant execute on function public.get_available_service_inventory(
  uuid,
  date,
  time without time zone,
  integer
) to anon, authenticated, service_role;

-- Preserve the RPC signature used by the app, but pass the real guest count
-- supplied in each item so dynamic durations remain part of slot validation.
create or replace function public.get_common_available_slots(
  p_event_date date,
  p_items jsonb
)
returns table(slot_time time without time zone)
language sql
stable
security definer
set search_path = ''
as $$
  with requested as (
    select
      sp.id as provider_id,
      ps.id as service_id,
      greatest(coalesce((item ->> 'guests')::integer, 0), 0) as guests
    from jsonb_array_elements(p_items) item
    join public.service_providers sp
      on sp.active = true
      and (
        sp.slug = item ->> 'providerSlug'
        or sp.id::text = item ->> 'providerSlug'
      )
    join public.provider_services ps
      on ps.provider_id = sp.id
      and ps.active = true
      and (
        ps.external_key = item ->> 'serviceKey'
        or ps.id::text = item ->> 'serviceKey'
      )
  ),
  candidate_slots as (
    select generated::time as slot_time
    from generate_series(
      p_event_date::timestamp,
      p_event_date::timestamp + interval '23 hours 30 minutes',
      interval '30 minutes'
    ) generated
  )
  select cs.slot_time
  from candidate_slots cs
  where (select count(*) from requested) = jsonb_array_length(p_items)
    and not exists (
      select 1
      from requested r
      where not public.is_provider_service_available(
        r.provider_id,
        r.service_id,
        p_event_date,
        cs.slot_time,
        r.guests
      )
    )
  order by cs.slot_time;
$$;

revoke all on function public.get_common_available_slots(date, jsonb)
  from public, anon, authenticated;
grant execute on function public.get_common_available_slots(date, jsonb)
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- ============================================================================
-- MIGRACIÓN: 20260914180831_add_webpay_payment_flow.sql
-- ============================================================================

-- Los valores enum deben confirmarse antes de ser usados por la migración siguiente.
alter type public.booking_status add value if not exists 'expirada';
alter type public.booking_status add value if not exists 'esperando_pago';
alter type public.booking_status add value if not exists 'pago_expirado';
alter type public.payment_status add value if not exists 'expirado';

-- ============================================================================
-- MIGRACIÓN: 20260914181302_configure_webpay_payment_flow.sql
-- ============================================================================

-- Webpay Plus: ventana de pago y confirmación transaccional.
alter table public.payments
  add column if not exists buy_order text,
  add column if not exists token text,
  add column if not exists expires_at timestamptz,
  add column if not exists authorized_at timestamptz;

alter table public.bookings
  add column if not exists payment_due_at timestamptz;

create unique index if not exists payments_buy_order_unique_idx
  on public.payments (buy_order) where buy_order is not null;
create unique index if not exists payments_token_unique_idx
  on public.payments (token) where token is not null;
create unique index if not exists payments_one_pending_webpay_per_booking_idx
  on public.payments (booking_id)
  where provider = 'webpay' and status = 'pendiente';
create index if not exists payments_pending_expiry_idx
  on public.payments (expires_at) where status = 'pendiente';

create or replace function public.expire_stale_webpay_payments()
returns integer language plpgsql security invoker set search_path = public
as $$
declare v_count integer;
begin
  with bookings_to_expire as (
    select b.id from public.bookings b
     where b.status = 'esperando_pago'::public.booking_status
       and b.payment_due_at is not null and b.payment_due_at <= now()
  ), expired_items as (
    update public.booking_items bi
       set provider_status = 'expirada'::public.booking_status, updated_at = now()
     where bi.booking_id in (select id from bookings_to_expire)
       and bi.provider_status not in ('cancelada', 'rechazada', 'expirada')
    returning bi.booking_id
  ), expired_bookings as (
    update public.bookings b
       set status = 'pago_expirado'::public.booking_status, updated_at = now()
     where b.id in (select booking_id from expired_items)
        or b.id in (select id from bookings_to_expire)
    returning b.id
  ), expired_payments as (
    update public.payments
       set status = 'expirado'::public.payment_status, updated_at = now()
     where provider = 'webpay' and status = 'pendiente'::public.payment_status
       and (
         (expires_at is not null and expires_at <= now())
         or exists (select 1 from expired_bookings eb where eb.id = booking_id)
       )
    returning booking_id
  )
  select count(*) into v_count from expired_bookings;
  return v_count;
end;
$$;

revoke all on function public.expire_stale_webpay_payments() from public, anon, authenticated;
grant execute on function public.expire_stale_webpay_payments() to service_role;

create or replace function public.start_booking_payment_window()
returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  if new.status = 'confirmada'::public.booking_status
     and old.status is distinct from new.status
     and not exists (
       select 1 from public.payments p
        where p.booking_id = new.id
          and p.status in ('pagado', 'autorizado')
     ) then
    new.status := 'esperando_pago'::public.booking_status;
    -- La UI ofrece 10 minutos; dos minutos adicionales absorben el retorno
    -- y la confirmación servidor-servidor sin liberar un pago autorizado.
    new.payment_due_at := now() + interval '12 minutes';
  end if;
  return new;
end;
$$;

revoke all on function public.start_booking_payment_window() from public, anon, authenticated;

drop trigger if exists bookings_start_payment_window on public.bookings;
create trigger bookings_start_payment_window
before update of status on public.bookings
for each row execute function public.start_booking_payment_window();

create or replace function public.finalize_webpay_payment(
  p_token text, p_buy_order text, p_amount integer, p_response jsonb
)
returns table (booking_id uuid, booking_code text)
language plpgsql security invoker set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_booking public.bookings%rowtype;
begin
  select * into v_payment from public.payments
   where token = p_token and provider = 'webpay' for update;
  if not found then raise exception 'Pago Webpay no encontrado.'; end if;

  select * into strict v_booking from public.bookings
   where id = v_payment.booking_id for update;

  if v_payment.status in ('pagado', 'autorizado') then
    return query select v_booking.id, v_booking.code;
    return;
  end if;
  if v_payment.status <> 'pendiente' then
    raise exception 'El intento de pago ya no está vigente.';
  end if;
  if v_payment.expires_at is not null and v_payment.expires_at <= now() then
    update public.payments set status = 'expirado', updated_at = now() where id = v_payment.id;
    update public.bookings set status = 'pago_expirado', updated_at = now() where id = v_booking.id;
    raise exception 'El tiempo para pagar expiró.';
  end if;
  if v_payment.buy_order is distinct from p_buy_order
     or v_payment.amount is distinct from p_amount then
    raise exception 'La orden o el monto confirmado no coincide.';
  end if;

  update public.payments
     set status = 'pagado', external_id = p_buy_order, authorized_at = now(),
         metadata = metadata || jsonb_build_object('commit', p_response), updated_at = now()
   where id = v_payment.id;
  update public.bookings
     set status = 'confirmada', payment_due_at = null, updated_at = now()
   where id = v_booking.id;
  return query select v_booking.id, v_booking.code;
end;
$$;

revoke all on function public.finalize_webpay_payment(text, text, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.finalize_webpay_payment(text, text, integer, jsonb) to service_role;

create or replace function public.fail_webpay_payment(p_token text)
returns text
language plpgsql security invoker set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_code text;
begin
  select * into v_payment from public.payments
   where token = p_token and provider = 'webpay' for update;
  if not found then return null; end if;

  select code into v_code from public.bookings where id = v_payment.booking_id for update;
  if v_payment.status not in ('pagado', 'autorizado') then
    update public.payments set status = 'fallido', updated_at = now() where id = v_payment.id;
    update public.booking_items
       set provider_status = 'expirada', updated_at = now()
     where booking_id = v_payment.booking_id
       and provider_status not in ('cancelada', 'rechazada', 'expirada');
    update public.bookings
       set status = 'pago_expirado', updated_at = now()
     where id = v_payment.booking_id;
  end if;
  return v_code;
end;
$$;

revoke all on function public.fail_webpay_payment(text) from public, anon, authenticated;
grant execute on function public.fail_webpay_payment(text) to service_role;

-- Si pg_cron ya está habilitado, libera intentos vencidos cada minuto.
-- Los endpoints también ejecutan la limpieza de forma oportunista.
do $$
declare
  v_job_exists boolean := false;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute 'select exists (select 1 from cron.job where jobname = $1)'
      into v_job_exists using 'expire-stale-webpay-payments';
    if not v_job_exists then
      perform cron.schedule(
        'expire-stale-webpay-payments', '* * * * *',
        'select public.expire_stale_webpay_payments();'
      );
    end if;
  end if;
end;
$$;

-- ============================================================================
-- MIGRACIÓN: 20260914183440_enable_webpay_expiration_cron.sql
-- ============================================================================

-- Supabase Cron usa pg_cron para liberar reservas cuyo pago fue abandonado.
create extension if not exists pg_cron;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
    from cron.job
   where jobname = 'expire-stale-webpay-payments'
   limit 1;

  if v_job_id is null then
    perform cron.schedule(
      'expire-stale-webpay-payments',
      '* * * * *',
      'select public.expire_stale_webpay_payments();'
    );
  end if;
end;
$$;

-- ============================================================================
-- MIGRACIÓN: 20260914190246_grant_webpay_service_role_permissions.sql
-- ============================================================================

-- Webpay se ejecuta exclusivamente en Route Handlers con la clave secreta.
-- service_role omite RLS, pero aun necesita privilegios SQL de tabla.
grant select, insert, update on table public.payments to service_role;
grant select, update on table public.bookings to service_role;
grant select, update on table public.booking_items to service_role;

-- ============================================================================
-- MIGRACIÓN: 20260914191000_add_payment_confirmation_notifications.sql
-- ============================================================================

alter table public.notifications
  add column if not exists dedupe_key text;

create unique index if not exists notifications_dedupe_key_unique_idx
  on public.notifications (dedupe_key)
  where dedupe_key is not null;

-- Acceso exclusivo de los Route Handlers que usan la clave secreta.
grant select, insert on table public.notifications to service_role;
grant select on table public.service_providers to service_role;
grant select, delete on table public.push_subscriptions to service_role;
grant insert on table public.push_delivery_events to service_role;

-- ============================================================================
-- MIGRACIÓN: 20260914192604_set_webpay_window_to_ten_minutes.sql
-- ============================================================================

create or replace function public.start_booking_payment_window()
returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  if new.status = 'confirmada'::public.booking_status
     and old.status is distinct from new.status
     and not exists (
       select 1 from public.payments p
        where p.booking_id = new.id
          and p.status in ('pagado', 'autorizado')
     ) then
    new.status := 'esperando_pago'::public.booking_status;
    new.payment_due_at := now() + interval '10 minutes';
  end if;
  return new;
end;
$$;

-- ============================================================================
-- MIGRACIÓN: 20260914193157_normalize_unpaid_bookings_provider_commission.sql
-- ============================================================================

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

-- ============================================================================
-- MIGRACIÓN: 20260914193812_expose_provider_booking_payment_status.sql
-- ============================================================================

create or replace function public.get_my_provider_booking_payments()
returns table (
  booking_id uuid,
  payment_state text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    bi.booking_id,
    case
      when bool_or(p.status in ('pagado', 'autorizado')) then 'pagada'
      when bool_or(p.status = 'pendiente') then 'pendiente'
      else 'sin_pago'
    end as payment_state
  from public.booking_items as bi
  join public.service_providers as sp
    on sp.id = bi.provider_id
  left join public.payments as p
    on p.booking_id = bi.booking_id
  where (select auth.uid()) is not null
    and sp.owner_id = (select auth.uid())
  group by bi.booking_id;
$$;

revoke all on function public.get_my_provider_booking_payments()
  from public, anon, service_role;
grant execute on function public.get_my_provider_booking_payments()
  to authenticated;

-- ============================================================================
-- MIGRACIÓN: 20260915124721_add_provider_payouts_and_paid_messaging.sql
-- ============================================================================

-- Cuentas de abono privadas y libro de liquidaciones de prestadores.
create table if not exists public.provider_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null unique references public.service_providers(id) on delete cascade,
  holder_name text not null,
  holder_rut text not null,
  bank_code text not null,
  bank_name text not null,
  account_type text not null check (account_type in ('corriente', 'vista', 'ahorro', 'cuenta_rut')),
  account_number text not null,
  notification_email text not null,
  verified boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_payouts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  booking_item_id uuid not null unique references public.booking_items(id) on delete restrict,
  provider_id uuid not null references public.service_providers(id) on delete restrict,
  payment_id uuid not null references public.payments(id) on delete restrict,
  gross_amount integer not null check (gross_amount >= 0),
  platform_fee integer not null check (platform_fee >= 0),
  net_amount integer generated always as (gross_amount - platform_fee) stored,
  status text not null default 'retenida' check (status in ('retenida', 'lista_para_pagar', 'pagada', 'fallida', 'reembolsada')),
  available_at timestamptz not null,
  paid_at timestamptz,
  transfer_reference text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (platform_fee <= gross_amount)
);

create index if not exists provider_payouts_provider_status_idx
  on public.provider_payouts(provider_id, status, available_at);
create index if not exists provider_payouts_booking_idx
  on public.provider_payouts(booking_id);

drop trigger if exists provider_payout_accounts_touch on public.provider_payout_accounts;
create trigger provider_payout_accounts_touch before update on public.provider_payout_accounts
for each row execute function public.touch_updated_at();

drop trigger if exists provider_payouts_touch on public.provider_payouts;
create trigger provider_payouts_touch before update on public.provider_payouts
for each row execute function public.touch_updated_at();

create or replace function public.protect_provider_payout_account_verification()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  if public.current_role() <> 'administrador'::public.user_role then
    if tg_op = 'INSERT' then
      new.verified := false;
      new.verified_at := null;
      new.verified_by := null;
    else
      new.verified := old.verified;
      new.verified_at := old.verified_at;
      new.verified_by := old.verified_by;
      if row(new.holder_name, new.holder_rut, new.bank_code, new.account_type, new.account_number)
         is distinct from row(old.holder_name, old.holder_rut, old.bank_code, old.account_type, old.account_number) then
        new.verified := false;
        new.verified_at := null;
        new.verified_by := null;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists provider_payout_accounts_protect_verification on public.provider_payout_accounts;
create trigger provider_payout_accounts_protect_verification
before insert or update on public.provider_payout_accounts
for each row execute function public.protect_provider_payout_account_verification();

revoke all on function public.protect_provider_payout_account_verification() from public, anon, authenticated;

create or replace function public.create_provider_payouts_for_payment()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status::text not in ('pagado', 'autorizado')
     or (tg_op = 'UPDATE' and old.status::text in ('pagado', 'autorizado')) then
    return new;
  end if;

  insert into public.provider_payouts(
    booking_id, booking_item_id, provider_id, payment_id,
    gross_amount, platform_fee, status, available_at
  )
  select
    bi.booking_id,
    bi.id,
    bi.provider_id,
    new.id,
    bi.line_total,
    round(bi.line_total * 0.10)::integer,
    case
      when bi.provider_status::text = 'completada'
       and (((b.event_date::text || ' ' || b.event_time::text)::timestamp at time zone 'America/Santiago') + interval '24 hours') <= now()
      then 'lista_para_pagar'
      else 'retenida'
    end,
    ((b.event_date::text || ' ' || b.event_time::text)::timestamp at time zone 'America/Santiago') + interval '24 hours'
  from public.booking_items bi
  join public.bookings b on b.id = bi.booking_id
  where bi.booking_id = new.booking_id
    and bi.provider_id is not null
  on conflict (booking_item_id) do nothing;

  return new;
end;
$$;

revoke all on function public.create_provider_payouts_for_payment() from public, anon, authenticated;

drop trigger if exists payments_create_provider_payouts on public.payments;
create trigger payments_create_provider_payouts
after insert or update of status on public.payments
for each row execute function public.create_provider_payouts_for_payment();

-- Normaliza liquidaciones antiguas ya pagadas sin duplicarlas.
insert into public.provider_payouts(
  booking_id, booking_item_id, provider_id, payment_id,
  gross_amount, platform_fee, status, available_at
)
select
  bi.booking_id,
  bi.id,
  bi.provider_id,
  p.id,
  bi.line_total,
  round(bi.line_total * 0.10)::integer,
  case
    when bi.provider_status::text = 'completada'
     and (((b.event_date::text || ' ' || b.event_time::text)::timestamp at time zone 'America/Santiago') + interval '24 hours') <= now()
    then 'lista_para_pagar'
    else 'retenida'
  end,
  ((b.event_date::text || ' ' || b.event_time::text)::timestamp at time zone 'America/Santiago') + interval '24 hours'
from public.payments p
join public.bookings b on b.id = p.booking_id
join public.booking_items bi on bi.booking_id = b.id
where p.status::text in ('pagado', 'autorizado')
  and bi.provider_id is not null
on conflict (booking_item_id) do nothing;

create or replace function public.release_completed_provider_payouts()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.provider_status::text = 'completada' and old.provider_status is distinct from new.provider_status then
    update public.provider_payouts
       set status = case when available_at <= now() then 'lista_para_pagar' else 'retenida' end
     where booking_item_id = new.id and status = 'retenida';
  end if;
  return new;
end;
$$;

revoke all on function public.release_completed_provider_payouts() from public, anon, authenticated;

drop trigger if exists booking_items_release_provider_payout on public.booking_items;
create trigger booking_items_release_provider_payout
after update of provider_status on public.booking_items
for each row execute function public.release_completed_provider_payouts();

create or replace function public.refresh_due_provider_payouts()
returns integer language plpgsql security invoker set search_path = public
as $$
declare v_count integer;
begin
  update public.provider_payouts pp
     set status = 'lista_para_pagar'
   where pp.status = 'retenida'
     and pp.available_at <= now()
     and exists (
       select 1 from public.booking_items bi
       where bi.id = pp.booking_item_id and bi.provider_status::text = 'completada'
     );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.refresh_due_provider_payouts() from public, anon, authenticated;
grant execute on function public.refresh_due_provider_payouts() to service_role;

do $$
declare v_job_exists boolean := false;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute 'select exists (select 1 from cron.job where jobname = $1)'
      into v_job_exists using 'release-provider-payouts';
    if not v_job_exists then
      perform cron.schedule(
        'release-provider-payouts', '*/15 * * * *',
        'select public.refresh_due_provider_payouts();'
      );
    end if;
  end if;
end;
$$;

alter table public.provider_payout_accounts enable row level security;
alter table public.provider_payouts enable row level security;

revoke all on table public.provider_payout_accounts from anon, authenticated;
revoke all on table public.provider_payouts from anon, authenticated;
grant select, insert, update on table public.provider_payout_accounts to authenticated;
grant select, update on table public.provider_payouts to authenticated;

create policy provider_payout_accounts_select on public.provider_payout_accounts
for select to authenticated using (
  public.current_role() = 'administrador'::public.user_role
  or exists (
    select 1 from public.service_providers sp
    where sp.id = provider_id and sp.owner_id = (select auth.uid())
  )
);

create policy provider_payout_accounts_insert on public.provider_payout_accounts
for insert to authenticated with check (
  exists (
    select 1 from public.service_providers sp
    where sp.id = provider_id and sp.owner_id = (select auth.uid())
  )
);

create policy provider_payout_accounts_update on public.provider_payout_accounts
for update to authenticated using (
  public.current_role() = 'administrador'::public.user_role
  or exists (
    select 1 from public.service_providers sp
    where sp.id = provider_id and sp.owner_id = (select auth.uid())
  )
) with check (
  public.current_role() = 'administrador'::public.user_role
  or exists (
    select 1 from public.service_providers sp
    where sp.id = provider_id and sp.owner_id = (select auth.uid())
  )
);

create policy provider_payouts_select on public.provider_payouts
for select to authenticated using (
  public.current_role() = 'administrador'::public.user_role
  or exists (
    select 1 from public.service_providers sp
    where sp.id = provider_id and sp.owner_id = (select auth.uid())
  )
);

create policy provider_payouts_admin_update on public.provider_payouts
for update to authenticated using (
  public.current_role() = 'administrador'::public.user_role
) with check (
  public.current_role() = 'administrador'::public.user_role
);

-- La mensajería de una reserva solo se habilita después de un pago exitoso.
create or replace function public.can_access_paid_booking_conversation(p_booking_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    where b.id = p_booking_id
      and (
        b.client_id = (select auth.uid())
        or public.current_role() = 'administrador'::public.user_role
        or exists (
          select 1 from public.booking_items bi
          join public.service_providers sp on sp.id = bi.provider_id
          where bi.booking_id = b.id and sp.owner_id = (select auth.uid())
        )
      )
      and exists (
        select 1 from public.payments p
        where p.booking_id = b.id and p.status::text in ('pagado', 'autorizado')
      )
  );
$$;

revoke all on function public.can_access_paid_booking_conversation(uuid) from public, anon;
grant execute on function public.can_access_paid_booking_conversation(uuid) to authenticated;

drop policy if exists conversations_participants_read on public.conversations;
drop policy if exists conversations_client_insert on public.conversations;
drop policy if exists messages_participants_read on public.messages;
drop policy if exists messages_participants_insert on public.messages;

create policy conversations_paid_participants_read on public.conversations
for select to authenticated using (public.can_access_paid_booking_conversation(booking_id));

create policy messages_paid_participants_read on public.messages
for select to authenticated using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and public.can_access_paid_booking_conversation(c.booking_id)
  )
);

create policy messages_paid_participants_insert on public.messages
for insert to authenticated with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and public.can_access_paid_booking_conversation(c.booking_id)
  )
);

revoke insert, update, delete on table public.conversations from authenticated;
revoke update, delete on table public.messages from authenticated;

-- ============================================================================
-- MIGRACIÓN: 20260915193648_fix_push_notification_routing.sql
-- ============================================================================

-- A push endpoint represents one browser/device and must belong to only one
-- authenticated account. Keep the most recently refreshed owner when cleaning
-- historical duplicates created by account switching on the same device.
with ranked_subscriptions as (
  select
    id,
    row_number() over (
      partition by endpoint
      order by updated_at desc nulls last, created_at desc, id desc
    ) as position
  from public.push_subscriptions
)
delete from public.push_subscriptions
where id in (
  select id
  from ranked_subscriptions
  where position > 1
);

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_user_id_endpoint_key;

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_user_endpoint_key;

create unique index if not exists push_subscriptions_endpoint_unique_idx
  on public.push_subscriptions (endpoint);

-- Private delivery ledger used by server routes to make status/message pushes
-- idempotent. It is deliberately inaccessible to browser roles.
create table if not exists public.push_event_deliveries (
  event_key text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists push_event_deliveries_user_created_idx
  on public.push_event_deliveries (user_id, created_at desc);

alter table public.push_event_deliveries enable row level security;

revoke all on table public.push_event_deliveries from anon, authenticated;
grant select, insert, delete on table public.push_event_deliveries to service_role;

-- ============================================================================
-- MIGRACIÓN: 20260921190228_charge_brasa_commission_to_provider.sql
-- ============================================================================

-- Mantiene los precios calculados en PostgreSQL. La comisión se descuenta
-- al prestador; el cliente paga solo la suma de los servicios.
CREATE OR REPLACE FUNCTION public.create_brasa_booking(p_event_name text, p_event_date date, p_event_time time without time zone, p_comuna text, p_address text, p_guests integer, p_budget integer, p_contact_name text, p_contact_email text, p_contact_phone text, p_notes text, p_items jsonb)
 RETURNS TABLE(id uuid, code text, status booking_status, total integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

DECLARE

  v_user_id uuid;

  v_booking public.bookings%rowtype;

  v_item jsonb;

  v_provider public.service_providers%rowtype;
  v_service public.provider_services%rowtype;

  v_guests integer;
  v_quantity numeric;

  v_base_total integer;

  v_grill_selected boolean;
  v_grill_total integer;

  v_transport_selected boolean;
  v_transport_total integer;

  v_shopping_selected boolean;
  v_shopping_total integer;

  v_full_package boolean;

  v_discount integer;

  v_line_subtotal integer;
  v_line_total integer;

  v_subtotal integer := 0;

  v_platform_fee integer := 0;
  v_total integer := 0;

BEGIN

  -- =======================================================
  -- USUARIO
  -- =======================================================

  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION
      'Debes iniciar sesión para reservar.';
  END IF;


  -- =======================================================
  -- VALIDACIONES GENERALES
  -- =======================================================

  v_guests :=
    GREATEST(
      1,
      COALESCE(
        p_guests,
        1
      )
    );


  IF COALESCE(
    TRIM(p_event_name),
    ''
  ) = '' THEN

    RAISE EXCEPTION
      'Ingresa el nombre del evento.';

  END IF;


  IF p_event_date IS NULL THEN

    RAISE EXCEPTION
      'Selecciona la fecha del evento.';

  END IF;


  IF p_event_time IS NULL THEN

    RAISE EXCEPTION
      'Selecciona la hora del evento.';

  END IF;


  IF p_event_date < CURRENT_DATE THEN

    RAISE EXCEPTION
      'No puedes reservar un evento en una fecha pasada.';

  END IF;


  IF COALESCE(
    TRIM(p_address),
    ''
  ) = '' THEN

    RAISE EXCEPTION
      'Ingresa la dirección del evento.';

  END IF;


  IF
    p_items IS NULL
    OR jsonb_typeof(p_items) <> 'array'
    OR jsonb_array_length(p_items) = 0
  THEN

    RAISE EXCEPTION
      'Debes agregar al menos un servicio.';

  END IF;


  -- =======================================================
  -- CREAR RESERVA
  -- =======================================================

  INSERT INTO public.bookings (

    client_id,

    event_name,
    event_date,
    event_time,

    comuna,
    address,

    guests,
    budget,

    subtotal,
    platform_fee,
    total,

    status,

    contact_name,
    contact_email,
    contact_phone,

    notes

  )
  VALUES (

    v_user_id,

    TRIM(
      p_event_name
    ),

    p_event_date,
    p_event_time,

    NULLIF(
      TRIM(
        COALESCE(
          p_comuna,
          ''
        )
      ),
      ''
    ),

    TRIM(
      p_address
    ),

    v_guests,

    GREATEST(
      0,
      COALESCE(
        p_budget,
        0
      )
    ),

    0,
    0,
    0,

    'esperando_confirmacion',

    TRIM(
      p_contact_name
    ),

    TRIM(
      p_contact_email
    ),

    NULLIF(
      TRIM(
        COALESCE(
          p_contact_phone,
          ''
        )
      ),
      ''
    ),

    NULLIF(
      TRIM(
        COALESCE(
          p_notes,
          ''
        )
      ),
      ''
    )

  )

  RETURNING *
  INTO v_booking;


  -- =======================================================
  -- RECORRER SERVICIOS
  -- =======================================================

  FOR v_item IN

    SELECT value
    FROM jsonb_array_elements(
      p_items
    )

  LOOP

    -- =====================================================
    -- RESET VARIABLES
    -- =====================================================

    v_provider := NULL;
    v_service := NULL;

    v_base_total := 0;

    v_grill_selected := false;
    v_grill_total := 0;

    v_transport_selected := false;
    v_transport_total := 0;

    v_shopping_selected := false;
    v_shopping_total := 0;

    v_full_package := false;

    v_discount := 0;

    v_line_subtotal := 0;
    v_line_total := 0;


    -- =====================================================
    -- PRESTADOR
    -- =====================================================

    SELECT sp.*

    INTO v_provider

    FROM public.service_providers sp

    WHERE
      sp.active = true

      AND (

        sp.slug =
          v_item ->> 'providerSlug'

        OR

        sp.id::text =
          v_item ->> 'providerSlug'

      )

    LIMIT 1;


    IF v_provider.id IS NULL THEN

      RAISE EXCEPTION
        'Prestador no encontrado: %',
        v_item ->> 'providerName';

    END IF;


    -- =====================================================
    -- SERVICIO
    -- =====================================================

    SELECT ps.*

    INTO v_service

    FROM public.provider_services ps

    WHERE
      ps.provider_id =
        v_provider.id

      AND ps.active = true

      AND (

        ps.external_key =
          v_item ->> 'serviceKey'

        OR

        ps.id::text =
          v_item ->> 'serviceKey'

      )

    LIMIT 1;


    IF v_service.id IS NULL THEN

      RAISE EXCEPTION
        'Servicio no encontrado: %',
        v_item ->> 'serviceName';

    END IF;


    -- =====================================================
    -- CAPACIDAD
    -- =====================================================

    IF
      v_service.min_guests IS NOT NULL
      AND
      v_guests < v_service.min_guests
    THEN

      RAISE EXCEPTION
        'El servicio % requiere mínimo % personas.',
        v_service.name,
        v_service.min_guests;

    END IF;


    IF
      v_service.max_guests IS NOT NULL
      AND
      v_guests > v_service.max_guests
    THEN

      RAISE EXCEPTION
        'El servicio % permite máximo % personas.',
        v_service.name,
        v_service.max_guests;

    END IF;


    -- =====================================================
    -- DISPONIBILIDAD REAL
    -- =====================================================
    --
    -- Esta es la validación nueva.
    --
    -- Aunque React haya mostrado el horario como disponible,
    -- Supabase vuelve a comprobarlo justo antes de reservar.
    --
    -- Tiene en cuenta:
    --   * prestador
    --   * servicio
    --   * fecha
    --   * hora
    --   * duración
    --   * reservas existentes
    -- =====================================================

    IF NOT public.is_provider_service_available(
      v_provider.id,
      v_service.id,
      p_event_date,
      p_event_time,
      v_guests
    ) THEN

      RAISE EXCEPTION
        'El prestador % ya no está disponible el % a las %.',
        v_provider.business_name,
        p_event_date,
        p_event_time;

    END IF;


    -- =====================================================
    -- PRECIO BASE SEGÚN FORMA DE COBRO
    -- =====================================================

    CASE LOWER(
      TRIM(
        COALESCE(
          v_service.unit,
          'por evento'
        )
      )
    )

      WHEN 'por persona' THEN

        v_quantity := v_guests;

        v_base_total :=
          ROUND(
            v_service.price * v_quantity
          )::integer;


      WHEN 'por hora' THEN

        -- La cantidad facturable corresponde a la duración real
        -- calculada según el número de invitados.
        v_quantity :=
          public.get_service_duration_hours(
            v_service.id,
            v_guests
          );

        v_base_total :=
          ROUND(
            v_service.price * v_quantity
          )::integer;


      WHEN 'por unidad' THEN

        -- El cliente elige la cantidad, pero el precio unitario
        -- siempre se obtiene desde provider_services.
        v_quantity :=
          FLOOR(
            GREATEST(
              1,
              COALESCE(
                NULLIF(
                  v_item ->> 'quantity',
                  ''
                )::numeric,
                1
              )
            )
          );

        v_base_total :=
          ROUND(
            v_service.price * v_quantity
          )::integer;


      WHEN 'por pack' THEN

        v_quantity := 1;
        v_base_total := v_service.price;


      WHEN 'por evento' THEN

        v_quantity := 1;
        v_base_total := v_service.price;


      ELSE

        -- Fallback seguro para servicios antiguos.
        v_quantity := 1;
        v_base_total := v_service.price;

    END CASE;


    -- =====================================================
    -- EXTRAS SOLICITADOS
    -- =====================================================

    v_grill_selected :=
      COALESCE(
        (
          v_item ->>
          'wantsGrill'
        )::boolean,
        false
      );


    v_transport_selected :=
      COALESCE(
        (
          v_item ->>
          'wantsTransport'
        )::boolean,
        false
      );


    v_shopping_selected :=
      COALESCE(
        (
          v_item ->>
          'wantsShopping'
        )::boolean,
        false
      );


    v_full_package :=
      COALESCE(
        (
          v_item ->>
          'fullPackage'
        )::boolean,
        false
      );


    -- =====================================================
    -- FULL BRASA
    -- Activa automáticamente todos los extras disponibles
    -- =====================================================

    IF
      v_full_package
      AND
      COALESCE(
        v_service.full_package_enabled,
        false
      )
    THEN


      IF
        COALESCE(
          v_service.grill_available,
          false
        )
      THEN

        v_grill_selected :=
          true;

      END IF;


      IF
        COALESCE(
          v_service.transport_available,
          false
        )
      THEN

        v_transport_selected :=
          true;

      END IF;


      IF
        COALESCE(
          v_service.shopping_available,
          false
        )
      THEN

        v_shopping_selected :=
          true;

      END IF;


    ELSE

      v_full_package :=
        false;

    END IF;


    -- =====================================================
    -- PARRILLA
    -- =====================================================

    IF
      v_grill_selected
      AND
      COALESCE(
        v_service.grill_available,
        false
      )
    THEN

      v_grill_total :=
        GREATEST(
          0,
          COALESCE(
            v_service.grill_price,
            0
          )
        );

    ELSE

      v_grill_selected :=
        false;

      v_grill_total :=
        0;

    END IF;


    -- =====================================================
    -- TRASLADO
    -- =====================================================

    IF
      v_transport_selected
      AND
      COALESCE(
        v_service.transport_available,
        false
      )
    THEN

      v_transport_total :=
        GREATEST(
          0,
          COALESCE(
            v_service.transport_price,
            0
          )
        );

    ELSE

      v_transport_selected :=
        false;

      v_transport_total :=
        0;

    END IF;


    -- =====================================================
    -- GESTIÓN DE COMPRAS
    -- =====================================================

    IF
      v_shopping_selected
      AND
      COALESCE(
        v_service.shopping_available,
        false
      )
    THEN

      /*
       * Monto fijo:
       * se cobra ahora.
       *
       * Porcentaje:
       * todavía no tenemos el valor real de los productos,
       * por lo que se calculará posteriormente.
       */

      IF
        v_service.shopping_fee_type =
        'fixed'
      THEN

        v_shopping_total :=
          GREATEST(
            0,
            COALESCE(
              v_service.shopping_fee,
              0
            )::integer
          );

      ELSE

        v_shopping_total :=
          0;

      END IF;


    ELSE

      v_shopping_selected :=
        false;

      v_shopping_total :=
        0;

    END IF;


    -- =====================================================
    -- SUBTOTAL LÍNEA
    -- =====================================================

    v_line_subtotal :=

      v_base_total

      +

      v_grill_total

      +

      v_transport_total

      +

      v_shopping_total;


    -- =====================================================
    -- DESCUENTO FULL BRASA
    -- =====================================================

    IF v_full_package THEN


      IF
        v_service.full_package_discount_type =
        'fixed'
      THEN

        v_discount :=
          LEAST(

            v_line_subtotal,

            GREATEST(
              0,
              COALESCE(
                v_service.full_package_discount,
                0
              )::integer
            )

          );


      ELSE

        v_discount :=
          ROUND(

            v_line_subtotal

            *

            (

              GREATEST(

                0,

                LEAST(

                  100,

                  COALESCE(
                    v_service.full_package_discount,
                    0
                  )

                )

              )

              /

              100.0

            )

          )::integer;


      END IF;


    END IF;


    -- =====================================================
    -- TOTAL LÍNEA
    -- =====================================================

    v_line_total :=
      GREATEST(

        0,

        v_line_subtotal -
        v_discount

      );


    -- =====================================================
    -- GUARDAR BOOKING ITEM
    -- =====================================================

    INSERT INTO public.booking_items (

      booking_id,

      provider_id,
      service_id,

      provider_slug,
      provider_name,
      category_slug,

      service_external_key,
      service_name,

      unit,
      unit_price,
      quantity,

      base_service_total,

      grill_selected,
      grill_total,

      transport_selected,
      transport_total,

      shopping_selected,
      shopping_fee_type,
      shopping_fee_value,
      shopping_fee_total,

      full_package,
      discount_total,

      line_total,

      provider_status

    )
    VALUES (

      v_booking.id,

      v_provider.id,
      v_service.id,

      v_provider.slug,
      v_provider.business_name,
      v_provider.category_slug,

      v_service.external_key,
      v_service.name,

      v_service.unit,
      v_service.price,
      v_quantity,

      v_base_total,

      v_grill_selected,
      v_grill_total,

      v_transport_selected,
      v_transport_total,

      v_shopping_selected,

      v_service.shopping_fee_type,

      COALESCE(
        v_service.shopping_fee,
        0
      ),

      v_shopping_total,

      v_full_package,

      v_discount,

      v_line_total,

      'esperando_confirmacion'

    );


    -- =====================================================
    -- SUMAR TOTAL EVENTO
    -- =====================================================

    v_subtotal :=
      v_subtotal +
      v_line_total;


  END LOOP;


  -- =======================================================
  -- COMISIÓN BRASA 10% RETENIDA AL PRESTADOR
  -- =======================================================

  v_platform_fee :=
    ROUND(
      v_subtotal *
      0.10
    )::integer;


  v_total :=
    v_subtotal;


  -- =======================================================
  -- ACTUALIZAR BOOKING
  -- =======================================================

  UPDATE public.bookings b

  SET
    subtotal =
      v_subtotal,

    platform_fee =
      v_platform_fee,

    total =
      v_total,

    status =
      'esperando_confirmacion',

    updated_at =
      NOW()

  WHERE
    b.id =
      v_booking.id;


  -- =======================================================
  -- RESULTADO
  -- =======================================================

  RETURN QUERY

  SELECT
    b.id,
    b.code,
    b.status,
    b.total

  FROM public.bookings b

  WHERE
    b.id =
      v_booking.id;


END;

$function$;

-- Solo corrige cotizaciones antiguas sin ningún intento de pago.
-- No toca transacciones ni reservas con historial de pago.
update public.bookings as b
set platform_fee = round(b.subtotal * 0.10)::integer,
    total = b.subtotal,
    updated_at = now()
where b.subtotal > 0
  and b.total = b.subtotal + b.platform_fee
  and b.platform_fee = round(b.subtotal * 0.08)::integer
  and not exists (select 1 from public.payments p where p.booking_id = b.id);

-- ============================================================================
-- MIGRACIÓN: 20260921191003_persist_message_notifications.sql
-- ============================================================================

-- La bandeja de entrada se alimenta en la misma transacción del mensaje.
-- El push sigue siendo un canal adicional y puede reintentarse por separado.
create or replace function public.notify_message_recipient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_owner_id uuid;
  v_provider_name text;
  v_contact_name text;
  v_recipient_id uuid;
  v_sender_name text;
begin
  select c.client_id, p.owner_id, p.business_name, b.contact_name
    into v_client_id, v_owner_id, v_provider_name, v_contact_name
  from public.conversations c
  join public.service_providers p on p.id = c.provider_id
  left join public.bookings b on b.id = c.booking_id
  where c.id = new.conversation_id;

  if new.sender_id = v_client_id then
    v_recipient_id := v_owner_id;
    v_sender_name := coalesce(nullif(v_contact_name, ''), 'Tu cliente');
  elsif new.sender_id = v_owner_id then
    v_recipient_id := v_client_id;
    v_sender_name := coalesce(nullif(v_provider_name, ''), 'Tu prestador');
  else
    return new;
  end if;

  if v_recipient_id is not null and v_recipient_id <> new.sender_id then
    insert into public.notifications (user_id, type, title, body, href, dedupe_key)
    values (
      v_recipient_id,
      'message',
      'Nuevo mensaje de ' || v_sender_name,
      left(new.body, 160),
      '/mensajes',
      'message:' || new.id::text || ':' || v_recipient_id::text
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.notify_message_recipient() from public, anon, authenticated;

drop trigger if exists messages_notify_recipient on public.messages;
create trigger messages_notify_recipient
after insert on public.messages
for each row execute function public.notify_message_recipient();

-- ============================================================================
-- MIGRACIÓN: 20260922132700_catalog_scraper_service_role_grants.sql
-- ============================================================================

-- The server-side catalog importer uses the service role. Table-level grants
-- are still required even though that role bypasses RLS.
grant select, insert, update on table public.catalog_providers to service_role;
grant select, insert, update on table public.products to service_role;
grant select, insert on table public.product_prices to service_role;

-- ============================================================================
-- MIGRACIÓN: 20260929120631_add_email_delivery_tracking.sql
-- ============================================================================

-- Delivery state belongs to the durable in-app notification. This makes email
-- retries safe without coupling payment confirmation to an external provider.
alter table public.notifications
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_attempts integer not null default 0,
  add column if not exists email_last_error text;

alter table public.notifications
  drop constraint if exists notifications_email_attempts_nonnegative;

alter table public.notifications
  add constraint notifications_email_attempts_nonnegative
  check (email_attempts >= 0) not valid;

alter table public.notifications
  validate constraint notifications_email_attempts_nonnegative;

create or replace function public.record_notification_email_failure(
  p_notification_id uuid,
  p_error text
)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.notifications
     set email_attempts = email_attempts + 1,
         email_last_error = left(p_error, 1000)
   where id = p_notification_id;
$$;

revoke all on function public.record_notification_email_failure(uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_notification_email_failure(uuid, text)
  to service_role;

grant select, insert, update on table public.notifications to service_role;

-- The subscription route reassigns a browser endpoint to the currently logged
-- in account. It uses the server client so account changes cannot be blocked by
-- the previous owner's RLS policy.
grant select, insert, update, delete on table public.push_subscriptions to service_role;

-- ============================================================================
-- MIGRACIÓN: 20260929135656_make_notification_events_idempotent.sql
-- ============================================================================

-- Give booking notifications stable keys so the database trigger, push route
-- and email retry all refer to the same durable notification.
create or replace function public.after_booking_item_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client uuid;
  provider_owner uuid;
begin
  if new.provider_id is null then return new; end if;
  select client_id into client from public.bookings where id = new.booking_id;
  select owner_id into provider_owner from public.service_providers where id = new.provider_id;

  if client is not null then
    insert into public.conversations(booking_id, client_id, provider_id)
    values(new.booking_id, client, new.provider_id)
    on conflict(booking_id, client_id, provider_id) do nothing;
  end if;

  if provider_owner is not null then
    insert into public.notifications(user_id, type, title, body, href, dedupe_key)
    values(
      provider_owner,
      'booking_request',
      'Nueva solicitud de evento',
      new.service_name,
      '/prestador/dashboard#solicitudes',
      'booking-request:' || new.id::text || ':' || provider_owner::text
    )
    on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.after_booking_item_insert() from public, anon, authenticated;

create or replace function public.after_booking_item_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client uuid;
  booking_code text;
begin
  if new.provider_status is distinct from old.provider_status then
    select client_id, code into client, booking_code
      from public.bookings where id = new.booking_id;
    if client is not null then
      insert into public.notifications(user_id, type, title, body, href, dedupe_key)
      values(
        client,
        'booking_status',
        case when new.provider_status = 'confirmada' then 'Solicitud aceptada' else 'Solicitud rechazada' end,
        new.provider_name || ': ' || replace(new.provider_status::text, '_', ' '),
        '/mis-reservas/' || booking_code,
        'booking-status:' || new.id::text || ':' || new.provider_status::text || ':' || client::text
      )
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.after_booking_item_status_change() from public, anon, authenticated;

-- ============================================================================
-- MIGRACIÓN: 20260930173024_improve_booking_notification_events.sql
-- ============================================================================

-- Describe every provider response accurately and create durable notifications
-- for both sides. API workers deliver these rows through push and email.
create or replace function public.after_booking_item_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client uuid;
  booking_code text;
  provider_owner uuid;
  event_title text;
  event_body text;
begin
  if new.provider_status is not distinct from old.provider_status then
    return new;
  end if;

  select b.client_id, b.code into client, booking_code
    from public.bookings b where b.id = new.booking_id;
  select sp.owner_id into provider_owner
    from public.service_providers sp where sp.id = new.provider_id;

  event_title := case new.provider_status::text
    when 'confirmada' then 'Solicitud aceptada'
    when 'rechazada' then 'Solicitud rechazada'
    when 'expirada' then 'Solicitud expirada'
    when 'cancelada' then 'Solicitud cancelada'
    else 'Solicitud actualizada'
  end;
  event_body := new.provider_name || ': ' || replace(new.provider_status::text, '_', ' ');

  if client is not null then
    insert into public.notifications(user_id, type, title, body, href, dedupe_key)
    values(client, 'booking_status', event_title, event_body,
      '/mis-reservas/' || booking_code,
      'booking-status:' || new.id::text || ':' || new.provider_status::text || ':' || client::text)
    on conflict do nothing;
  end if;

  if provider_owner is not null and new.provider_status::text in ('expirada', 'cancelada') then
    insert into public.notifications(user_id, type, title, body, href, dedupe_key)
    values(provider_owner, 'booking_status', event_title,
      new.service_name || ': ' || replace(new.provider_status::text, '_', ' '),
      '/prestador/dashboard#solicitudes',
      'booking-status:' || new.id::text || ':' || new.provider_status::text || ':' || provider_owner::text)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.after_booking_item_status_change() from public, anon, authenticated;

-- ============================================================================
-- MIGRACIÓN: 20260930183442_grant_notification_worker_access.sql
-- ============================================================================

-- Server-side notification workers use the service-role client, but restored
-- projects may not retain explicit table privileges even though RLS is bypassed.
-- Grant only the reads needed to resolve recipients and build payment receipts.
grant usage on schema public to service_role;

grant select on table public.profiles to service_role;
grant select on table public.bookings to service_role;
grant select on table public.booking_items to service_role;
grant select on table public.service_providers to service_role;
grant select on table public.payments to service_role;

grant select, insert, update on table public.notifications to service_role;
grant select, insert, update, delete on table public.push_subscriptions to service_role;

-- ============================================================================
-- MIGRACIÓN: 20261005185902_harden_internal_database_functions.sql
-- ============================================================================

-- These functions are trigger helpers or authenticated account bootstrap
-- helpers. They must not be callable as anonymous REST RPC endpoints.
alter function public.touch_updated_at() set search_path = '';

revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.refresh_booking_status_from_items() from public, anon, authenticated;
revoke execute on function public.refresh_provider_rating() from public, anon, authenticated;

-- Profile bootstrap is intentionally available only to a signed-in user. The
-- function validates auth.uid() internally and never accepts a target user id.
revoke execute on function public.ensure_my_profile() from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;

-- Keep future functions private by default. Public RPCs must be explicitly
-- granted to anon/authenticated in the migration that defines them.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- ============================================================================
-- MIGRACIÓN: 20261005194000_protect_profile_sensitive_fields.sql
-- ============================================================================

create or replace function public.protect_profile_sensitive_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- A signed-in user may edit their contact details, but never elevate their
  -- own role, reactivate their account, or replace the authenticated email.
  if auth.uid() = old.id and old.role <> 'administrador' then
    new.role := old.role;
    new.active := old.active;
    new.email := old.email;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_sensitive_fields on public.profiles;
create trigger profiles_protect_sensitive_fields
before update on public.profiles
for each row
execute function public.protect_profile_sensitive_fields();

revoke execute on function public.protect_profile_sensitive_fields() from public, anon, authenticated;

