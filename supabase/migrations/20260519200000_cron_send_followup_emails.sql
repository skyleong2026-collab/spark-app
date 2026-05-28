-- Cron job: trigger send-followup-emails Edge Function every 6 hours
--
-- PREREQUISITES (do once in Supabase Dashboard > Database > Extensions):
--   1. Enable "pg_cron"
--   2. Enable "pg_net"
--
-- BEFORE applying this migration, store your service role key as a DB setting:
--   ALTER DATABASE postgres SET app.settings.supabase_service_role_key = '<your_service_role_key>';
--   (Find it in Supabase Dashboard > Project Settings > API > service_role key)
--
-- Also ensure the Edge Function is deployed with --no-verify-jwt so the cron
-- call doesn't need a user JWT:
--   npx supabase functions deploy send-followup-emails --no-verify-jwt
--   npx supabase functions deploy record-followup-response --no-verify-jwt

select cron.schedule(
  'send-followup-emails',                 -- job name (unique)
  '0 */6 * * *',                          -- every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)
  $$
  select net.http_post(
    url     := 'https://hbazhbfhddaouxchvuxr.supabase.co/functions/v1/send-followup-emails',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key', true)
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) as request_id;
  $$
);
