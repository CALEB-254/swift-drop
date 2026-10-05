CREATE OR REPLACE FUNCTION public.pay_with_pochi(_package_ids uuid[], _pin text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_uid uuid := auth.uid(); v_total numeric := 0; v_wallet_id uuid; v_balance numeric; v_hash text;
  v_ref text := 'POCHI-' || upper(substring(gen_random_uuid()::text, 1, 8));
  v_ids uuid[]; v_trk text[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _package_ids IS NULL OR array_length(_package_ids,1) IS NULL THEN RAISE EXCEPTION 'No packages provided'; END IF;
  IF _pin IS NULL OR _pin !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'PIN required'; END IF;
  SELECT id, balance, pin_hash INTO v_wallet_id, v_balance, v_hash FROM public.wallets WHERE user_id = v_uid FOR UPDATE;
  IF v_wallet_id IS NULL OR v_hash IS NULL THEN RAISE EXCEPTION 'Set up your Pochi PIN first'; END IF;
  IF v_hash <> crypt(_pin, v_hash) THEN RAISE EXCEPTION 'Incorrect PIN'; END IF;
  SELECT COALESCE(SUM(cost),0), array_agg(id), array_agg(tracking_number) INTO v_total, v_ids, v_trk
    FROM public.packages WHERE id = ANY(_package_ids) AND user_id = v_uid AND payment_status = 'pending';
  IF v_total <= 0 THEN RAISE EXCEPTION 'No unpaid packages found'; END IF;
  IF COALESCE(v_balance,0) < v_total THEN RAISE EXCEPTION 'Insufficient wallet balance. Have %, need %', v_balance, v_total; END IF;
  UPDATE public.wallets SET balance = balance - v_total, updated_at = now() WHERE id = v_wallet_id;
  INSERT INTO public.wallet_transactions (wallet_id, type, amount, status, reference, description)
    VALUES (v_wallet_id, 'payment', v_total, 'completed', v_ref, 'Pay with Pochi for packages');
  UPDATE public.packages SET payment_status = 'paid', paid_at = now(), mpesa_receipt_number = v_ref WHERE id = ANY(v_ids);
  INSERT INTO public.payment_logs (user_id, package_ids, tracking_numbers, amount, payment_method, mpesa_receipt_number, status)
    VALUES (v_uid, v_ids, v_trk, v_total, 'pochi', v_ref, 'completed');
  RETURN jsonb_build_object('success', true, 'total', v_total, 'reference', v_ref);
END; $function$;

REVOKE EXECUTE ON FUNCTION public.pay_with_pochi(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pay_with_pochi(uuid[], text) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_release_code()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.release_code IS NOT NULL AND NEW.status = 'picked_up' AND OLD.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, title, message, type, tracking_number, category)
    VALUES (NEW.user_id, 'Release Code',
      'Your package ' || NEW.tracking_number || ' has been picked up. Release code: ' || NEW.release_code ||
      '. Share it only with the receiver at handover.', 'release_code', NEW.tracking_number, 'package');
  END IF;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS trg_notify_release_code ON public.packages;
CREATE TRIGGER trg_notify_release_code AFTER UPDATE OF status ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.notify_release_code();