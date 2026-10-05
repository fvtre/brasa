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
