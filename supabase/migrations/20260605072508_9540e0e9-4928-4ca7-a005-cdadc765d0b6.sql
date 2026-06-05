
ALTER TABLE public.zones
  ADD COLUMN IF NOT EXISTS is_cbd boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_doorstep boolean NOT NULL DEFAULT true;

-- Only one CBD zone allowed
CREATE UNIQUE INDEX IF NOT EXISTS zones_single_cbd_idx
  ON public.zones ((is_cbd)) WHERE is_cbd = true;

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES public.zones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS agents_zone_id_idx ON public.agents(zone_id);
