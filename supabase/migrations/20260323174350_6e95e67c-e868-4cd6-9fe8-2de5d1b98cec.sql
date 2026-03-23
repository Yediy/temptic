-- Drop the overly broad client update policy on tickets
DROP POLICY IF EXISTS "Client updates own tickets" ON public.tickets;