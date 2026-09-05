CREATE TABLE public.package_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  tracking_number text,
  actor_id uuid,
  actor_name text,
  actor_role text,
  action text NOT NULL,
  status_before text,
  status_after text,
  latitude numeric,
  longitude numeric,
  location_text text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.package_logs TO authenticated;
GRANT ALL ON public.package_logs TO service_role;

ALTER TABLE public.package_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_package_logs_package_id ON public.package_logs(package_id);
CREATE INDEX idx_package_logs_created_at ON public.package_logs(created_at DESC);

CREATE POLICY "Related users can read package logs"
ON public.package_logs FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.get_user_role(auth.uid()) = 'agent'
  OR EXISTS (
    SELECT 1 FROM public.packages p
    WHERE p.id = package_logs.package_id
      AND (p.user_id = auth.uid() OR p.agent_id = auth.uid())
  )
);

CREATE POLICY "Authenticated users can add package logs"
ON public.package_logs FOR INSERT TO authenticated
WITH CHECK (actor_id = auth.uid());