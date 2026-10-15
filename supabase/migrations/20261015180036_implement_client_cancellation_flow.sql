-- Cancelaciones iniciadas por clientes y reembolsos Webpay.
-- El registro se crea antes de llamar a Transbank y permite reintentar la
-- finalización sin ejecutar dos veces el reembolso externo.
create table public.booking_cancellations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  payment_id uuid not null references public.payments(id) on delete restrict,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'procesando'
    check (status in ('procesando', 'enviando_reembolso', 'reembolso_confirmado', 'completada', 'fallida')),
  policy_code text not null
    check (policy_code in ('mas_7_dias', '72_horas_a_7_dias', '24_a_72_horas', 'menos_24_horas')),
  hours_before_event numeric(12, 2) not null,
  original_amount integer not null check (original_amount >= 0),
  refund_amount integer not null check (refund_amount >= 0),
  retained_amount integer not null check (retained_amount >= 0),
  provider_compensation integer not null check (provider_compensation >= 0),
  platform_fee integer not null check (platform_fee >= 0),
  reason text,
  gateway_response jsonb not null default '{}'::jsonb,
  failure_reason text,
  refund_confirmed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (refund_amount + retained_amount = original_amount),
  check (provider_compensation + platform_fee = retained_amount)
);

create index booking_cancellations_status_created_idx
  on public.booking_cancellations(status, created_at desc);

drop trigger if exists booking_cancellations_touch on public.booking_cancellations;
create trigger booking_cancellations_touch
before update on public.booking_cancellations
for each row execute function public.touch_updated_at();

alter table public.booking_cancellations enable row level security;
revoke all on table public.booking_cancellations from anon, authenticated;
grant select on table public.booking_cancellations to authenticated;
grant select, insert, update on table public.booking_cancellations to service_role;
grant select, update on table public.bookings to service_role;
grant select, update on table public.booking_items to service_role;
grant select, update on table public.payments to service_role;
grant select, update on table public.provider_payouts to service_role;

create policy booking_cancellations_participant_read
on public.booking_cancellations
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings b
    where b.id = booking_id
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

-- Finaliza localmente una cancelación después de que Webpay confirmó la
-- devolución. Solo service_role puede invocarla. La función es idempotente.
create or replace function public.finalize_client_booking_cancellation(
  p_cancellation_id uuid,
  p_gateway_response jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  cancellation_row public.booking_cancellations%rowtype;
  payment_status_text text;
begin
  select * into cancellation_row
  from public.booking_cancellations
  where id = p_cancellation_id
  for update;

  if not found then
    raise exception 'Cancelación no encontrada.';
  end if;

  if cancellation_row.status = 'completada' then
    return jsonb_build_object(
      'ok', true,
      'already_completed', true,
      'booking_id', cancellation_row.booking_id
    );
  end if;

  if cancellation_row.status <> 'reembolso_confirmado' then
    raise exception 'El reembolso todavía no fue confirmado.';
  end if;

  update public.booking_items
     set provider_status = 'cancelada'
   where booking_id = cancellation_row.booking_id
     and provider_status::text not in ('cancelada', 'rechazada', 'expirada', 'completada');

  update public.bookings
     set status = 'cancelada', payment_due_at = null
   where id = cancellation_row.booking_id;

  insert into public.provider_payouts(
    booking_id, booking_item_id, provider_id, payment_id,
    gross_amount, platform_fee, status, available_at
  )
  select
    bi.booking_id, bi.id, bi.provider_id, cancellation_row.payment_id,
    bi.line_total, round(bi.line_total * 0.10)::integer, 'retenida', now()
  from public.booking_items bi
  where bi.booking_id = cancellation_row.booking_id
    and bi.provider_id is not null
  on conflict (booking_item_id) do nothing;

  update public.provider_payouts pp
     set gross_amount = round(
           bi.line_total::numeric
           * cancellation_row.retained_amount::numeric
           / greatest(cancellation_row.original_amount, 1)
         )::integer,
         platform_fee = round(
           bi.line_total::numeric
           * cancellation_row.platform_fee::numeric
           / greatest(cancellation_row.original_amount, 1)
         )::integer,
         status = case
           when cancellation_row.provider_compensation > 0 then 'lista_para_pagar'
           else 'reembolsada'
         end,
         available_at = now(),
         admin_notes = concat_ws(E'\n', nullif(pp.admin_notes, ''),
           'Ajuste automático por cancelación del cliente. Política: ' || cancellation_row.policy_code)
    from public.booking_items bi
   where pp.booking_item_id = bi.id
     and pp.booking_id = cancellation_row.booking_id
     and pp.status <> 'pagada';

  if cancellation_row.refund_amount = cancellation_row.original_amount then
    payment_status_text := 'reembolsado';
  elsif cancellation_row.refund_amount > 0 then
    payment_status_text := 'parcialmente_reembolsado';
  else
    payment_status_text := null;
  end if;

  update public.payments
     set status = coalesce(payment_status_text::public.payment_status, status),
         metadata = metadata || jsonb_build_object(
           'cancellation_id', cancellation_row.id,
           'refund_amount', cancellation_row.refund_amount,
           'cancellation_policy', cancellation_row.policy_code,
           'refund_response', coalesce(p_gateway_response, '{}'::jsonb)
         )
   where id = cancellation_row.payment_id;

  update public.booking_cancellations
     set status = 'completada',
         gateway_response = coalesce(p_gateway_response, '{}'::jsonb),
         completed_at = now(),
         failure_reason = null
   where id = cancellation_row.id;

  return jsonb_build_object(
    'ok', true,
    'booking_id', cancellation_row.booking_id,
    'refund_amount', cancellation_row.refund_amount,
    'provider_compensation', cancellation_row.provider_compensation,
    'platform_fee', cancellation_row.platform_fee
  );
end;
$$;

revoke all on function public.finalize_client_booking_cancellation(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.finalize_client_booking_cancellation(uuid, jsonb)
  to service_role;
