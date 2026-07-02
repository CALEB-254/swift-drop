
CREATE OR REPLACE FUNCTION public.pay_with_pochi(_package_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total numeric := 0;
  v_wallet_id uuid;
  v_balance numeric;
  v_ref text := 'POCHI-' || substring(gen_random_uuid()::text, 1, 8);
  r record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _package_ids IS NULL OR array_length(_package_ids,1) IS NULL THEN
    RAISE EXCEPTION 'No packages provided';
  END IF;

  SELECT COALESCE(SUM(cost),0) INTO v_total
  FROM public.packages
  WHERE id = ANY(_package_ids) AND user_id = v_uid AND payment_status = 'pending';

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'No unpaid packages found';
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance FROM public.wallets WHERE user_id = v_uid;
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (v_uid) RETURNING id, balance INTO v_wallet_id, v_balance;
  END IF;

  IF COALESCE(v_balance,0) < v_total THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Have %, need %', v_balance, v_total;
  END IF;

  UPDATE public.wallets SET balance = balance - v_total, updated_at = now() WHERE id = v_wallet_id;

  INSERT INTO public.wallet_transactions (wallet_id, type, amount, status, reference, description)
  VALUES (v_wallet_id, 'withdrawal', v_total, 'completed', v_ref, 'Pay with Pochi for packages');

  FOR r IN
    SELECT id, tracking_number, cost FROM public.packages
    WHERE id = ANY(_package_ids) AND user_id = v_uid AND payment_status = 'pending'
  LOOP
    UPDATE public.packages
      SET payment_status = 'paid',
          paid_at = now(),
          mpesa_receipt_number = v_ref
      WHERE id = r.id;

    INSERT INTO public.payment_logs (user_id, package_id, tracking_number, amount, payment_method, status, reference)
    VALUES (v_uid, r.id, r.tracking_number, r.cost, 'pochi', 'completed', v_ref);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'total', v_total, 'reference', v_ref);
END;
$$;

REVOKE ALL ON FUNCTION public.pay_with_pochi(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_with_pochi(uuid[]) TO authenticated;
