
CREATE POLICY "workers read own screening reports" ON public.screening_reports FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.screening_orders o
    JOIN public.workers w ON w.id = o.worker_id
    WHERE o.id = screening_reports.order_id AND w.user_id = auth.uid()
  ));

CREATE POLICY "workers read own screening orders" ON public.screening_orders FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workers w
    WHERE w.id = screening_orders.worker_id AND w.user_id = auth.uid()
  ));

CREATE POLICY "workers read own screening consents" ON public.screening_consents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workers w
    WHERE w.id = screening_consents.worker_id AND w.user_id = auth.uid()
  ));
