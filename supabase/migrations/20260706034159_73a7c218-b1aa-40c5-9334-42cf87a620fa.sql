
-- 1) Drop recursive update policies
DROP POLICY IF EXISTS "Agents can update assigned packages" ON public.packages;
DROP POLICY IF EXISTS "Pickup agents can update their packages" ON public.packages;
DROP POLICY IF EXISTS "Users can update their own packages" ON public.packages;

-- 2) Recreate simple, non-recursive policies
CREATE POLICY "Users can update their own packages"
  ON public.packages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Agents can update assigned packages"
  ON public.packages FOR UPDATE
  USING (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Pickup agents can update their packages"
  ON public.packages FOR UPDATE
  USING (pickup_agent_id IN (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid()))
  WITH CHECK (pickup_agent_id IN (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid()));

-- 3) Enforce field immutability via trigger (non-admins can't change financial fields)
CREATE OR REPLACE FUNCTION public.enforce_package_field_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR public.is_admin(v_uid) THEN
    RETURN NEW;
  END IF;
  IF NEW.cost IS DISTINCT FROM OLD.cost
     OR NEW.commission IS DISTINCT FROM OLD.commission
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.mpesa_receipt_number IS DISTINCT FROM OLD.mpesa_receipt_number
     OR NEW.package_value IS DISTINCT FROM OLD.package_value
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.checkout_request_id IS DISTINCT FROM OLD.checkout_request_id THEN
    RAISE EXCEPTION 'Financial fields can only be modified by admins or backend functions';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_package_field_immutability ON public.packages;
CREATE TRIGGER trg_enforce_package_field_immutability
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_package_field_immutability();

-- 4) Delete policies (senders can delete their own unpaid pending packages; admins delete any)
DROP POLICY IF EXISTS "Users can delete their unpaid pending packages" ON public.packages;
CREATE POLICY "Users can delete their unpaid pending packages"
  ON public.packages FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending' AND payment_status <> 'paid');

DROP POLICY IF EXISTS "Admins can delete any package" ON public.packages;
CREATE POLICY "Admins can delete any package"
  ON public.packages FOR DELETE
  USING (public.is_admin(auth.uid()));
