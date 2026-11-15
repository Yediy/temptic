DROP POLICY IF EXISTS ccu_agency_all ON public.cc_client_users;
CREATE POLICY ccu_agency_all ON public.cc_client_users FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.agency_members am
  WHERE am.user_id = auth.uid() AND am.agency_id = cc_client_users.agency_id AND am.is_active))
WITH CHECK (
  EXISTS (SELECT 1 FROM public.agency_members am
    WHERE am.user_id = auth.uid() AND am.agency_id = cc_client_users.agency_id AND am.is_active
      AND am.role IN ('agency_owner','agency_admin','account_manager'))
  AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = cc_client_users.client_id AND c.agency_id = cc_client_users.agency_id)
  AND cc_client_users.user_id IS DISTINCT FROM auth.uid()
);

DROP POLICY IF EXISTS "ar readable" ON public.woic_api_registry;
CREATE POLICY "ar readable" ON public.woic_api_registry FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.is_active)
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'));

DROP POLICY IF EXISTS "sr readable" ON public.woic_service_registry;
CREATE POLICY "sr readable" ON public.woic_service_registry FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.is_active)
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'));

DROP POLICY IF EXISTS woic_node_types_read ON public.woic_graph_node_types;
CREATE POLICY woic_node_types_read ON public.woic_graph_node_types FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.is_active)
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'));

DROP POLICY IF EXISTS woic_relation_types_read ON public.woic_graph_relation_types;
CREATE POLICY woic_relation_types_read ON public.woic_graph_relation_types FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.is_active)
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'));