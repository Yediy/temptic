-- De-duplicate any existing reputation rows per category before adding the unique key.
DELETE FROM public.passport_reputation a
USING public.passport_reputation b
WHERE a.passport_id = b.passport_id
  AND a.category = b.category
  AND a.ctid < b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS passport_reputation_passport_category_key
  ON public.passport_reputation (passport_id, category);