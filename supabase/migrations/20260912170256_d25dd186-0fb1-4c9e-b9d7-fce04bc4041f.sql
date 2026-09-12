-- 1) Post the release code into the package journey at creation time
CREATE OR REPLACE FUNCTION public.notify_release_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.release_code IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, tracking_number, category)
    VALUES (
      NEW.user_id,
      'Release Code',
      'Release code for package ' || NEW.tracking_number || ' is ' || NEW.release_code ||
      '. Share it only with the receiver at handover.',
      'release_code',
      NEW.tracking_number,
      'package'
    );
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.notify_release_code() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_release_code ON public.packages;
CREATE TRIGGER trg_notify_release_code
AFTER INSERT ON public.packages
FOR EACH ROW EXECUTE FUNCTION public.notify_release_code();

-- 2) Handover without a release code (not allowed for doorstep)
CREATE OR REPLACE FUNCTION public.release_package_without_code(
  _package_id uuid,
  _receiver_name text,
  _receiver_id_number text,
  _receiver_phone text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_pkg public.packages%ROWTYPE;
  v_actor_name text;
  v_actor_role text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_pkg FROM public.packages WHERE id = _package_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;
  IF v_pkg.status = 'delivered' THEN RAISE EXCEPTION 'Already delivered'; END IF;
  IF v_pkg.delivery_type = 'doorstep' THEN
    RAISE EXCEPTION 'Doorstep deliveries require the release code';
  END IF;

  IF coalesce(trim(_receiver_name), '') = '' THEN RAISE EXCEPTION 'Receiver name is required'; END IF;
  IF coalesce(trim(_receiver_id_number), '') = '' THEN RAISE EXCEPTION 'Receiver ID number is required'; END IF;
  IF public.normalize_ke_phone(_receiver_phone) IS NULL THEN RAISE EXCEPTION 'Enter a valid receiver phone number'; END IF;

  SELECT full_name, role::text INTO v_actor_name, v_actor_role
  FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  UPDATE public.packages
     SET status = 'delivered'::public.package_status, updated_at = now()
   WHERE id = _package_id;

  INSERT INTO public.package_logs (
    package_id, tracking_number, actor_id, actor_name, actor_role,
    action, status_before, status_after, notes
  ) VALUES (
    v_pkg.id, v_pkg.tracking_number, auth.uid(),
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
END; $$;

REVOKE EXECUTE ON FUNCTION public.release_package_without_code(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_package_without_code(uuid, text, text, text) TO authenticated;