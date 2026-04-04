
-- Admin role levels enum
CREATE TYPE public.admin_role AS ENUM ('super_admin', 'operations_admin', 'finance_admin', 'support_admin');

-- Support ticket status and priority enums
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Support tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'open',
  priority public.ticket_priority NOT NULL DEFAULT 'medium',
  category TEXT DEFAULT 'general',
  assigned_admin_id UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own tickets" ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tickets" ON public.support_tickets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets" ON public.support_tickets
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update all tickets" ON public.support_tickets
  FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ticket messages (conversation thread)
CREATE TABLE public.ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket participants can view messages" ON public.ticket_messages
  FOR SELECT TO authenticated USING (
    sender_id = auth.uid() OR
    public.has_role(auth.uid(), 'admin'::user_role) OR
    ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can send messages" ON public.ticket_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- System configuration table
CREATE TABLE public.system_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system config" ON public.system_config
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Promo codes table
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  min_order NUMERIC DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Authenticated users can view active promos" ON public.promo_codes
  FOR SELECT TO authenticated USING (is_active = true);

CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin levels table
CREATE TABLE public.admin_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  admin_role public.admin_role NOT NULL DEFAULT 'operations_admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_levels ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin level
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_levels
    WHERE user_id = _user_id AND admin_role = 'super_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.get_admin_level(_user_id uuid)
RETURNS public.admin_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT admin_role FROM public.admin_levels
  WHERE user_id = _user_id LIMIT 1
$$;

CREATE POLICY "Admins can view their own level" ON public.admin_levels
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::user_role)
  );

CREATE POLICY "Super admins can manage admin levels" ON public.admin_levels
  FOR ALL TO authenticated 
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_admin_levels_updated_at
  BEFORE UPDATE ON public.admin_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system config
INSERT INTO public.system_config (config_key, config_value, category, description) VALUES
  ('delivery_charges', '{"base_fee": 100, "per_km": 10, "express_multiplier": 1.5}', 'pricing', 'Delivery fee structure'),
  ('service_fees', '{"platform_fee": 50, "insurance_rate": 0.02}', 'pricing', 'Service fee configuration'),
  ('tax_config', '{"vat_rate": 0.16, "enabled": false}', 'pricing', 'Tax configuration'),
  ('working_hours', '{"start": "06:00", "end": "22:00", "days": ["Mon","Tue","Wed","Thu","Fri","Sat"]}', 'operations', 'Platform working hours'),
  ('service_areas', '{"cities": ["Nairobi", "Mombasa", "Kisumu", "Nakuru"]}', 'operations', 'Service area coverage');
