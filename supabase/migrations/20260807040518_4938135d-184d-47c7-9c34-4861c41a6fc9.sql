-- 1. Admin notification sending (fixes RLS violation)
CREATE POLICY "Admins can insert notifications for anyone"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

ALTER TABLE public.broadcast_notifications ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';

-- 2. Read receipts
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at timestamptz;
UPDATE public.notifications SET read_at = created_at WHERE is_read = true AND read_at IS NULL;

CREATE OR REPLACE FUNCTION public.stamp_notification_read()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_read = true AND (OLD.is_read = false OR OLD.is_read IS NULL) AND NEW.read_at IS NULL THEN
    NEW.read_at := now();
  ELSIF NEW.is_read = false THEN
    NEW.read_at := NULL;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_stamp_notification_read ON public.notifications;
CREATE TRIGGER trg_stamp_notification_read BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.stamp_notification_read();

-- 3. Wallet debit on withdrawal request
CREATE OR REPLACE FUNCTION public.debit_wallet_on_withdrawal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bal numeric;
BEGIN
  SELECT balance INTO v_bal FROM public.wallets WHERE id = NEW.wallet_id FOR UPDATE;
  IF v_bal IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF NEW.amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF v_bal < NEW.amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  UPDATE public.wallets SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_id;
  INSERT INTO public.wallet_transactions (wallet_id, type, amount, status, reference, description)
  VALUES (NEW.wallet_id, 'withdrawal', NEW.amount, 'pending', NEW.id::text, 'M-Pesa withdrawal to ' || NEW.phone);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_debit_wallet_on_withdrawal ON public.withdrawal_requests;
CREATE TRIGGER trg_debit_wallet_on_withdrawal AFTER INSERT ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.debit_wallet_on_withdrawal();

CREATE OR REPLACE FUNCTION public.settle_withdrawal_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('failed','rejected','cancelled') AND OLD.status NOT IN ('failed','rejected','cancelled') THEN
      UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = now() WHERE id = NEW.wallet_id;
      UPDATE public.wallet_transactions SET status = 'failed'
        WHERE wallet_id = NEW.wallet_id AND reference = NEW.id::text;
      INSERT INTO public.wallet_transactions (wallet_id, type, amount, status, reference, description)
      VALUES (NEW.wallet_id, 'deposit', NEW.amount, 'completed', NEW.id::text, 'Refund for failed withdrawal');
    ELSIF NEW.status IN ('completed','paid') THEN
      UPDATE public.wallet_transactions SET status = 'completed'
        WHERE wallet_id = NEW.wallet_id AND reference = NEW.id::text AND type = 'withdrawal';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_settle_withdrawal_status ON public.withdrawal_requests;
CREATE TRIGGER trg_settle_withdrawal_status AFTER UPDATE ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.settle_withdrawal_status();

-- 4. Secure shareable tracking links
CREATE TABLE IF NOT EXISTS public.tracking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  tracking_number text NOT NULL,
  created_by uuid NOT NULL,
  token text NOT NULL UNIQUE,
  pin_hash text,
  expires_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracking_links TO authenticated;
GRANT ALL ON public.tracking_links TO service_role;

ALTER TABLE public.tracking_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their tracking links" ON public.tracking_links
FOR ALL TO authenticated
USING (created_by = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_tracking_links_updated_at ON public.tracking_links;
CREATE TRIGGER trg_tracking_links_updated_at BEFORE UPDATE ON public.tracking_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.create_tracking_link(_package_id uuid, _pin text DEFAULT NULL, _expires_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid := auth.uid(); v_track text; v_token text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT tracking_number INTO v_track FROM public.packages
    WHERE id = _package_id AND (user_id = v_uid OR public.is_admin(v_uid));
  IF v_track IS NULL THEN RAISE EXCEPTION 'Package not found'; END IF;
  IF _pin IS NOT NULL AND _pin <> '' AND _pin !~ '^[0-9]{4,6}$' THEN
    RAISE EXCEPTION 'PIN must be 4-6 digits';
  END IF;

  v_token := replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.tracking_links (package_id, tracking_number, created_by, token, pin_hash, expires_at)
  VALUES (_package_id, v_track, v_uid, v_token,
          CASE WHEN _pin IS NULL OR _pin = '' THEN NULL ELSE crypt(_pin, gen_salt('bf')) END,
          _expires_at);

  RETURN jsonb_build_object('success', true, 'token', v_token, 'tracking_number', v_track,
                            'requires_pin', (_pin IS NOT NULL AND _pin <> ''), 'expires_at', _expires_at);
END; $$;

CREATE OR REPLACE FUNCTION public.get_shared_tracking(_token text, _pin text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE l RECORD;
BEGIN
  SELECT * INTO l FROM public.tracking_links WHERE token = _token LIMIT 1;
  IF l IS NULL THEN RETURN jsonb_build_object('found', false, 'reason', 'invalid'); END IF;
  IF l.revoked THEN RETURN jsonb_build_object('found', false, 'reason', 'revoked'); END IF;
  IF l.expires_at IS NOT NULL AND l.expires_at < now() THEN
    RETURN jsonb_build_object('found', false, 'reason', 'expired');
  END IF;
  IF l.pin_hash IS NOT NULL THEN
    IF _pin IS NULL OR _pin = '' THEN
      RETURN jsonb_build_object('found', false, 'reason', 'pin_required');
    END IF;
    IF l.pin_hash <> crypt(_pin, l.pin_hash) THEN
      RETURN jsonb_build_object('found', false, 'reason', 'bad_pin');
    END IF;
  END IF;

  UPDATE public.tracking_links
    SET view_count = view_count + 1, last_viewed_at = now()
    WHERE id = l.id;

  RETURN public.get_public_tracking(l.tracking_number);
END; $$;

REVOKE ALL ON FUNCTION public.create_tracking_link(uuid, text, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.create_tracking_link(uuid, text, timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.get_shared_tracking(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_shared_tracking(text, text) TO anon, authenticated;