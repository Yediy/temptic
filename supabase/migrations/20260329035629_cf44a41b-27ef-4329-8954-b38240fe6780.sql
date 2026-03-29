
-- Allow super_admin to read all agencies (not just their own)
CREATE POLICY "Super admin reads all agencies"
  ON public.agencies
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super_admin to read all notifications
CREATE POLICY "Super admin reads all notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super_admin to read all tickets (for admin search)
CREATE POLICY "Super admin reads all tickets"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));
