
-- 1) Fix search_path for pgcrypto-dependent functions
CREATE OR REPLACE FUNCTION public.setup_pochi_security(_pin text, _question text, _answer text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
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

CREATE OR REPLACE FUNCTION public.verify_pochi_pin(_pin text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE v_uid uuid := auth.uid(); v_hash text;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  SELECT pin_hash INTO v_hash FROM public.wallets WHERE user_id = v_uid;
  IF v_hash IS NULL THEN RETURN false; END IF;
  RETURN v_hash = crypt(_pin, v_hash);
END; $$;

CREATE OR REPLACE FUNCTION public.pay_with_pochi(_package_ids uuid[], _pin text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
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
  IF _pin IS NULL OR _pin !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'PIN required'; END IF;

  SELECT id, balance, pin_hash INTO v_wallet_id, v_balance, v_hash
    FROM public.wallets WHERE user_id = v_uid;
  IF v_wallet_id IS NULL OR v_hash IS NULL THEN
    RAISE EXCEPTION 'Set up your Pochi PIN first';
  END IF;
  IF v_hash <> crypt(_pin, v_hash) THEN RAISE EXCEPTION 'Incorrect PIN'; END IF;

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
END; $$;

-- 2) Release code on packages
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS release_code text;

CREATE OR REPLACE FUNCTION public.set_package_release_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.release_code IS NULL OR NEW.release_code = '' THEN
    NEW.release_code := lpad(floor(random()*1000000)::int::text, 6, '0');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_release_code ON public.packages;
CREATE TRIGGER trg_set_release_code BEFORE INSERT ON public.packages
FOR EACH ROW EXECUTE FUNCTION public.set_package_release_code();

UPDATE public.packages
  SET release_code = lpad(floor(random()*1000000)::int::text, 6, '0')
  WHERE release_code IS NULL;

-- 3) Update status change notifier: new wording + include release code
CREATE OR REPLACE FUNCTION public.notify_package_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  status_title TEXT;
  status_message TEXT;
  actor_name TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.agent_id IS NOT NULL THEN
      SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = NEW.agent_id LIMIT 1;
    ELSE
      SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
    END IF;
    IF actor_name IS NULL THEN actor_name := 'the agent'; END IF;

    CASE NEW.status
      WHEN 'pending' THEN
        status_title := 'Delivery Created';
        status_message := 'Your package ' || NEW.tracking_number || ' has been created and is pending pickup.';
      WHEN 'dropped_at_agent' THEN
        status_title := 'Dropped at Sender Agent';
        status_message := 'Your package ' || NEW.tracking_number ||
          ' has been dropped at sender location and confirmed by ' || actor_name ||
          ' on the agent, status updated to dropped. Share release code ' ||
          COALESCE(NEW.release_code,'—') || ' only with the receiver at handover.';
      WHEN 'picked_up' THEN
        status_title := 'Package Picked Up';
        status_message := 'Your package ' || NEW.tracking_number || ' has been picked up by ' || actor_name || '.';
      WHEN 'in_transit' THEN
        status_title := 'Package In Transit';
        status_message := 'Your package ' || NEW.tracking_number || ' is on its way. Updated by ' || actor_name || '.';
      WHEN 'out_for_delivery' THEN
        status_title := 'Out for Delivery';
        status_message := 'Your package ' || NEW.tracking_number || ' is out for delivery. Rider: ' || actor_name || '.';
      WHEN 'delivered' THEN
        status_title := 'Package Delivered';
        status_message := 'Your package ' || NEW.tracking_number || ' has been delivered by ' || actor_name || '.';
      WHEN 'cancelled' THEN
        status_title := 'Delivery Cancelled';
        status_message := 'Your package ' || NEW.tracking_number || ' has been cancelled.';
      ELSE
        status_title := 'Status Update';
        status_message := 'Your package ' || NEW.tracking_number || ' status updated.';
    END CASE;

    INSERT INTO public.notifications (user_id, title, message, type, tracking_number)
    VALUES (NEW.user_id, status_title, status_message, NEW.status::text, NEW.tracking_number);
  END IF;
  RETURN NEW;
END; $$;

-- 4) Handover with release code (used by receiver agent / rider on final delivery)
CREATE OR REPLACE FUNCTION public.release_package(_package_id uuid, _release_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_actual text; v_status public.package_status;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT release_code, status INTO v_actual, v_status FROM public.packages WHERE id = _package_id;
  IF v_actual IS NULL THEN RAISE EXCEPTION 'Package not found'; END IF;
  IF v_status = 'delivered' THEN RAISE EXCEPTION 'Already delivered'; END IF;
  IF trim(_release_code) <> v_actual THEN RAISE EXCEPTION 'Invalid release code'; END IF;
  UPDATE public.packages SET status = 'delivered'::public.package_status, updated_at = now()
    WHERE id = _package_id;
  RETURN jsonb_build_object('success', true);
END; $$;
