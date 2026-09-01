ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS fee_on_delivery boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fee_collected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fee_collected_at timestamptz;

CREATE OR REPLACE FUNCTION public.collect_delivery_cash(_package_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  p RECORD;
  v_fee numeric := 0;
  v_cod numeric := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO p FROM public.packages WHERE id = _package_id;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Package not found'; END IF;

  IF p.fee_on_delivery AND NOT p.fee_collected THEN
    v_fee := COALESCE(p.cost, 0);
  END IF;
  IF COALESCE(p.cod_amount,0) > 0 AND NOT COALESCE(p.cod_collected,false) THEN
    v_cod := p.cod_amount;
  END IF;

  UPDATE public.packages SET
    fee_collected = CASE WHEN fee_on_delivery THEN true ELSE fee_collected END,
    fee_collected_at = CASE WHEN fee_on_delivery AND fee_collected_at IS NULL THEN now() ELSE fee_collected_at END,
    payment_status = CASE WHEN fee_on_delivery THEN 'paid' ELSE payment_status END,
    paid_at = CASE WHEN fee_on_delivery AND paid_at IS NULL THEN now() ELSE paid_at END,
    cod_collected = CASE WHEN COALESCE(cod_amount,0) > 0 THEN true ELSE cod_collected END,
    updated_at = now()
  WHERE id = _package_id;

  RETURN jsonb_build_object('success', true, 'fee_collected', v_fee, 'cod_collected', v_cod, 'total', v_fee + v_cod);
END; $$;

REVOKE ALL ON FUNCTION public.collect_delivery_cash(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.collect_delivery_cash(uuid) TO authenticated;