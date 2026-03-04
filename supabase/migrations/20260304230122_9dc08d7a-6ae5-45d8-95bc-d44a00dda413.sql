
-- Add dropped_at_agent to package_status enum
ALTER TYPE public.package_status ADD VALUE IF NOT EXISTS 'dropped_at_agent' AFTER 'pending';

-- Add pickup_agent_id column to packages for linking sender's chosen agent
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS pickup_agent_id uuid;

-- RLS: Pickup agents can view packages assigned to their pickup point
CREATE POLICY "Pickup agents can view their packages"
ON public.packages FOR SELECT
TO authenticated
USING (
  pickup_agent_id IN (
    SELECT id FROM public.agents WHERE user_id = auth.uid()
  )
);

-- RLS: Pickup agents can update packages at their point (for status change on scan)
CREATE POLICY "Pickup agents can update their packages"
ON public.packages FOR UPDATE
TO authenticated
USING (
  pickup_agent_id IN (
    SELECT id FROM public.agents WHERE user_id = auth.uid()
  )
);
