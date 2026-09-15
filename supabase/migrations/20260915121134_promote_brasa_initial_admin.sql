do $$
begin
  update public.profiles
  set
    role = 'administrador'::public.user_role,
    updated_at = now()
  where id = '35700bdd-facf-44dd-b153-f3ab8365a013'::uuid
    and lower(email) = lower('berfeladrimole@gmail.com');

  if not found then
    raise exception 'No se encontró la cuenta autorizada para promoción administrativa.';
  end if;
end;
$$;
