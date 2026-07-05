
-- 1) New status
ALTER TYPE public.package_status ADD VALUE IF NOT EXISTS 'received_in_warehouse';

-- 2) Immediate conversion returning sender phone + balance
CREATE OR REPLACE FUNCTION public.admin_convert_to_doorstep(_package_id uuid, _new_cost numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_prev_cost numeric; v_paid text; v_balance numeric;
  v_user uuid; v_track text; v_phone text;
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin(v_uid) THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT cost, payment_status, user_id, tracking_number, sender_phone
    INTO v_prev_cost, v_paid, v_user, v_track, v_phone
    FROM public.packages WHERE id = _package_id;
  IF v_prev_cost IS NULL THEN RAISE EXCEPTION 'Package not found'; END IF;

  v_balance := CASE WHEN v_paid = 'paid' THEN GREATEST(_new_cost - v_prev_cost, 0) ELSE _new_cost END;

  UPDATE public.packages
    SET delivery_type = 'doorstep'::public.delivery_type,
        cost = _new_cost,
        original_paid_amount = CASE WHEN v_paid = 'paid' THEN v_prev_cost ELSE original_paid_amount END,
        payment_balance_due = v_balance,
        payment_status = CASE WHEN v_balance > 0 THEN 'pending' ELSE 'paid' END,
        pending_conversion_type = NULL,
        pending_conversion_cost = NULL,
        pending_conversion_balance = NULL,
        updated_at = now()
    WHERE id = _package_id;

  INSERT INTO public.notifications (user_id, title, message, type, tracking_number)
  VALUES (
    v_user,
    'Converted to Doorstep',
    'Package ' || v_track || ' has been converted to Doorstep. ' ||
    CASE WHEN v_balance > 0
      THEN 'A KES ' || v_balance::text || ' M-Pesa prompt has been sent to ' || COALESCE(v_phone,'your phone') || ' for the balance.'
      ELSE 'No additional payment is required.' END,
    'conversion_applied', v_track
  );

  RETURN jsonb_build_object('success', true, 'balance_due', v_balance, 'phone', v_phone, 'tracking_number', v_track);
END; $$;
