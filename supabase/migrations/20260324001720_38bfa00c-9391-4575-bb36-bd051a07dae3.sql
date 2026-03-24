
SELECT cron.schedule(
  'send-reminder-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nwyjqphqszonzlulezsq.supabase.co/functions/v1/send-reminder',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53eWpxcGhxc3pvbnpsdWxlenNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTg0OTUsImV4cCI6MjA4OTU5NDQ5NX0.hfKgD7Od9EhORBLR6wAiPMu3pFbYbL26wB1FMd_m0AM"}'::jsonb,
    body := '{"time": "now"}'::jsonb
  ) AS request_id;
  $$
);
