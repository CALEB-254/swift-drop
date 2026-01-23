-- Create enum for delivery type
CREATE TYPE public.delivery_type AS ENUM ('xpress', 'pickup_point', 'doorstep', 'errand');

-- Create enum for package status
CREATE TYPE public.package_status AS ENUM ('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled');

-- Create packages table
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  sender_address TEXT,
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT NOT NULL,
  receiver_address TEXT NOT NULL,
  delivery_type delivery_type NOT NULL,
  pickup_point TEXT,
  package_description TEXT,
  package_value NUMERIC,
  packaging_color TEXT,
  weight NUMERIC DEFAULT 0,
  cost NUMERIC NOT NULL,
  commission NUMERIC,
  status package_status NOT NULL DEFAULT 'pending',
  agent_id UUID REFERENCES auth.users(id),
  is_product BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- Users can view their own packages (as sender)
CREATE POLICY "Users can view their own packages"
ON public.packages
FOR SELECT
USING (auth.uid() = user_id);

-- Agents can view packages assigned to them
CREATE POLICY "Agents can view assigned packages"
ON public.packages
FOR SELECT
USING (auth.uid() = agent_id);

-- Users can create packages
CREATE POLICY "Users can create packages"
ON public.packages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own packages
CREATE POLICY "Users can update their own packages"
ON public.packages
FOR UPDATE
USING (auth.uid() = user_id);

-- Agents can update assigned packages
CREATE POLICY "Agents can update assigned packages"
ON public.packages
FOR UPDATE
USING (auth.uid() = agent_id);

-- Add trigger for updated_at
CREATE TRIGGER update_packages_updated_at
BEFORE UPDATE ON public.packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create notification on package status change
CREATE OR REPLACE FUNCTION public.notify_package_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  status_title TEXT;
  status_message TEXT;
BEGIN
  -- Only trigger on status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Set notification content based on new status
    CASE NEW.status
      WHEN 'pending' THEN
        status_title := 'Delivery Created';
        status_message := 'Your package ' || NEW.tracking_number || ' has been created and is pending pickup.';
      WHEN 'picked_up' THEN
        status_title := 'Package Picked Up';
        status_message := 'Your package ' || NEW.tracking_number || ' has been picked up by our agent.';
      WHEN 'in_transit' THEN
        status_title := 'Package In Transit';
        status_message := 'Your package ' || NEW.tracking_number || ' is on its way.';
      WHEN 'out_for_delivery' THEN
        status_title := 'Out for Delivery';
        status_message := 'Your package ' || NEW.tracking_number || ' is out for delivery and will arrive soon.';
      WHEN 'delivered' THEN
        status_title := 'Package Delivered';
        status_message := 'Your package ' || NEW.tracking_number || ' has been successfully delivered.';
      WHEN 'cancelled' THEN
        status_title := 'Delivery Cancelled';
        status_message := 'Your package ' || NEW.tracking_number || ' has been cancelled.';
      ELSE
        status_title := 'Status Update';
        status_message := 'Your package ' || NEW.tracking_number || ' status has been updated.';
    END CASE;

    -- Insert notification for the sender
    INSERT INTO public.notifications (user_id, title, message, type, tracking_number)
    VALUES (NEW.user_id, status_title, status_message, NEW.status::text, NEW.tracking_number);
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for status change notifications
CREATE TRIGGER package_status_notification
AFTER UPDATE ON public.packages
FOR EACH ROW
EXECUTE FUNCTION public.notify_package_status_change();

-- Function to create initial notification on package creation
CREATE OR REPLACE FUNCTION public.notify_package_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, tracking_number)
  VALUES (
    NEW.user_id,
    'Delivery Created',
    'Your package ' || NEW.tracking_number || ' has been created and is pending pickup.',
    'delivery_created',
    NEW.tracking_number
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new package notifications
CREATE TRIGGER package_created_notification
AFTER INSERT ON public.packages
FOR EACH ROW
EXECUTE FUNCTION public.notify_package_created();

-- Enable realtime for packages
ALTER PUBLICATION supabase_realtime ADD TABLE public.packages;