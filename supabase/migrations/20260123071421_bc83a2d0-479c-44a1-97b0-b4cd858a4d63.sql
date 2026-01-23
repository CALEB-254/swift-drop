-- Allow agents to view all pending unassigned packages
CREATE POLICY "Agents can view pending unassigned packages" 
ON public.packages 
FOR SELECT 
USING (
  public.get_user_role(auth.uid()) = 'agent' 
  AND status = 'pending' 
  AND agent_id IS NULL
);