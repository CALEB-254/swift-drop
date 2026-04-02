
-- Replace broad user update policy with restricted column access
DROP POLICY IF EXISTS "Users can update their own packages" ON public.packages;
CREATE POLICY "Users can update their own packages"
  ON public.packages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND cost = (SELECT p.cost FROM public.packages p WHERE p.id = id LIMIT 1)
    AND commission IS NOT DISTINCT FROM (SELECT p.commission FROM public.packages p WHERE p.id = id LIMIT 1)
    AND payment_status = (SELECT p.payment_status FROM public.packages p WHERE p.id = id LIMIT 1)
    AND mpesa_receipt_number IS NOT DISTINCT FROM (SELECT p.mpesa_receipt_number FROM public.packages p WHERE p.id = id LIMIT 1)
    AND package_value IS NOT DISTINCT FROM (SELECT p.package_value FROM public.packages p WHERE p.id = id LIMIT 1)
    AND paid_at IS NOT DISTINCT FROM (SELECT p.paid_at FROM public.packages p WHERE p.id = id LIMIT 1)
    AND checkout_request_id IS NOT DISTINCT FROM (SELECT p.checkout_request_id FROM public.packages p WHERE p.id = id LIMIT 1)
  );

-- Replace broad agent update policy with status-only updates  
DROP POLICY IF EXISTS "Agents can update assigned packages" ON public.packages;
CREATE POLICY "Agents can update assigned packages"
  ON public.packages FOR UPDATE
  USING (auth.uid() = agent_id)
  WITH CHECK (
    auth.uid() = agent_id
    AND cost = (SELECT p.cost FROM public.packages p WHERE p.id = id LIMIT 1)
    AND commission IS NOT DISTINCT FROM (SELECT p.commission FROM public.packages p WHERE p.id = id LIMIT 1)
    AND payment_status = (SELECT p.payment_status FROM public.packages p WHERE p.id = id LIMIT 1)
    AND mpesa_receipt_number IS NOT DISTINCT FROM (SELECT p.mpesa_receipt_number FROM public.packages p WHERE p.id = id LIMIT 1)
    AND package_value IS NOT DISTINCT FROM (SELECT p.package_value FROM public.packages p WHERE p.id = id LIMIT 1)
    AND paid_at IS NOT DISTINCT FROM (SELECT p.paid_at FROM public.packages p WHERE p.id = id LIMIT 1)
    AND checkout_request_id IS NOT DISTINCT FROM (SELECT p.checkout_request_id FROM public.packages p WHERE p.id = id LIMIT 1)
  );

-- Replace broad pickup agent update policy
DROP POLICY IF EXISTS "Pickup agents can update their packages" ON public.packages;
CREATE POLICY "Pickup agents can update their packages"
  ON public.packages FOR UPDATE
  TO authenticated
  USING (pickup_agent_id IN (SELECT agents.id FROM agents WHERE agents.user_id = auth.uid()))
  WITH CHECK (
    pickup_agent_id IN (SELECT agents.id FROM agents WHERE agents.user_id = auth.uid())
    AND cost = (SELECT p.cost FROM public.packages p WHERE p.id = id LIMIT 1)
    AND commission IS NOT DISTINCT FROM (SELECT p.commission FROM public.packages p WHERE p.id = id LIMIT 1)
    AND payment_status = (SELECT p.payment_status FROM public.packages p WHERE p.id = id LIMIT 1)
    AND mpesa_receipt_number IS NOT DISTINCT FROM (SELECT p.mpesa_receipt_number FROM public.packages p WHERE p.id = id LIMIT 1)
    AND package_value IS NOT DISTINCT FROM (SELECT p.package_value FROM public.packages p WHERE p.id = id LIMIT 1)
    AND paid_at IS NOT DISTINCT FROM (SELECT p.paid_at FROM public.packages p WHERE p.id = id LIMIT 1)
    AND checkout_request_id IS NOT DISTINCT FROM (SELECT p.checkout_request_id FROM public.packages p WHERE p.id = id LIMIT 1)
  );
