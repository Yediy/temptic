
-- Create storage bucket for ticket assets (signatures, PDFs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-assets', 'ticket-assets', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for ticket-assets bucket
CREATE POLICY "Agency uploads ticket assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-assets');

CREATE POLICY "Agency reads ticket assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ticket-assets');
