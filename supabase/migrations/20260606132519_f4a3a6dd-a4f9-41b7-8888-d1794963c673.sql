-- Add zone_type to separate pickup vs doorstep zones
DO $$ BEGIN
  CREATE TYPE public.zone_type AS ENUM ('pickup', 'doorstep');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.zones
  ADD COLUMN IF NOT EXISTS zone_type public.zone_type NOT NULL DEFAULT 'pickup';

-- Backfill: zones that previously supported doorstep become doorstep zones
UPDATE public.zones SET zone_type = 'doorstep' WHERE supports_doorstep = true AND zone_type = 'pickup';
