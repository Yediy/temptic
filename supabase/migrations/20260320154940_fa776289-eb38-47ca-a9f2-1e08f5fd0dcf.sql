
-- Drop the overly permissive policy
DROP POLICY "Authenticated users create agencies" ON public.agencies;

-- Create a security definer function for agency registration
CREATE OR REPLACE FUNCTION public.register_agency(
  _agency_name TEXT,
  _user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _agency_id UUID;
  _existing UUID;
BEGIN
  -- Check if user already has an agency
  SELECT agency_id INTO _existing FROM public.agency_members WHERE user_id = _user_id LIMIT 1;
  IF _existing IS NOT NULL THEN
    RETURN _existing;
  END IF;

  -- Create agency
  INSERT INTO public.agencies (name) VALUES (_agency_name) RETURNING id INTO _agency_id;

  -- Link user as admin
  INSERT INTO public.agency_members (agency_id, user_id, role) VALUES (_agency_id, _user_id, 'agency_admin');

  -- Assign role
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'agency_admin');

  RETURN _agency_id;
END;
$$;
