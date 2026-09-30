-- Server-side notification workers use the service-role client, but restored
-- projects may not retain explicit table privileges even though RLS is bypassed.
-- Grant only the reads needed to resolve recipients and build payment receipts.
grant usage on schema public to service_role;

grant select on table public.profiles to service_role;
grant select on table public.bookings to service_role;
grant select on table public.booking_items to service_role;
grant select on table public.service_providers to service_role;
grant select on table public.payments to service_role;

grant select, insert, update on table public.notifications to service_role;
grant select, insert, update, delete on table public.push_subscriptions to service_role;
