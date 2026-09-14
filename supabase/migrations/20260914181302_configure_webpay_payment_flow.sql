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
