
CREATE OR REPLACE FUNCTION public.has_module_access(_user_id uuid, _module text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.role_permissions rp ON rp.role = ur.role WHERE ur.user_id = _user_id AND rp.module = _module);
$$;
REVOKE EXECUTE ON FUNCTION public.has_module_access(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_module_access(uuid, text) TO authenticated, service_role;
