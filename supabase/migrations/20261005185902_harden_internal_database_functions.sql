-- These functions are trigger helpers or authenticated account bootstrap
-- helpers. They must not be callable as anonymous REST RPC endpoints.
alter function public.touch_updated_at() set search_path = '';

revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.refresh_booking_status_from_items() from public, anon, authenticated;
revoke execute on function public.refresh_provider_rating() from public, anon, authenticated;

-- Profile bootstrap is intentionally available only to a signed-in user. The
-- function validates auth.uid() internally and never accepts a target user id.
revoke execute on function public.ensure_my_profile() from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;

-- Keep future functions private by default. Public RPCs must be explicitly
-- granted to anon/authenticated in the migration that defines them.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
