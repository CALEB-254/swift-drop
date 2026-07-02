
-- 1) Add 'errand' to zone_type enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'errand' AND enumtypid = 'public.zone_type'::regtype) THEN
    ALTER TYPE public.zone_type ADD VALUE 'errand';
  END IF;
END $$;

-- 2) Couriers table
CREATE TABLE IF NOT EXISTS public.couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  zone_id uuid REFERENCES public.zones(id) ON DELETE SET NULL,
  price numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.couriers TO authenticated;
GRANT ALL ON public.couriers TO service_role;

ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone signed in can view active couriers" ON public.couriers;
CREATE POLICY "Anyone signed in can view active couriers"
  ON public.couriers FOR SELECT TO authenticated
  USING (is_active = true OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage couriers" ON public.couriers;
CREATE POLICY "Admins manage couriers"
  ON public.couriers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Also allow admins to insert/update/delete explicitly (redundant with FOR ALL but safe)
GRANT INSERT, UPDATE, DELETE ON public.couriers TO authenticated;

DROP TRIGGER IF EXISTS trg_couriers_updated_at ON public.couriers;
CREATE TRIGGER trg_couriers_updated_at
  BEFORE UPDATE ON public.couriers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Extra columns on packages for errand+conversion+balance
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS courier_id uuid REFERENCES public.couriers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_paid_amount numeric,
  ADD COLUMN IF NOT EXISTS payment_balance_due numeric NOT NULL DEFAULT 0;

-- 4) Auto-credit wallet when refund approved
CREATE OR REPLACE FUNCTION public.process_refund_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_process_refund_approval ON public.refund_requests;
CREATE TRIGGER trg_process_refund_approval
  AFTER UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.process_refund_approval();

-- 5) Notify sender when agent scans errand package (dropped_at_agent)
CREATE OR REPLACE FUNCTION public.notify_errand_dropped()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_price numeric;
  c_name text;
BEGIN
  IF NEW.delivery_type = 'errand'
     AND NEW.status = 'dropped_at_agent'
     AND COALESCE(OLD.status::text,'') <> 'dropped_at_agent' THEN
    IF NEW.courier_id IS NOT NULL THEN
      SELECT price, name INTO c_price, c_name FROM public.couriers WHERE id = NEW.courier_id;
    END IF;
    INSERT INTO public.notifications (user_id, title, message, type, tracking_number)
    VALUES (
      NEW.user_id,
      'Pay Sacco Delivery Fee',
      'Your errand package ' || NEW.tracking_number ||
      ' has been dropped with ' || COALESCE(c_name, 'the sacco') ||
      '. Please send KES ' || COALESCE(c_price::text,'the sacco delivery fee') ||
      ' to Till 0114606040 to complete the delivery.',
      'errand_fee_due',
      NEW.tracking_number
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_errand_dropped ON public.packages;
CREATE TRIGGER trg_notify_errand_dropped
  AFTER UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.notify_errand_dropped();
