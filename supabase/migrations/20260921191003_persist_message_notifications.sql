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
