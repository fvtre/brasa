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
