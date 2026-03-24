
-- Fix: Block all writes on user_roles for non-service-role callers
CREATE POLICY "Block user_roles insert"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY "Block user_roles update"
ON public.user_roles FOR UPDATE TO authenticated
USING (false);

CREATE POLICY "Block user_roles delete"
ON public.user_roles FOR DELETE TO authenticated
USING (false);

-- Fix: Block all writes on agency_members for non-service-role callers
CREATE POLICY "Block agency_members insert"
ON public.agency_members FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY "Block agency_members update"
ON public.agency_members FOR UPDATE TO authenticated
USING (false);

CREATE POLICY "Block agency_members delete"
ON public.agency_members FOR DELETE TO authenticated
USING (false);
