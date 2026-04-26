-- 1. Add is_demo flag to agencies
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- 2. Helper functions
CREATE OR REPLACE FUNCTION public.is_demo_agency(_agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_demo FROM public.agencies WHERE id = _agency_id), false)
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_demo()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_members am
    JOIN public.agencies a ON a.id = am.agency_id
    WHERE am.user_id = auth.uid() AND am.is_active = true AND a.is_demo = true
  )
$$;

-- 3. Seed demo agency (idempotent: only insert if no demo agency exists)
DO $$
DECLARE
  _agency_id uuid;
  _client1_id uuid;
  _client2_id uuid;
  _site1_id uuid;
  _site2_id uuid;
  _signer1_id uuid;
  _signer2_id uuid;
  _worker1_id uuid;
  _worker2_id uuid;
  _worker3_id uuid;
  _ticket_signed uuid;
  _ticket_weekly uuid;
  _ticket_rejected uuid;
  _ticket_closed uuid;
BEGIN
  -- Skip if a demo agency already exists
  SELECT id INTO _agency_id FROM public.agencies WHERE is_demo = true LIMIT 1;
  IF _agency_id IS NOT NULL THEN
    RAISE NOTICE 'Demo agency already exists: %', _agency_id;
    RETURN;
  END IF;

  -- Agency
  INSERT INTO public.agencies (name, branch_name, email, phone, address_line1, city, state, zip, is_demo)
  VALUES ('Prime Staffing Group', 'Demo Branch', 'demo@primestaffing.example', '(555) 010-2000', '100 Demo Plaza', 'Houston', 'TX', '77001', true)
  RETURNING id INTO _agency_id;

  -- Agency settings
  INSERT INTO public.agency_settings (agency_id, default_ticket_type, default_start_time)
  VALUES (_agency_id, 'daily', '07:00:00');

  -- Ticket counter starting point
  INSERT INTO public.ticket_counters (agency_id, current_year, last_number)
  VALUES (_agency_id, EXTRACT(YEAR FROM now())::int, 1042);

  -- Clients
  INSERT INTO public.clients (agency_id, company_name, billing_name, billing_email, billing_phone)
  VALUES (_agency_id, 'Metro Logistics', 'Metro Logistics AP', 'ap@metrologistics.example', '(555) 010-3001')
  RETURNING id INTO _client1_id;

  INSERT INTO public.clients (agency_id, company_name, billing_name, billing_email, billing_phone)
  VALUES (_agency_id, 'Apex Construction', 'Apex Construction Billing', 'billing@apexconstruction.example', '(555) 010-3002')
  RETURNING id INTO _client2_id;

  -- Sites
  INSERT INTO public.client_sites (client_id, site_name, site_code, address_line1, city, state, zip, report_to_name, report_to_phone)
  VALUES (_client1_id, 'Distribution Center 4', 'DC-04', '4400 Industrial Pkwy', 'Houston', 'TX', '77032', 'Maria Gomez', '(555) 010-4001')
  RETURNING id INTO _site1_id;

  INSERT INTO public.client_sites (client_id, site_name, site_code, address_line1, city, state, zip, report_to_name, report_to_phone)
  VALUES (_client2_id, 'Tower B Job Site', 'JOB-B', '900 Skyline Blvd', 'Sugar Land', 'TX', '77478', 'Derrick Hall', '(555) 010-4002')
  RETURNING id INTO _site2_id;

  -- Signers
  INSERT INTO public.client_signers (client_id, site_id, first_name, last_name, title, email, phone, initials)
  VALUES (_client1_id, _site1_id, 'Maria', 'Gomez', 'Operations Supervisor', 'maria.gomez@metrologistics.example', '(555) 010-4001', 'MG')
  RETURNING id INTO _signer1_id;

  INSERT INTO public.client_signers (client_id, site_id, first_name, last_name, title, email, phone, initials)
  VALUES (_client2_id, _site2_id, 'Derrick', 'Hall', 'Site Foreman', 'derrick.hall@apexconstruction.example', '(555) 010-4002', 'DH')
  RETURNING id INTO _signer2_id;

  -- Workers
  INSERT INTO public.workers (agency_id, first_name, last_name, trade, classification, worker_code, email, phone, osha_cert)
  VALUES (_agency_id, 'John', 'Carter', 'General Labor', 'Class A', 'W-1001', 'john.carter@example.com', '(555) 010-5001', true)
  RETURNING id INTO _worker1_id;

  INSERT INTO public.workers (agency_id, first_name, last_name, trade, classification, worker_code, email, phone, osha_cert, nccer_cert)
  VALUES (_agency_id, 'Luis', 'Martinez', 'Carpenter', 'Class B', 'W-1002', 'luis.martinez@example.com', '(555) 010-5002', true, true)
  RETURNING id INTO _worker2_id;

  INSERT INTO public.workers (agency_id, first_name, last_name, trade, classification, worker_code, email, phone)
  VALUES (_agency_id, 'Sarah', 'Reed', 'Forklift Operator', 'Class A', 'W-1003', 'sarah.reed@example.com', '(555) 010-5003')
  RETURNING id INTO _worker3_id;

  -- Ticket 1: SIGNED DAILY
  INSERT INTO public.tickets (
    agency_id, client_id, site_id, worker_id, ticket_number, ticket_type, status,
    work_date, start_time, total_hours,
    client_company_name_snapshot, site_name_snapshot, site_code_snapshot, site_address_snapshot,
    report_to_name_snapshot, report_to_phone_snapshot,
    worker_name_snapshot, job_title, hard_hat_required, vest_required, gloves_required,
    sent_at, viewed_at, signed_at, supervisor_name, supervisor_title, client_initials
  ) VALUES (
    _agency_id, _client1_id, _site1_id, _worker1_id,
    'TT-' || EXTRACT(YEAR FROM now())::text || '-001040', 'daily', 'signed',
    (now() - interval '3 days')::date, '07:00', 8.0,
    'Metro Logistics', 'Distribution Center 4', 'DC-04', '4400 Industrial Pkwy, Houston, TX 77032',
    'Maria Gomez', '(555) 010-4001',
    'John Carter', 'General Labor', true, true, true,
    now() - interval '3 days', now() - interval '3 days' + interval '2 hours', now() - interval '2 days',
    'Maria Gomez', 'Operations Supervisor', 'MG'
  ) RETURNING id INTO _ticket_signed;

  -- Ticket 2: PENDING WEEKLY (sent, awaiting signature)
  INSERT INTO public.tickets (
    agency_id, client_id, site_id, worker_id, ticket_number, ticket_type, status,
    week_start_date, week_end_date, total_hours,
    client_company_name_snapshot, site_name_snapshot, site_code_snapshot, site_address_snapshot,
    report_to_name_snapshot, report_to_phone_snapshot,
    worker_name_snapshot, job_title, hard_hat_required, vest_required, boots_required,
    sent_at
  ) VALUES (
    _agency_id, _client2_id, _site2_id, _worker2_id,
    'TT-' || EXTRACT(YEAR FROM now())::text || '-001041', 'weekly', 'sent',
    (date_trunc('week', now()) - interval '7 days')::date,
    (date_trunc('week', now()) - interval '1 day')::date,
    42.5,
    'Apex Construction', 'Tower B Job Site', 'JOB-B', '900 Skyline Blvd, Sugar Land, TX 77478',
    'Derrick Hall', '(555) 010-4002',
    'Luis Martinez', 'Carpenter', true, true, true,
    now() - interval '1 day'
  ) RETURNING id INTO _ticket_weekly;

  -- Weekly ticket days (Mon-Fri)
  INSERT INTO public.ticket_days (ticket_id, day_date, day_name, start_time, end_time, regular_hours, overtime_hours, total_hours)
  VALUES
    (_ticket_weekly, (date_trunc('week', now()) - interval '7 days')::date, 'Mon', '07:00', '15:30', 8.0, 0, 8.0),
    (_ticket_weekly, (date_trunc('week', now()) - interval '6 days')::date, 'Tue', '07:00', '16:00', 8.5, 0, 8.5),
    (_ticket_weekly, (date_trunc('week', now()) - interval '5 days')::date, 'Wed', '07:00', '17:00', 8.0, 1.0, 9.0),
    (_ticket_weekly, (date_trunc('week', now()) - interval '4 days')::date, 'Thu', '07:00', '15:30', 8.0, 0, 8.0),
    (_ticket_weekly, (date_trunc('week', now()) - interval '3 days')::date, 'Fri', '07:00', '16:30', 8.0, 1.0, 9.0);

  -- Ticket 3: REJECTED
  INSERT INTO public.tickets (
    agency_id, client_id, site_id, worker_id, ticket_number, ticket_type, status,
    work_date, start_time, total_hours,
    client_company_name_snapshot, site_name_snapshot, site_code_snapshot, site_address_snapshot,
    report_to_name_snapshot, report_to_phone_snapshot,
    worker_name_snapshot, job_title, hard_hat_required,
    sent_at, viewed_at, rejected_at, rejection_reason
  ) VALUES (
    _agency_id, _client1_id, _site1_id, _worker3_id,
    'TT-' || EXTRACT(YEAR FROM now())::text || '-001039', 'daily', 'rejected',
    (now() - interval '5 days')::date, '08:00', 6.0,
    'Metro Logistics', 'Distribution Center 4', 'DC-04', '4400 Industrial Pkwy, Houston, TX 77032',
    'Maria Gomez', '(555) 010-4001',
    'Sarah Reed', 'Forklift Operator', true,
    now() - interval '5 days', now() - interval '5 days' + interval '1 hour', now() - interval '4 days',
    'Hours do not match site sign-in log. Please correct and resend.'
  ) RETURNING id INTO _ticket_rejected;

  -- Ticket 4: CLOSED / ARCHIVED
  INSERT INTO public.tickets (
    agency_id, client_id, site_id, worker_id, ticket_number, ticket_type, status,
    work_date, start_time, total_hours,
    client_company_name_snapshot, site_name_snapshot, site_code_snapshot, site_address_snapshot,
    report_to_name_snapshot, report_to_phone_snapshot,
    worker_name_snapshot, job_title, hard_hat_required, vest_required,
    sent_at, viewed_at, signed_at, supervisor_name, supervisor_title, client_initials
  ) VALUES (
    _agency_id, _client2_id, _site2_id, _worker1_id,
    'TT-' || EXTRACT(YEAR FROM now())::text || '-001038', 'daily', 'closed',
    (now() - interval '14 days')::date, '06:30', 9.0,
    'Apex Construction', 'Tower B Job Site', 'JOB-B', '900 Skyline Blvd, Sugar Land, TX 77478',
    'Derrick Hall', '(555) 010-4002',
    'John Carter', 'General Labor', true, true,
    now() - interval '14 days', now() - interval '14 days' + interval '3 hours', now() - interval '13 days',
    'Derrick Hall', 'Site Foreman', 'DH'
  ) RETURNING id INTO _ticket_closed;

  -- Signature for the signed ticket
  INSERT INTO public.ticket_signatures (ticket_id, signer_type, signer_name, signer_title, signer_initials, signer_email, signed_at)
  VALUES (_ticket_signed, 'client', 'Maria Gomez', 'Operations Supervisor', 'MG', 'maria.gomez@metrologistics.example', now() - interval '2 days');

  -- Signature for the closed ticket
  INSERT INTO public.ticket_signatures (ticket_id, signer_type, signer_name, signer_title, signer_initials, signer_email, signed_at)
  VALUES (_ticket_closed, 'client', 'Derrick Hall', 'Site Foreman', 'DH', 'derrick.hall@apexconstruction.example', now() - interval '13 days');

  RAISE NOTICE 'Demo agency seeded: %', _agency_id;
END $$;