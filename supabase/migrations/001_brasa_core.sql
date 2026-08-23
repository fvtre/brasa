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
