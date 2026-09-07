
CREATE OR REPLACE FUNCTION public.notify_admins(_title text, _message text, _type text, _tracking text, _category text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, tracking_number, category)
  SELECT ur.user_id, _title, _message, _type, _tracking, _category
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_rider_package_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rider_user uuid;
BEGIN
  IF NEW.assigned_rider_id IS NOT NULL THEN
    SELECT r.user_id INTO _rider_user FROM public.riders r WHERE r.id = NEW.assigned_rider_id;
  END IF;

  IF _rider_user IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.assigned_rider_id IS DISTINCT FROM OLD.assigned_rider_id THEN
    INSERT INTO public.notifications (user_id, title, message, type, tracking_number, category)
    VALUES (_rider_user, 'New package assigned',
      'Package ' || NEW.tracking_number || ' has been assigned to you for delivery to ' || COALESCE(NEW.receiver_name, 'the recipient') || '.',
      'info', NEW.tracking_number, 'delivery');
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('picked_up', 'in_transit', 'out_for_delivery') THEN
      INSERT INTO public.notifications (user_id, title, message, type, tracking_number, category)
      VALUES (_rider_user, 'Package collected',
        'Package ' || NEW.tracking_number || ' is now ' || replace(NEW.status::text, '_', ' ') || '.',
        'info', NEW.tracking_number, 'delivery');
    ELSIF NEW.status = 'awaiting_payment' THEN
      INSERT INTO public.notifications (user_id, title, message, type, tracking_number, category)
      VALUES (_rider_user, 'Awaiting payment',
        'Package ' || NEW.tracking_number || ' is awaiting payment before hand over.',
        'warning', NEW.tracking_number, 'payment');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_rider_package_events ON public.packages;
CREATE TRIGGER trg_notify_rider_package_events
AFTER INSERT OR UPDATE ON public.packages
FOR EACH ROW EXECUTE FUNCTION public.notify_rider_package_events();

CREATE OR REPLACE FUNCTION public.notify_cash_collection_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rider_user uuid;
  _title text;
  _msg text;
  _type text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'paid' THEN
    _title := 'Payment received';
    _msg := 'KES ' || NEW.total_amount || ' collected for package ' || NEW.tracking_number || '.';
    _type := 'success';
  ELSIF NEW.status IN ('failed', 'cancelled') THEN
    _title := 'Payment failed';
    _msg := 'Payment of KES ' || NEW.total_amount || ' for package ' || NEW.tracking_number || ' did not go through.';
    _type := 'error';
  ELSE
    RETURN NEW;
  END IF;

  IF NEW.rider_id IS NOT NULL THEN
    SELECT r.user_id INTO _rider_user FROM public.riders r WHERE r.id = NEW.rider_id;
    IF _rider_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, tracking_number, category)
      VALUES (_rider_user, _title, _msg, _type, NEW.tracking_number, 'payment');
    END IF;
  END IF;

  PERFORM public.notify_admins(_title, _msg, _type, NEW.tracking_number, 'payment');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_cash_collection_result ON public.cash_collections;
CREATE TRIGGER trg_notify_cash_collection_result
AFTER INSERT OR UPDATE ON public.cash_collections
FOR EACH ROW EXECUTE FUNCTION public.notify_cash_collection_result();

REVOKE EXECUTE ON FUNCTION public.notify_admins(text, text, text, text, text) FROM anon, authenticated;
