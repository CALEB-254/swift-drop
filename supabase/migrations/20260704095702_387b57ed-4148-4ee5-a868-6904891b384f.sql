
-- 1) Add 'refunded' to package_status enum if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.package_status'::regtype AND enumlabel = 'refunded') THEN
    ALTER TYPE public.package_status ADD VALUE 'refunded';
  END IF;
END $$;

-- 2) Package columns: rejection_reason + pending conversion fields
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS pending_conversion_type public.delivery_type,
  ADD COLUMN IF NOT EXISTS pending_conversion_cost numeric,
  ADD COLUMN IF NOT EXISTS pending_conversion_balance numeric;

-- 3) Refund approval trigger — also mark package refunded with reason
CREATE OR REPLACE FUNCTION public.process_refund_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  w_id uuid;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'approved'
     AND COALESCE(OLD.status,'') <> 'approved' THEN
    SELECT id INTO w_id FROM public.wallets WHERE user_id = NEW.user_id;
    IF w_id IS NULL THEN
      INSERT INTO public.wallets (user_id) VALUES (NEW.user_id) RETURNING id INTO w_id;
    END IF;
    UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = now() WHERE id = w_id;
    INSERT INTO public.wallet_transactions (wallet_id, type, amount, status, reference, description)
    VALUES (w_id, 'deposit', NEW.amount, 'completed',
            COALESCE(NEW.tracking_number, NEW.id::text),
            'Refund approved for ' || COALESCE(NEW.tracking_number, 'request'));
    INSERT INTO public.notifications (user_id, title, message, type, tracking_number)
    VALUES (NEW.user_id, 'Refund Approved',
            'Your refund of KES ' || NEW.amount::text || ' has been credited to your Pochi wallet.',
            'refund_approved', NEW.tracking_number);
    -- Mark associated package as refunded
    IF NEW.package_id IS NOT NULL THEN
      UPDATE public.packages
        SET status = 'refunded'::public.package_status,
            rejection_reason = COALESCE(NEW.admin_notes, NEW.reason),
            updated_at = now()
      WHERE id = NEW.package_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4) admin_convert_to_doorstep: propose only, notify sender
CREATE OR REPLACE FUNCTION public.admin_convert_to_doorstep(_package_id uuid, _new_cost numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_prev_cost numeric; v_paid text; v_balance numeric; v_user uuid; v_track text;
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin(v_uid) THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT cost, payment_status, user_id, tracking_number
    INTO v_prev_cost, v_paid, v_user, v_track
    FROM public.packages WHERE id = _package_id;
  IF v_prev_cost IS NULL THEN RAISE EXCEPTION 'Package not found'; END IF;
  v_balance := CASE WHEN v_paid = 'paid' THEN GREATEST(_new_cost - v_prev_cost, 0) ELSE _new_cost END;

  UPDATE public.packages
    SET pending_conversion_type = 'doorstep',
        pending_conversion_cost = _new_cost,
        pending_conversion_balance = v_balance,
        updated_at = now()
    WHERE id = _package_id;

  INSERT INTO public.notifications (user_id, title, message, type, tracking_number)
  VALUES (
    v_user,
    'Convert to Doorstep — Approval Needed',
    'Admin proposes converting ' || v_track || ' to Doorstep for KES ' || _new_cost::text ||
    CASE WHEN v_balance > 0 AND v_paid = 'paid'
      THEN '. Balance due after your previous payment: KES ' || v_balance::text || '.'
      ELSE '.' END ||
    ' Open your dashboard to accept.',
    'conversion_request', v_track
  );

  RETURN jsonb_build_object('success', true, 'pending', true, 'balance_due', v_balance);
END; $function$;

-- 5) Sender accepts pending conversion
CREATE OR REPLACE FUNCTION public.accept_conversion(_package_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_prev_cost numeric; v_paid text; v_type public.delivery_type; v_new_cost numeric; v_bal numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT cost, payment_status, pending_conversion_type, pending_conversion_cost, pending_conversion_balance
    INTO v_prev_cost, v_paid, v_type, v_new_cost, v_bal
    FROM public.packages WHERE id = _package_id AND user_id = v_uid;
  IF v_type IS NULL THEN RAISE EXCEPTION 'No pending conversion'; END IF;

  IF v_paid = 'paid' THEN
    UPDATE public.packages SET
      delivery_type = v_type,
      cost = v_new_cost,
      original_paid_amount = v_prev_cost,
      payment_balance_due = v_bal,
      payment_status = CASE WHEN v_bal > 0 THEN 'pending' ELSE 'paid' END,
      pending_conversion_type = NULL,
      pending_conversion_cost = NULL,
      pending_conversion_balance = NULL,
      updated_at = now()
    WHERE id = _package_id;
  ELSE
    UPDATE public.packages SET
      delivery_type = v_type,
      cost = v_new_cost,
      pending_conversion_type = NULL,
      pending_conversion_cost = NULL,
      pending_conversion_balance = NULL,
      updated_at = now()
    WHERE id = _package_id;
  END IF;
  RETURN jsonb_build_object('success', true, 'balance_due', COALESCE(v_bal,0));
END; $function$;

-- 6) Sender rejects pending conversion
CREATE OR REPLACE FUNCTION public.reject_conversion(_package_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.packages
    SET pending_conversion_type = NULL, pending_conversion_cost = NULL,
        pending_conversion_balance = NULL, updated_at = now()
    WHERE id = _package_id AND user_id = v_uid;
  RETURN jsonb_build_object('success', true);
END; $function$;

-- 7) pay_with_pochi now requires PIN
CREATE OR REPLACE FUNCTION public.pay_with_pochi(_package_ids uuid[], _pin text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_total numeric := 0;
  v_wallet_id uuid;
  v_balance numeric;
  v_hash text;
  v_ref text := 'POCHI-' || substring(gen_random_uuid()::text, 1, 8);
  r record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _package_ids IS NULL OR array_length(_package_ids,1) IS NULL THEN
    RAISE EXCEPTION 'No packages provided';
  END IF;
  IF _pin IS NULL OR _pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'PIN required';
  END IF;

  SELECT id, balance, pin_hash INTO v_wallet_id, v_balance, v_hash
    FROM public.wallets WHERE user_id = v_uid;
  IF v_wallet_id IS NULL OR v_hash IS NULL THEN
    RAISE EXCEPTION 'Set up your Pochi PIN first';
  END IF;
  IF v_hash <> crypt(_pin, v_hash) THEN
    RAISE EXCEPTION 'Incorrect PIN';
  END IF;

  SELECT COALESCE(SUM(cost),0) INTO v_total
    FROM public.packages
    WHERE id = ANY(_package_ids) AND user_id = v_uid AND payment_status = 'pending';
  IF v_total <= 0 THEN RAISE EXCEPTION 'No unpaid packages found'; END IF;
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
      SET payment_status = 'paid', paid_at = now(), mpesa_receipt_number = v_ref
      WHERE id = r.id;
    INSERT INTO public.payment_logs (user_id, package_id, tracking_number, amount, payment_method, status, reference)
    VALUES (v_uid, r.id, r.tracking_number, r.cost, 'pochi', 'completed', v_ref);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'total', v_total, 'reference', v_ref);
END; $function$;
