-- Supabase Cron usa pg_cron para liberar reservas cuyo pago fue abandonado.
create extension if not exists pg_cron;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
    from cron.job
   where jobname = 'expire-stale-webpay-payments'
   limit 1;

  if v_job_id is null then
    perform cron.schedule(
      'expire-stale-webpay-payments',
      '* * * * *',
      'select public.expire_stale_webpay_payments();'
    );
  end if;
end;
$$;
