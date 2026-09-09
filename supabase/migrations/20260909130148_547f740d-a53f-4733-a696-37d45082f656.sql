
-- 1. Only super admins may grant the 'admin' role
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert non-admin roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::user_role)
  AND (role <> 'admin'::user_role OR public.is_super_admin(auth.uid()))
);

DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete non-admin roles"
ON public.user_roles FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::user_role)
  AND (role <> 'admin'::user_role OR public.is_super_admin(auth.uid()))
);

CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _role user_role)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin(v_uid) THEN
    RAISE EXCEPTION 'Admins only';
  END IF;
  IF _role = 'admin'::user_role AND NOT public.is_super_admin(v_uid) THEN
    RAISE EXCEPTION 'Only a super admin can grant admin access';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'::user_role)
     AND _role <> 'admin'::user_role
     AND NOT public.is_super_admin(v_uid) THEN
    RAISE EXCEPTION 'Only a super admin can change an admin account';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id AND role <> _role;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  UPDATE public.profiles SET role = _role, updated_at = now() WHERE user_id = _user_id;
  IF _role <> 'admin'::user_role THEN
    DELETE FROM public.admin_levels WHERE user_id = _user_id;
  END IF;
  RETURN jsonb_build_object('success', true);
END; $$;

-- 2. Validate financial fields when a package is created
CREATE OR REPLACE FUNCTION public.enforce_package_insert_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR public.is_admin(v_uid) THEN
    RETURN NEW;
  END IF;
  IF NEW.cost IS NULL OR NEW.cost < 0 OR NEW.cost > 2000 THEN
    RAISE EXCEPTION 'Invalid delivery cost';
  END IF;
  IF COALESCE(NEW.cod_amount, 0) < 0 OR COALESCE(NEW.cod_amount, 0) > 200000 THEN
    RAISE EXCEPTION 'Invalid cash-on-delivery amount';
  END IF;
  NEW.commission := round(NEW.cost * 0.15, 2);
  IF NEW.payment_status IS NULL OR NEW.payment_status NOT IN ('pending', 'pay_on_delivery') THEN
    NEW.payment_status := 'pending';
  END IF;
  NEW.mpesa_receipt_number := NULL;
  NEW.paid_at := NULL;
  NEW.checkout_request_id := NULL;
  NEW.original_paid_amount := NULL;
  NEW.payment_balance_due := 0;
  NEW.fee_collected := false;
  NEW.fee_collected_at := NULL;
  NEW.cod_collected := false;
  NEW.pending_conversion_type := NULL;
  NEW.pending_conversion_cost := NULL;
  NEW.pending_conversion_balance := NULL;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_package_insert_integrity ON public.packages;
CREATE TRIGGER trg_enforce_package_insert_integrity
BEFORE INSERT ON public.packages
FOR EACH ROW EXECUTE FUNCTION public.enforce_package_insert_integrity();

-- 3. Lock all financial fields on update for non-admins
CREATE OR REPLACE FUNCTION public.enforce_package_field_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
     OR NEW.checkout_request_id IS DISTINCT FROM OLD.checkout_request_id
     OR NEW.cod_amount IS DISTINCT FROM OLD.cod_amount
     OR NEW.cod_collected IS DISTINCT FROM OLD.cod_collected
     OR NEW.fee_on_delivery IS DISTINCT FROM OLD.fee_on_delivery
     OR NEW.fee_collected IS DISTINCT FROM OLD.fee_collected
     OR NEW.fee_collected_at IS DISTINCT FROM OLD.fee_collected_at
     OR NEW.payment_balance_due IS DISTINCT FROM OLD.payment_balance_due
     OR NEW.original_paid_amount IS DISTINCT FROM OLD.original_paid_amount
     OR NEW.pending_conversion_type IS DISTINCT FROM OLD.pending_conversion_type
     OR NEW.pending_conversion_cost IS DISTINCT FROM OLD.pending_conversion_cost
     OR NEW.pending_conversion_balance IS DISTINCT FROM OLD.pending_conversion_balance
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.tracking_number IS DISTINCT FROM OLD.tracking_number
     OR NEW.release_code IS DISTINCT FROM OLD.release_code THEN
    RAISE EXCEPTION 'Financial fields can only be modified by admins or backend functions';
  END IF;
  RETURN NEW;
END; $$;

-- 4. Notification media must not be readable by signed-out visitors
DROP POLICY IF EXISTS "Notification media is publicly readable" ON storage.objects;
CREATE POLICY "Signed-in users can read notification media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'notification-media');

-- 5. Public tracking must not expose the full delivery address
CREATE OR REPLACE FUNCTION public.get_public_tracking(_tracking_number text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  p RECORD;
  events jsonb;
BEGIN
  SELECT * INTO p FROM public.packages
  WHERE lower(tracking_number) = lower(trim(_tracking_number))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', n.id, 'title', n.title, 'message', n.message,
           'type', n.type, 'created_at', n.created_at
         ) ORDER BY n.created_at), '[]'::jsonb)
  INTO events
  FROM (
    SELECT DISTINCT ON (title, message) id, title, message, type, created_at
    FROM public.notifications
    WHERE tracking_number = p.tracking_number
    ORDER BY title, message, created_at
  ) n;

  RETURN jsonb_build_object(
    'found', true,
    'tracking_number', p.tracking_number,
    'status', p.status,
    'delivery_type', p.delivery_type,
    'pickup_point', p.pickup_point,
    'receiver_name', left(p.receiver_name, 2) || repeat('*', greatest(length(p.receiver_name) - 2, 0)),
    'sender_name', left(p.sender_name, 2) || repeat('*', greatest(length(p.sender_name) - 2, 0)),
    'destination', COALESCE(p.pickup_point, left(COALESCE(p.receiver_address, ''), 4) || '****'),
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'events', events
  );
END; $$;

-- 6. Lock down direct execution of SECURITY DEFINER functions
DO $do$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $do$;

GRANT EXECUTE ON FUNCTION
  public.has_role(uuid, user_role),
  public.is_admin(uuid),
  public.is_super_admin(uuid),
  public.get_user_role(uuid),
  public.get_admin_level(uuid),
  public.get_public_tracking(text),
  public.get_shared_tracking(text, text),
  public.phone_in_use(text)
TO anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.accept_conversion(uuid),
  public.reject_conversion(uuid),
  public.admin_convert_to_doorstep(uuid, numeric),
  public.admin_set_user_role(uuid, user_role),
  public.collect_delivery_cash(uuid),
  public.consume_pochi_withdrawal_code(text),
  public.create_pochi_withdrawal_code(numeric, text),
  public.create_tracking_link(uuid, text, timestamptz),
  public.flag_cash_dispute(uuid, text),
  public.pay_with_pochi(uuid[]),
  public.pay_with_pochi(uuid[], text),
  public.release_package(uuid, text),
  public.resolve_cash_dispute(uuid, text),
  public.setup_pochi_security(text, text, text),
  public.verify_pochi_pin(text)
TO authenticated;
