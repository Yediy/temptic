
-- Allow authenticated users to insert agencies (for registration)
CREATE POLICY "Authenticated users create agencies" ON public.agencies FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to insert their own agency membership
CREATE POLICY "Users insert own agency membership" ON public.agency_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to insert their own roles
CREATE POLICY "Users insert own roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
