-- pg_cron job: call send-followup-emails Edge Function daily at 9am UTC
--
-- Prerequisites before applying:
--   ALTER DATABASE postgres SET app.service_role_key = '<your service role key>';
--
-- Apply via Supabase dashboard → SQL Editor, or via psql.

SELECT cron.schedule(
  'spark-followup-emails',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hbazhbfhddaouxchvuxr.supabase.co/functions/v1/send-followup-emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
