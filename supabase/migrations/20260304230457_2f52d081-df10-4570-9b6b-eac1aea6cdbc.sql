
CREATE OR REPLACE FUNCTION public.notify_package_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  status_title TEXT;
  status_message TEXT;
  actor_name TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.agent_id IS NOT NULL THEN
      SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = NEW.agent_id LIMIT 1;
    ELSE
      SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
    END IF;
    
    IF actor_name IS NULL THEN
      actor_name := 'System';
    END IF;

    CASE NEW.status
      WHEN 'pending' THEN
        status_title := 'Delivery Created';
        status_message := 'Your package ' || NEW.tracking_number || ' has been created and is pending pickup.';
      WHEN 'dropped_at_agent' THEN
        status_title := 'Package Dropped at Agent';
        status_message := 'Your package ' || NEW.tracking_number || ' has been dropped at the agent pickup point. Ready for collection.';
      WHEN 'picked_up' THEN
        status_title := 'Package Picked Up';
        status_message := 'Your package ' || NEW.tracking_number || ' has been picked up by ' || actor_name || '.';
      WHEN 'in_transit' THEN
        status_title := 'Package In Transit';
        status_message := 'Your package ' || NEW.tracking_number || ' is on its way. Updated by ' || actor_name || '.';
      WHEN 'out_for_delivery' THEN
        status_title := 'Out for Delivery';
        status_message := 'Your package ' || NEW.tracking_number || ' is out for delivery. Agent: ' || actor_name || '.';
      WHEN 'delivered' THEN
        status_title := 'Package Delivered';
        status_message := 'Your package ' || NEW.tracking_number || ' has been delivered by ' || actor_name || '.';
      WHEN 'cancelled' THEN
        status_title := 'Delivery Cancelled';
        status_message := 'Your package ' || NEW.tracking_number || ' has been cancelled by ' || actor_name || '.';
      ELSE
        status_title := 'Status Update';
        status_message := 'Your package ' || NEW.tracking_number || ' status updated by ' || actor_name || '.';
    END CASE;

    -- Notify sender
    INSERT INTO public.notifications (user_id, title, message, type, tracking_number)
    VALUES (NEW.user_id, status_title, status_message, NEW.status::text, NEW.tracking_number);
  END IF;

  RETURN NEW;
END;
$function$;
