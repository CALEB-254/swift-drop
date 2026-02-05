-- Create agents table to store pickup/drop-off points
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_name TEXT NOT NULL,
  location TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  is_active BOOLEAN DEFAULT true,
  services TEXT[] DEFAULT ARRAY['pickup', 'dropoff'],
  operating_hours TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Agents can view and update their own record
CREATE POLICY "Agents can view their own record"
ON public.agents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Agents can update their own record"
ON public.agents FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Agents can insert their own record"
ON public.agents FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Everyone can view active agents (for searching pickup points)
CREATE POLICY "Anyone can view active agents"
ON public.agents FOR SELECT
USING (is_active = true);

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all packages
CREATE POLICY "Admins can view all packages"
ON public.packages FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update all packages
CREATE POLICY "Admins can update all packages"
ON public.packages FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all notifications
CREATE POLICY "Admins can view all notifications"
ON public.notifications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create user preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bluetooth_enabled BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'system',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences"
ON public.user_preferences FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;