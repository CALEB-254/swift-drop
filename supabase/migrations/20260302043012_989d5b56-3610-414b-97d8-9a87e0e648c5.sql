
-- Allow admins to delete agents
CREATE POLICY "Admins can delete agents"
ON public.agents
FOR DELETE
USING (has_role(auth.uid(), 'admin'::user_role));

-- Allow admins to insert agents
CREATE POLICY "Admins can insert agents"
ON public.agents
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Allow admins to update agents
CREATE POLICY "Admins can update agents"
ON public.agents
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_role));
