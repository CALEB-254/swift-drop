
-- 1. Pochi security columns on wallets
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS pin_hash text,
  ADD COLUMN IF NOT EXISTS security_question text,
  ADD COLUMN IF NOT EXISTS security_answer_hash text;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Withdrawal one-time codes
CREATE TABLE IF NOT EXISTS public.pochi_withdrawal_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  amount numeric,
  phone text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.pochi_withdrawal_codes TO authenticated;
GRANT ALL ON public.pochi_withdrawal_codes TO service_role;
ALTER TABLE public.pochi_withdrawal_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own withdrawal codes" ON public.pochi_withdrawal_codes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own withdrawal codes" ON public.pochi_withdrawal_codes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. Setup Pochi security
CREATE OR REPLACE FUNCTION public.setup_pochi_security(_pin text, _question text, _answer text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _pin !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'PIN must be 4 digits'; END IF;
  IF coalesce(trim(_question),'') = '' OR coalesce(trim(_answer),'') = '' THEN
    RAISE EXCEPTION 'Security question and answer are required';
  END IF;
  INSERT INTO public.wallets(user_id, pin_hash, security_question, security_answer_hash)
  VALUES (v_uid, crypt(_pin, gen_salt('bf')), _question, crypt(lower(trim(_answer)), gen_salt('bf')))
  ON CONFLICT (user_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash,
        security_question = EXCLUDED.security_question,
        security_answer_hash = EXCLUDED.security_answer_hash,
        updated_at = now();
  RETURN jsonb_build_object('success', true);
END; $$;
REVOKE ALL ON FUNCTION public.setup_pochi_security(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.setup_pochi_security(text,text,text) TO authenticated;

-- 4. Verify Pochi PIN
CREATE OR REPLACE FUNCTION public.verify_pochi_pin(_pin text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid := auth.uid(); v_hash text;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  SELECT pin_hash INTO v_hash FROM public.wallets WHERE user_id = v_uid;
  IF v_hash IS NULL THEN RETURN false; END IF;
  RETURN v_hash = crypt(_pin, v_hash);
END; $$;
REVOKE ALL ON FUNCTION public.verify_pochi_pin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_pochi_pin(text) TO authenticated;

-- 5. Create a withdrawal authorization code
CREATE OR REPLACE FUNCTION public.create_pochi_withdrawal_code(_amount numeric, _phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid := auth.uid(); v_code text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_code := lpad(floor(random()*1000000)::int::text, 6, '0');
  UPDATE public.pochi_withdrawal_codes SET used = true
    WHERE user_id = v_uid AND used = false;
  INSERT INTO public.pochi_withdrawal_codes(user_id, code, amount, phone)
  VALUES (v_uid, v_code, _amount, _phone);
  RETURN jsonb_build_object('success', true, 'code', v_code);
END; $$;
REVOKE ALL ON FUNCTION public.create_pochi_withdrawal_code(numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pochi_withdrawal_code(numeric,text) TO authenticated;

-- 6. Confirm withdrawal code
CREATE OR REPLACE FUNCTION public.consume_pochi_withdrawal_code(_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  SELECT id INTO v_id FROM public.pochi_withdrawal_codes
   WHERE user_id = v_uid AND code = _code AND used = false AND expires_at > now()
   ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NULL THEN RETURN false; END IF;
  UPDATE public.pochi_withdrawal_codes SET used = true WHERE id = v_id;
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.consume_pochi_withdrawal_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_pochi_withdrawal_code(text) TO authenticated;

-- 7. Update errand-drop notification: "Send Money" wording + include M-Pesa withdrawal charges
CREATE OR REPLACE FUNCTION public.notify_errand_dropped()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  c_price numeric;
  c_name text;
  v_charge numeric := 0;
  v_total numeric;
BEGIN
  IF NEW.delivery_type = 'errand'
     AND NEW.status = 'dropped_at_agent'
     AND COALESCE(OLD.status::text,'') <> 'dropped_at_agent' THEN
    IF NEW.courier_id IS NOT NULL THEN
      SELECT price, name INTO c_price, c_name FROM public.couriers WHERE id = NEW.courier_id;
    END IF;
    -- Safaricom "Send Money" charges (approx tariff table for common bands)
    IF c_price IS NULL OR c_price <= 100 THEN v_charge := 0;
    ELSIF c_price <= 500 THEN v_charge := 7;
    ELSIF c_price <= 1000 THEN v_charge := 13;
    ELSIF c_price <= 1500 THEN v_charge := 23;
    ELSIF c_price <= 2500 THEN v_charge := 33;
    ELSIF c_price <= 3500 THEN v_charge := 53;
    ELSIF c_price <= 5000 THEN v_charge := 57;
    ELSIF c_price <= 7500 THEN v_charge := 78;
    ELSE v_charge := 108;
    END IF;
    v_total := COALESCE(c_price,0) + v_charge;
    INSERT INTO public.notifications (user_id, title, message, type, tracking_number)
    VALUES (
      NEW.user_id,
      'Pay Sacco Delivery Fee',
      'Your errand package ' || NEW.tracking_number ||
      ' has been dropped with ' || COALESCE(c_name,'the sacco') ||
      '. Please Send Money KES ' || v_total::text ||
      ' (fee KES ' || COALESCE(c_price::text,'—') ||
      ' + M-Pesa withdrawal charges KES ' || v_charge::text ||
      ') to 0114606040 to complete the delivery.',
      'errand_fee_due',
      NEW.tracking_number
    );
  END IF;
  RETURN NEW;
END; $$;

-- 8. Admin: convert to doorstep carrying over prior payment
CREATE OR REPLACE FUNCTION public.admin_convert_to_doorstep(_package_id uuid, _new_cost numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid := auth.uid(); v_prev_cost numeric; v_paid text; v_balance numeric;
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin(v_uid) THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT cost, payment_status INTO v_prev_cost, v_paid FROM public.packages WHERE id = _package_id;
  IF v_prev_cost IS NULL THEN RAISE EXCEPTION 'Package not found'; END IF;
  IF v_paid = 'paid' THEN
    v_balance := GREATEST(_new_cost - v_prev_cost, 0);
    UPDATE public.packages SET
      delivery_type = 'doorstep',
      cost = _new_cost,
      original_paid_amount = v_prev_cost,
      payment_balance_due = v_balance,
      payment_status = CASE WHEN v_balance > 0 THEN 'pending' ELSE 'paid' END,
      updated_at = now()
    WHERE id = _package_id;
  ELSE
    UPDATE public.packages SET
      delivery_type = 'doorstep',
      cost = _new_cost,
      updated_at = now()
    WHERE id = _package_id;
    v_balance := _new_cost;
  END IF;
  RETURN jsonb_build_object('success', true, 'balance_due', v_balance);
END; $$;
REVOKE ALL ON FUNCTION public.admin_convert_to_doorstep(uuid,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_convert_to_doorstep(uuid,numeric) TO authenticated;
