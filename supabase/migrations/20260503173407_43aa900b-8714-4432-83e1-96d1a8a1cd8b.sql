
-- 1. Fix broken package update policies (self-referencing p.id = p.id bug)
DROP POLICY IF EXISTS "Users can update their own packages" ON public.packages;
CREATE POLICY "Users can update their own packages"
ON public.packages FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND cost = (SELECT p.cost FROM public.packages p WHERE p.id = packages.id)
  AND commission IS NOT DISTINCT FROM (SELECT p.commission FROM public.packages p WHERE p.id = packages.id)
  AND payment_status = (SELECT p.payment_status FROM public.packages p WHERE p.id = packages.id)
  AND mpesa_receipt_number IS NOT DISTINCT FROM (SELECT p.mpesa_receipt_number FROM public.packages p WHERE p.id = packages.id)
  AND package_value IS NOT DISTINCT FROM (SELECT p.package_value FROM public.packages p WHERE p.id = packages.id)
  AND paid_at IS NOT DISTINCT FROM (SELECT p.paid_at FROM public.packages p WHERE p.id = packages.id)
  AND checkout_request_id IS NOT DISTINCT FROM (SELECT p.checkout_request_id FROM public.packages p WHERE p.id = packages.id)
);

DROP POLICY IF EXISTS "Agents can update assigned packages" ON public.packages;
CREATE POLICY "Agents can update assigned packages"
ON public.packages FOR UPDATE
USING (auth.uid() = agent_id)
WITH CHECK (
  auth.uid() = agent_id
  AND cost = (SELECT p.cost FROM public.packages p WHERE p.id = packages.id)
  AND commission IS NOT DISTINCT FROM (SELECT p.commission FROM public.packages p WHERE p.id = packages.id)
  AND payment_status = (SELECT p.payment_status FROM public.packages p WHERE p.id = packages.id)
  AND mpesa_receipt_number IS NOT DISTINCT FROM (SELECT p.mpesa_receipt_number FROM public.packages p WHERE p.id = packages.id)
  AND package_value IS NOT DISTINCT FROM (SELECT p.package_value FROM public.packages p WHERE p.id = packages.id)
  AND paid_at IS NOT DISTINCT FROM (SELECT p.paid_at FROM public.packages p WHERE p.id = packages.id)
  AND checkout_request_id IS NOT DISTINCT FROM (SELECT p.checkout_request_id FROM public.packages p WHERE p.id = packages.id)
);

DROP POLICY IF EXISTS "Pickup agents can update their packages" ON public.packages;
CREATE POLICY "Pickup agents can update their packages"
ON public.packages FOR UPDATE TO authenticated
USING (pickup_agent_id IN (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid()))
WITH CHECK (
  pickup_agent_id IN (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid())
  AND cost = (SELECT p.cost FROM public.packages p WHERE p.id = packages.id)
  AND commission IS NOT DISTINCT FROM (SELECT p.commission FROM public.packages p WHERE p.id = packages.id)
  AND payment_status = (SELECT p.payment_status FROM public.packages p WHERE p.id = packages.id)
  AND mpesa_receipt_number IS NOT DISTINCT FROM (SELECT p.mpesa_receipt_number FROM public.packages p WHERE p.id = packages.id)
  AND package_value IS NOT DISTINCT FROM (SELECT p.package_value FROM public.packages p WHERE p.id = packages.id)
  AND paid_at IS NOT DISTINCT FROM (SELECT p.paid_at FROM public.packages p WHERE p.id = packages.id)
  AND checkout_request_id IS NOT DISTINCT FROM (SELECT p.checkout_request_id FROM public.packages p WHERE p.id = packages.id)
);

-- 2. Remove profiles.role check from has_role to prevent privilege escalation
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN _role = 'admin'::user_role THEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id AND ur.role = 'admin'::user_role
    ) OR EXISTS (
      SELECT 1 FROM public.admin_levels al WHERE al.user_id = _user_id
    )
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id AND ur.role = _role
    )
  END
$$;

-- 3. Restrict ticket_messages is_admin impersonation
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.ticket_messages;
CREATE POLICY "Authenticated users can send messages"
ON public.ticket_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND (is_admin = false OR public.has_role(auth.uid(), 'admin'::user_role))
);

-- 4. Restrict agent phone visibility - only show non-sensitive columns to general authenticated users via policy revision
-- Replace broad policy with one that allows owners/admins full access; create a public view for safe columns.
DROP POLICY IF EXISTS "Authenticated users can view active agents" ON public.agents;
CREATE OR REPLACE VIEW public.agents_public AS
  SELECT id, business_name, location, address, latitude, longitude,
         operating_hours, services, is_active
  FROM public.agents
  WHERE is_active = true;
GRANT SELECT ON public.agents_public TO authenticated, anon;

-- Keep admins/owners able to see full row; add policy for active agents minus phone via app code using the view.
CREATE POLICY "Admins can view all agents"
ON public.agents FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Allow authenticated users to view active agents (full row) — preserve existing app behavior.
-- If stricter is desired, app should use agents_public view. Re-add original policy to avoid breaking app.
CREATE POLICY "Authenticated users can view active agents"
ON public.agents FOR SELECT TO authenticated
USING (is_active = true);

-- 5. Restrict promo_codes columns - create public view and tighten policy to admins only for full table
DROP POLICY IF EXISTS "Authenticated users can view active promos" ON public.promo_codes;
CREATE OR REPLACE VIEW public.promo_codes_public AS
  SELECT id, code, description, discount_type, discount_value, valid_from, valid_until
  FROM public.promo_codes
  WHERE is_active = true;
GRANT SELECT ON public.promo_codes_public TO authenticated, anon;

-- 6. Lock down avatars bucket listing - restrict listing to owners
DO $$
BEGIN
  -- Remove overly broad listing policies if present
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Avatar images are publicly accessible') THEN
    DROP POLICY "Avatar images are publicly accessible" ON storage.objects;
  END IF;
END $$;

-- Allow public read of individual avatar files (bucket is public so URLs work) but no listing via API:
-- We add a SELECT policy scoped to owners only (listing requires SELECT on objects).
CREATE POLICY "Users can view their own avatar objects"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 7. Revoke EXECUTE on SECURITY DEFINER helper functions from anon/authenticated (triggers still work)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, user_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_admin_level(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_user_role() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_wallet_for_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.process_cod_collection() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_package_created() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_package_status_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
