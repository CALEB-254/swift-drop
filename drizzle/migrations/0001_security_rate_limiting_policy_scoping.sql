-- ─────────────────────────────────────────────────────────────
-- Security hardening: rate limiting + policy role scoping
-- ─────────────────────────────────────────────────────────────

-- 1. Rate limit hit store (service-role and security-definer access only)
CREATE TABLE public.rate_limit_hits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key text NOT NULL,
  endpoint text NOT NULL,
  ip_address text,
  user_id uuid,
  hit_at timestamptz NOT NULL DEFAULT now(),
  blocked boolean NOT NULL DEFAULT false
);
CREATE INDEX rate_limit_hits_bucket_idx ON public.rate_limit_hits (bucket_key, hit_at DESC);
CREATE INDEX rate_limit_hits_cleanup_idx ON public.rate_limit_hits (hit_at);
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.rate_limit_hits TO service_role;

-- 2. Generic rate limit checker (fixed window per bucket; optional lockout)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _bucket_key text,
  _endpoint text,
  _max_hits integer,
  _window_seconds integer,
  _lockout_seconds integer DEFAULT 0,
  _ip text DEFAULT NULL,
  _user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hits integer;
  v_first_hit timestamptz;
  v_retry_after integer;
BEGIN
  -- Housekeeping: drop rows older than a day
  DELETE FROM public.rate_limit_hits WHERE hit_at < now() - interval '24 hours';

  SELECT count(*), min(hit_at) INTO v_hits, v_first_hit
  FROM public.rate_limit_hits
  WHERE bucket_key = _bucket_key
    AND hit_at > now() - make_interval(secs => GREATEST(_window_seconds, 1));

  IF v_hits >= GREATEST(_max_hits, 1) THEN
    v_retry_after := GREATEST(1, CEIL(EXTRACT(epoch FROM (
      v_first_hit + make_interval(secs => GREATEST(_window_seconds, 1)) - now()
    )))::integer);
    IF _lockout_seconds > 0 THEN
      v_retry_after := GREATEST(v_retry_after, _lockout_seconds);
    END IF;
    INSERT INTO public.rate_limit_hits (bucket_key, endpoint, ip_address, user_id, blocked)
    VALUES (_bucket_key, _endpoint, _ip, _user_id, true);
    RETURN jsonb_build_object('allowed', false, 'retry_after', v_retry_after, 'hits', v_hits);
  END IF;

  INSERT INTO public.rate_limit_hits (bucket_key, endpoint, ip_address, user_id)
  VALUES (_bucket_key, _endpoint, _ip, _user_id, false);
  RETURN jsonb_build_object('allowed', true, 'retry_after', 0, 'hits', v_hits + 1);
END;
$$;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer, integer, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer, integer, text, uuid) TO service_role;

-- 3. Rate limit package creation per user (soft abuse guard)
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
    RAISE EXCEPTION 'Too many deliveries created in a short time. Please try again in a few minutes.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.rate_limit_package_insert() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_rate_limit_package_insert ON public.packages;
CREATE TRIGGER trg_rate_limit_package_insert
  BEFORE INSERT ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.rate_limit_package_insert();

-- 4. Rate limit public tracking lookups (per tracking number)
CREATE OR REPLACE FUNCTION public.get_public_tracking(_tracking_number text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p RECORD;
  events jsonb;
  v_result jsonb;
BEGIN
  v_result := public.check_rate_limit(
    'tracking:' || lower(trim(_tracking_number)), 'public_tracking', 30, 3600, 0);
  IF NOT (v_result ->> 'allowed')::boolean THEN
    RAISE EXCEPTION 'Too many tracking requests for this parcel. Please try again later.' USING ERRCODE = 'P0001';
  END IF;

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
END;
$function$;

-- 5. Scope every table policy to authenticated (anon has no row access;
--    public tracking uses security-definer functions instead)
ALTER POLICY "Admins can update agents" ON public.agents TO authenticated;
ALTER POLICY "Admins can delete agents" ON public.agents TO authenticated;
ALTER POLICY "Agents can view their own record" ON public.agents TO authenticated;
ALTER POLICY "Agents can update their own record" ON public.agents TO authenticated;
ALTER POLICY "Users can update their own notifications" ON public.notifications TO authenticated;
ALTER POLICY "Users can delete their own notifications" ON public.notifications TO authenticated;
ALTER POLICY "Users can insert their own notifications" ON public.notifications TO authenticated;
ALTER POLICY "Admins can view all notifications" ON public.notifications TO authenticated;
ALTER POLICY "Users can view their own notifications" ON public.notifications TO authenticated;
ALTER POLICY "Agents can view pending unassigned packages" ON public.packages TO authenticated;
ALTER POLICY "Users can view their own packages" ON public.packages TO authenticated;
ALTER POLICY "Pickup agents can update their packages" ON public.packages TO authenticated;
ALTER POLICY "Admins can delete any package" ON public.packages TO authenticated;
ALTER POLICY "Admins can view all packages" ON public.packages TO authenticated;
ALTER POLICY "Users can update their own packages" ON public.packages TO authenticated;
ALTER POLICY "Users can delete their unpaid pending packages" ON public.packages TO authenticated;
ALTER POLICY "Agents can update assigned packages" ON public.packages TO authenticated;
ALTER POLICY "Agents can view assigned packages" ON public.packages TO authenticated;
ALTER POLICY "Users can create packages" ON public.packages TO authenticated;
ALTER POLICY "Admins can view all profiles" ON public.profiles TO authenticated;
ALTER POLICY "Users can view their own profile" ON public.profiles TO authenticated;
ALTER POLICY "Users can insert their own profile" ON public.profiles TO authenticated;
ALTER POLICY "Users can update their own profile" ON public.profiles TO authenticated;
ALTER POLICY "Users can manage their own preferences" ON public.user_preferences TO authenticated;
ALTER POLICY "Users can view their own roles" ON public.user_roles TO authenticated;

-- 6. Tighten EXECUTE grants: role-inspection and trigger helpers are no
--    longer callable by anonymous users or directly by clients
REVOKE ALL ON FUNCTION public.has_role(uuid, user_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_level(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_package_release_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stamp_notification_read() FROM PUBLIC, anon, authenticated;
