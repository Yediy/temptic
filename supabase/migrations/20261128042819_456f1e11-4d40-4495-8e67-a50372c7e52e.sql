ALTER FUNCTION public.create_tto_contract(uuid,text,uuid,uuid,uuid,text,numeric,numeric,text,date,date) SET SCHEMA private;
ALTER FUNCTION public.create_tto_assignment(uuid,uuid,date,date) SET SCHEMA private;
ALTER FUNCTION public.create_contracted_time_ticket(uuid,date,timestamptz,timestamptz) SET SCHEMA private;
CREATE FUNCTION public.create_tto_contract(_agency_id uuid,_reference text,_client_id uuid,_site_id uuid,_supervisor_id uuid,_work_details text,_pay_rate numeric,_bill_rate numeric,_currency text,_starts_on date,_ends_on date)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$ SELECT private.create_tto_contract(_agency_id,_reference,_client_id,_site_id,_supervisor_id,_work_details,_pay_rate,_bill_rate,_currency,_starts_on,_ends_on); $$;
CREATE FUNCTION public.create_tto_assignment(_contract_id uuid,_worker_id uuid,_starts_on date,_ends_on date)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$ SELECT private.create_tto_assignment(_contract_id,_worker_id,_starts_on,_ends_on); $$;
CREATE FUNCTION public.create_contracted_time_ticket(_assignment_id uuid,_work_date date,_actual_start timestamptz DEFAULT NULL,_actual_end timestamptz DEFAULT NULL)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$ SELECT private.create_contracted_time_ticket(_assignment_id,_work_date,_actual_start,_actual_end); $$;
REVOKE ALL ON FUNCTION public.create_tto_contract(uuid,text,uuid,uuid,uuid,text,numeric,numeric,text,date,date),public.create_tto_assignment(uuid,uuid,date,date),public.create_contracted_time_ticket(uuid,date,timestamptz,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_tto_contract(uuid,text,uuid,uuid,uuid,text,numeric,numeric,text,date,date),public.create_tto_assignment(uuid,uuid,date,date),public.create_contracted_time_ticket(uuid,date,timestamptz,timestamptz) TO authenticated;
NOTIFY pgrst,'reload schema';