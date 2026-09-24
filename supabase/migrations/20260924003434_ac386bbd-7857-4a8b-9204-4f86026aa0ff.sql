DROP POLICY IF EXISTS "role_permissions_read_all" ON public.role_permissions;

CREATE POLICY "role_permissions_read_own_roles"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  private.current_user_has_role(role)
  OR private.current_user_has_role('super_admin'::public.app_role)
);