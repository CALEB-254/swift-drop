-- ─────────────────────────────────────────────────────────────
-- Security: authorization fixes on cash collection, package release
-- and wallet payment RPCs + audit logging for blocked rate limits
-- ─────────────────────────────────────────────────────────────

-- 1. collect_delivery_cash: only the assigned rider, the package's agent,
--    or an admin may mark cash collected (was: any authenticated user)
CREATE OR REPLACE FUNCTION public.collect_delivery_cash(_package_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  p RECORD;
  v_fee numeric := 0;
  v_cod numeric := 0;
  v_rider_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO p FROM public.packages WHERE id = _package_id;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Package not found'; END IF;

  IF NOT public.is_admin(v_uid) THEN
    IF p.agent_id IS NOT NULL AND p.agent_id = v_uid THEN
      -- package's pickup agent: allowed
    ELSE
      SELECT id INTO v_rider_id FROM public.riders WHERE user_id = v_uid;
      IF v_rider_id IS NULL OR p.assigned_rider_id IS NULL OR p.assigned_rider_id <> v_rider_id THEN
        RAISE EXCEPTION 'You are not assigned to this package';
      END IF;
    END IF;
  END IF;

  IF p.fee_on_delivery AND NOT p.fee_collected THEN
    v_fee := COALESCE(p.cost, 0);
  END IF;
  IF COALESCE(p.cod_amount,0) > 0 AND NOT COALESCE(p.cod_collected,false) THEN
    v_cod := p.cod_amount;
  END IF;

  UPDATE public.packages SET
    fee_collected = CASE WHEN fee_on_delivery THEN true ELSE fee_collected END,
    fee_collected_at = CASE WHEN fee_on_delivery AND fee_collected_at IS NULL THEN now() ELSE fee_collected_at END,
    payment_status = CASE WHEN fee_on_delivery THEN 'paid' ELSE payment_status END,
    paid_at = CASE WHEN fee_on_delivery AND paid_at IS NULL THEN now() ELSE paid_at END,
    cod_collected = CASE WHEN COALESCE(cod_amount,0) > 0 THEN true ELSE cod_collected END,
    updated_at = now()
  WHERE id = _package_id;

  RETURN jsonb_build_object('success', true, 'fee_collected', v_fee, 'cod_collected', v_cod, 'total', v_fee + v_cod);
END;
$function$;

-- 2. release_package: only the package's agent, assigned rider or admin
CREATE OR REPLACE FUNCTION public.release_package(_package_id uuid, _release_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actual text; v_status public.package_status; v_uid uuid := auth.uid();
  v_rider_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT release_code, status INTO v_actual, v_status FROM public.packages WHERE id = _package_id;
  IF v_actual IS NULL THEN RAISE EXCEPTION 'Package not found'; END IF;
  IF v_status = 'delivered' THEN RAISE EXCEPTION 'Already delivered'; END IF;
  IF trim(_release_code) <> v_actual THEN RAISE EXCEPTION 'Invalid release code'; END IF;

  IF NOT public.is_admin(v_uid) THEN
    SELECT id INTO v_rider_id FROM public.riders WHERE user_id = v_uid;
    IF NOT EXISTS (SELECT 1 FROM public.packages p
                   WHERE p.id = _package_id
                     AND (p.agent_id = v_uid
                          OR (v_rider_id IS NOT NULL AND p.assigned_rider_id = v_rider_id))) THEN
      RAISE EXCEPTION 'You are not assigned to this package';
    END IF;
  END IF;

  UPDATE public.packages SET status = 'delivered'::public.package_status, updated_at = now()
    WHERE id = _package_id;
  RETURN jsonb_build_object('success', true);
END;
$function$;

-- 3. release_package_without_code: same assignment requirement
CREATE OR REPLACE FUNCTION public.release_package_without_code(_package_id uuid, _receiver_name text, _receiver_id_number text, _receiver_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pkg public.packages%ROWTYPE;
  v_actor_name text;
  v_actor_role text;
  v_uid uuid := auth.uid();
  v_rider_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_pkg FROM public.packages WHERE id = _package_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;
  IF v_pkg.status = 'delivered' THEN RAISE EXCEPTION 'Already delivered'; END IF;
  IF v_pkg.delivery_type = 'doorstep' THEN
    RAISE EXCEPTION 'Doorstep deliveries require the release code';
  END IF;

  IF NOT public.is_admin(v_uid) THEN
    SELECT id INTO v_rider_id FROM public.riders WHERE user_id = v_uid;
    IF (v_pkg.agent_id IS NULL OR v_pkg.agent_id <> v_uid)
       AND (v_rider_id IS NULL OR v_pkg.assigned_rider_id IS NULL OR v_pkg.assigned_rider_id <> v_rider_id) THEN
      RAISE EXCEPTION 'You are not assigned to this package';
    END IF;
  END IF;

  IF coalesce(trim(_receiver_name), '') = '' THEN RAISE EXCEPTION 'Receiver name is required'; END IF;
  IF coalesce(trim(_receiver_id_number), '') = '' THEN RAISE EXCEPTION 'Receiver ID number is required'; END IF;
  IF public.normalize_ke_phone(_receiver_phone) IS NULL THEN RAISE EXCEPTION 'Enter a valid receiver phone number'; END IF;

  SELECT full_name, role::text INTO v_actor_name, v_actor_role
  FROM public.profiles WHERE user_id = v_uid LIMIT 1;

  UPDATE public.packages
     SET status = 'delivered'::public.package_status, updated_at = now()
   WHERE id = _package_id;

  INSERT INTO public.package_logs (
    package_id, tracking_number, actor_id, actor_name, actor_role,
    action, status_before, status_after, notes
  ) VALUES (
    v_pkg.id, v_pkg.tracking_number, v_uid,
    coalesce(v_actor_name, 'Staff'), coalesce(v_actor_role, 'staff'),
    'Package Given Out Without Code', v_pkg.status::text, 'delivered',
    'Receiver: ' || trim(_receiver_name) ||
    ' | ID: ' || trim(_receiver_id_number) ||
    ' | Phone: ' || public.normalize_ke_phone(_receiver_phone)
  );

  INSERT INTO public.notifications (user_id, title, message, type, tracking_number, category)
  VALUES (
    v_pkg.user_id,
    'Package Given Out',
    'Package ' || v_pkg.tracking_number || ' was handed over without a release code to ' ||
    trim(_receiver_name) || ' (ID ' || trim(_receiver_id_number) || ', ' ||
    public.normalize_ke_phone(_receiver_phone) || ').',
    'delivered', v_pkg.tracking_number, 'package'
  );

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- 4. The old no-PIN wallet payment overload must no longer be callable by
--    clients; the PIN variant is the only supported path.
REVOKE ALL ON FUNCTION public.pay_with_pochi(uuid[]) FROM PUBLIC, anon, authenticated;

-- 5. Audit-log blocked package-creation attempts
CREATE OR REPLACE FUNCTION public.rate_limit_package_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_uid IS NULL OR public.is_admin(v_uid) THEN
    RETURN NEW;
  END IF;
  v_result := public.check_rate_limit('pkg-create:' || v_uid::text, 'package_create', 100, 3600, 0, NULL, v_uid);
  IF NOT (v_result ->> 'allowed')::boolean THEN
    INSERT INTO public.audit_logs (admin_id, action, target_table, target_id)
    VALUES (v_uid, 'rate_limit_blocked', 'packages', 'package_create');
    RAISE EXCEPTION 'Too many deliveries created in a short time. Please try again in a few minutes.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
