-- Evidencia del consentimiento informado mostrado antes de iniciar Webpay.
-- La escritura ocurre exclusivamente desde el servidor con service_role.
create table public.booking_terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  client_id uuid not null references public.profiles(id) on delete restrict,
  terms_version text not null,
  accepted_total integer not null check (accepted_total > 0),
  policy_snapshot jsonb not null,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (booking_id, client_id, terms_version)
);

create index booking_terms_acceptances_client_accepted_idx
  on public.booking_terms_acceptances (client_id, accepted_at desc);

alter table public.booking_terms_acceptances enable row level security;
revoke all on table public.booking_terms_acceptances from anon, authenticated;
grant select on table public.booking_terms_acceptances to authenticated;
grant select, insert on table public.booking_terms_acceptances to service_role;

create policy booking_terms_acceptances_owner_read
on public.booking_terms_acceptances
for select
to authenticated
using (
  client_id = (select auth.uid())
  or public.current_role() = 'administrador'::public.user_role
);
