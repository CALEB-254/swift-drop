CREATE TABLE public.cash_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  tracking_number text NOT NULL,
  rider_id uuid,
  sender_id uuid,
  payment_type text NOT NULL DEFAULT 'pay_on_delivery',
  goods_amount numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'mpesa_stk',
  status text NOT NULL DEFAULT 'pending',
  checkout_request_id text,
  mpesa_receipt text,
  phone text,
  dispute_reason text,
  disputed_by uuid,
  disputed_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cash_collections TO authenticated;
GRANT ALL ON public.cash_collections TO service_role;

ALTER TABLE public.cash_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders see own collections" ON public.cash_collections
FOR SELECT TO authenticated
USING (rider_id = auth.uid() OR sender_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage collections" ON public.cash_collections
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_cash_collections_rider ON public.cash_collections(rider_id);
CREATE INDEX idx_cash_collections_checkout ON public.cash_collections(checkout_request_id);

CREATE TRIGGER trg_cash_collections_updated_at
BEFORE UPDATE ON public.cash_collections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.flag_cash_dispute(_collection_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin(v_uid) THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'A dispute reason is required'; END IF;
  UPDATE public.cash_collections
    SET status = 'disputed', dispute_reason = _reason, disputed_by = v_uid,
        disputed_at = now(), resolved_at = NULL
    WHERE id = _collection_id;
  RETURN jsonb_build_object('success', true);
END; $$;

CREATE OR REPLACE FUNCTION public.resolve_cash_dispute(_collection_id uuid, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin(v_uid) THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.cash_collections
    SET status = 'paid',
        dispute_reason = COALESCE(_notes, dispute_reason),
        resolved_at = now()
    WHERE id = _collection_id;
  RETURN jsonb_build_object('success', true);
END; $$;

REVOKE ALL ON FUNCTION public.flag_cash_dispute(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_cash_dispute(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.flag_cash_dispute(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_cash_dispute(uuid, text) TO authenticated;