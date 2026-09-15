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
