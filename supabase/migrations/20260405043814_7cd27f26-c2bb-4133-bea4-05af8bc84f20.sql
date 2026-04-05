
-- Create riders table
CREATE TABLE public.riders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_type TEXT DEFAULT 'motorcycle',
  license_plate TEXT,
  is_online BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  rating NUMERIC DEFAULT 0,
  total_deliveries INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage riders" ON public.riders FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Riders can view their own record" ON public.riders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Riders can update their own record" ON public.riders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_riders_updated_at BEFORE UPDATE ON public.riders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add assigned_rider_id to packages
ALTER TABLE public.packages ADD COLUMN assigned_rider_id UUID REFERENCES public.riders(id);

-- Broadcast notifications table
CREATE TABLE public.broadcast_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'all',
  target_user_ids UUID[] DEFAULT '{}',
  sent_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.broadcast_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage broadcasts" ON public.broadcast_notifications FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can view broadcasts targeting them" ON public.broadcast_notifications FOR SELECT TO authenticated
  USING (target_type = 'all' OR auth.uid() = ANY(target_user_ids));
