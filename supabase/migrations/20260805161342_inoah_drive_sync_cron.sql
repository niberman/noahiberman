-- Hourly Drive sync trigger. Lives in a migration rather than the dashboard so
-- the schedule is version-controlled. The bearer never appears here: pg_cron
-- reads it from Vault at call time. Seed Vault once, in the SQL editor, with
-- the SYNC_SECRET value already set on the edge function:
--   select vault.create_secret('<SYNC_SECRET value>', 'sync_secret');
-- Until that row exists the header is malformed and the function answers 401,
-- which fails closed.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- pg_cron treats schedule() with an existing jobname as an update, but older
-- versions error, so drop first either way.
do $$
begin
  perform cron.unschedule('inoah-drive-sync-hourly');
exception when others then
  null;
end;
$$;

select cron.schedule(
  'inoah-drive-sync-hourly',
  '17 * * * *',
  $$
  select net.http_post(
    url := 'https://yvblwphbfekmmpoxowjr.supabase.co/functions/v1/inoah-sync-drive',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'sync_secret'),
        'vault-secret-missing'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
