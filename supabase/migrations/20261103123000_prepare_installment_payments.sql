-- Estructura aditiva para anticipo 30% y saldo 70%. Esta migración no activa
-- por sí sola el cobro dividido: primero se despliega el flujo transaccional.
alter table public.payments
  add column if not exists payment_stage text not null default 'full'
    check (payment_stage in ('deposit', 'balance', 'full'));

alter table public.bookings
  add column if not exists payment_plan text not null default 'legacy_full'
    check (payment_plan in ('legacy_full', 'deposit_balance')),
  add column if not exists balance_due_at timestamptz;

alter table public.booking_cancellations
  drop constraint if exists booking_cancellations_policy_code_check;
alter table public.booking_cancellations
  add constraint booking_cancellations_policy_code_check
  check (policy_code in (
    'retracto_legal', 'anticipo_retenido', 'mas_7_dias',
    '72_horas_a_7_dias', '24_a_72_horas', 'menos_24_horas'
  ));

create index if not exists bookings_balance_due_idx
  on public.bookings (balance_due_at)
  where payment_plan = 'deposit_balance'
    and balance_due_at is not null
    and status in ('confirmada', 'esperando_pago');

-- Una cancelación puede involucrar más de una transacción Webpay. Cada
-- devolución queda registrada e idempotente por pago.
create table public.booking_cancellation_refunds (
  id uuid primary key default gen_random_uuid(),
  cancellation_id uuid not null references public.booking_cancellations(id) on delete restrict,
  payment_id uuid not null references public.payments(id) on delete restrict,
  requested_amount integer not null check (requested_amount >= 0),
  refunded_amount integer not null default 0 check (refunded_amount >= 0),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'enviando', 'confirmada', 'fallida')),
  gateway_response jsonb not null default '{}'::jsonb,
  failure_reason text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cancellation_id, payment_id),
  check (refunded_amount <= requested_amount)
);

create index booking_cancellation_refunds_status_idx
  on public.booking_cancellation_refunds (status, created_at);

drop trigger if exists booking_cancellation_refunds_touch on public.booking_cancellation_refunds;
create trigger booking_cancellation_refunds_touch
before update on public.booking_cancellation_refunds
for each row execute function public.touch_updated_at();

alter table public.booking_cancellation_refunds enable row level security;
revoke all on table public.booking_cancellation_refunds from anon, authenticated;
grant select on table public.booking_cancellation_refunds to authenticated;
grant select, insert, update on table public.booking_cancellation_refunds to service_role;

create policy booking_cancellation_refunds_participant_read
on public.booking_cancellation_refunds
for select
to authenticated
using (
  exists (
    select 1
    from public.booking_cancellations bc
    join public.bookings b on b.id = bc.booking_id
    where bc.id = cancellation_id
      and (
        b.client_id = (select auth.uid())
        or public.current_role() = 'administrador'::public.user_role
        or exists (
          select 1
          from public.booking_items bi
          join public.service_providers sp on sp.id = bi.provider_id
          where bi.booking_id = b.id
            and sp.owner_id = (select auth.uid())
        )
      )
  )
);

-- Confirma cada etapa sin considerar pagada la reserva completa después del
-- anticipo. El saldo queda exigible cinco días antes del evento.
create or replace function public.finalize_webpay_payment(
  p_token text, p_buy_order text, p_amount integer, p_response jsonb
)
returns table (booking_id uuid, booking_code text)
language plpgsql security invoker set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_booking public.bookings%rowtype;
  v_balance_due_at timestamptz;
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
    if v_payment.payment_stage <> 'balance' then
      update public.bookings set status = 'pago_expirado', updated_at = now() where id = v_booking.id;
    end if;
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

  if v_payment.payment_stage = 'deposit' then
    v_balance_due_at :=
      ((v_booking.event_date::text || ' ' || v_booking.event_time::text)::timestamp
        at time zone 'America/Santiago') - interval '5 days';
    update public.bookings
       set status = 'confirmada', payment_due_at = null,
           balance_due_at = v_balance_due_at, updated_at = now()
     where id = v_booking.id;
  else
    update public.bookings
       set status = 'confirmada', payment_due_at = null,
           balance_due_at = null, updated_at = now()
     where id = v_booking.id;
  end if;

  return query select v_booking.id, v_booking.code;
end;
$$;

revoke all on function public.finalize_webpay_payment(text, text, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.finalize_webpay_payment(text, text, integer, jsonb)
  to service_role;

-- Un intento fallido de saldo no libera la agenda; el cliente puede volver a
-- intentarlo antes del vencimiento. El anticipo inicial sí conserva la regla
-- de los diez minutos.
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
    if v_payment.payment_stage <> 'balance' then
      update public.booking_items
         set provider_status = 'expirada', updated_at = now()
       where booking_id = v_payment.booking_id
         and provider_status not in ('cancelada', 'rechazada', 'expirada');
      update public.bookings
         set status = 'pago_expirado', updated_at = now()
       where id = v_payment.booking_id;
    end if;
  end if;
  return v_code;
end;
$$;

revoke all on function public.fail_webpay_payment(text) from public, anon, authenticated;
grant execute on function public.fail_webpay_payment(text) to service_role;

-- No se crea liquidación por el anticipo mientras la reserva siga vigente.
-- El pago del saldo (o un pago total) crea una única liquidación completa.
create or replace function public.create_provider_payouts_for_payment()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status::text not in ('pagado', 'autorizado')
     or new.payment_stage = 'deposit'
     or (tg_op = 'UPDATE' and old.status::text in ('pagado', 'autorizado')) then
    return new;
  end if;

  insert into public.provider_payouts(
    booking_id, booking_item_id, provider_id, payment_id,
    gross_amount, platform_fee, status, available_at
  )
  select
    bi.booking_id, bi.id, bi.provider_id, new.id, bi.line_total,
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
  where bi.booking_id = new.booking_id and bi.provider_id is not null
  on conflict (booking_item_id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_provider_payouts_for_payment()
  from public, anon, authenticated;

-- Al vencer el saldo se libera la agenda y el anticipo se distribuye:
-- 90% prestador, 10% Brasa. La operación es idempotente por booking_item_id.
create or replace function public.expire_overdue_booking_balances()
returns integer language plpgsql security invoker set search_path = public
as $$
declare v_count integer;
begin
  with overdue as (
    select b.id
    from public.bookings b
    where b.payment_plan = 'deposit_balance'
      and b.status = 'confirmada'::public.booking_status
      and b.balance_due_at is not null
      and b.balance_due_at <= now()
      and exists (
        select 1 from public.payments p
        where p.booking_id = b.id and p.payment_stage = 'deposit'
          and p.status in ('pagado', 'autorizado')
      )
      and not exists (
        select 1 from public.payments p
        where p.booking_id = b.id and p.payment_stage in ('balance', 'full')
          and p.status in ('pagado', 'autorizado')
      )
    for update skip locked
  ), expired_items as (
    update public.booking_items bi
       set provider_status = 'expirada'::public.booking_status, updated_at = now()
     where bi.booking_id in (select id from overdue)
       and bi.provider_status not in ('cancelada', 'rechazada', 'expirada', 'completada')
    returning bi.booking_id
  ), expired_bookings as (
    update public.bookings b
       set status = 'pago_expirado'::public.booking_status,
           balance_due_at = null, payment_due_at = null, updated_at = now()
     where b.id in (select id from overdue)
    returning b.id
  )
  select count(*) into v_count from expired_bookings;

  insert into public.provider_payouts(
    booking_id, booking_item_id, provider_id, payment_id,
    gross_amount, platform_fee, status, available_at, admin_notes
  )
  select
    bi.booking_id, bi.id, bi.provider_id, p.id,
    round(p.amount::numeric * bi.line_total::numeric / greatest(b.total, 1))::integer,
    round((p.amount::numeric * bi.line_total::numeric / greatest(b.total, 1)) * 0.10)::integer,
    'lista_para_pagar', now(),
    'Compensación automática: saldo no pagado cinco días antes del evento.'
  from public.bookings b
  join public.booking_items bi on bi.booking_id = b.id and bi.provider_id is not null
  join public.payments p on p.booking_id = b.id
    and p.payment_stage = 'deposit' and p.status in ('pagado', 'autorizado')
  where b.status = 'pago_expirado'::public.booking_status
    and not exists (
      select 1 from public.provider_payouts pp where pp.booking_item_id = bi.id
    )
  on conflict (booking_item_id) do nothing;

  return v_count;
end;
$$;

revoke all on function public.expire_overdue_booking_balances()
  from public, anon, authenticated;
grant execute on function public.expire_overdue_booking_balances()
  to service_role;
