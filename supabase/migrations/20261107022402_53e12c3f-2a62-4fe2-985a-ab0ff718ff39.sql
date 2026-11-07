DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='ttos_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ttos_events;
  END IF;
END $$;