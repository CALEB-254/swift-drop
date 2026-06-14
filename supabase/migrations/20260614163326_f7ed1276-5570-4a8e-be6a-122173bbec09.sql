
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS code_prefix text;

UPDATE public.agents
SET code_prefix = UPPER(REGEXP_REPLACE(COALESCE(SUBSTRING(business_name FROM 1 FOR 3), 'AGT'), '[^A-Za-z0-9]', '', 'g'))
WHERE code_prefix IS NULL OR LENGTH(TRIM(code_prefix)) = 0;

UPDATE public.agents SET code_prefix = 'AGT' WHERE code_prefix IS NULL OR LENGTH(code_prefix) = 0;

CREATE TABLE IF NOT EXISTS public.payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_ids uuid[] NOT NULL,
  tracking_numbers text[] NOT NULL DEFAULT '{}',
  amount numeric NOT NULL,
  payment_method text NOT NULL,
  mpesa_receipt_number text,
  checkout_request_id text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_logs TO authenticated;
GRANT ALL ON public.payment_logs TO service_role;

ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own payment logs"
  ON public.payment_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::user_role));
