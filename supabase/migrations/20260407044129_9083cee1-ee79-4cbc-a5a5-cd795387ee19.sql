
-- Delivery Zones
CREATE TABLE IF NOT EXISTS public.zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  delivery_fee numeric NOT NULL DEFAULT 150,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage zones" ON public.zones
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Authenticated users can view active zones" ON public.zones
FOR SELECT TO authenticated USING (is_active = true);

CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON public.zones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  admin_email text,
  action text NOT NULL,
  target_table text,
  target_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can create audit logs" ON public.audit_logs
FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Refund Requests
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_id uuid REFERENCES public.packages(id),
  tracking_number text,
  amount numeric NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create refund requests" ON public.refund_requests
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own refunds" ON public.refund_requests
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all refunds" ON public.refund_requests
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER update_refund_requests_updated_at BEFORE UPDATE ON public.refund_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
