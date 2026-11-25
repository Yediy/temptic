ALTER TABLE public.pb_worker_pay_rates ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
ALTER TABLE public.pb_client_bill_rates ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
ALTER TABLE public.pb_worker_pay_rates ADD CONSTRAINT pb_worker_pay_rates_currency_format CHECK (currency ~ '^[A-Z]{3}$');
ALTER TABLE public.pb_client_bill_rates ADD CONSTRAINT pb_client_bill_rates_currency_format CHECK (currency ~ '^[A-Z]{3}$');
NOTIFY pgrst, 'reload schema';