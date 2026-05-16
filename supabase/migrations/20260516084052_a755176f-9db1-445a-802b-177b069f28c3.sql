
CREATE TABLE IF NOT EXISTS public.glacier_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  glacier_id uuid NOT NULL REFERENCES public.glaciers(id) ON DELETE CASCADE,
  observed_at date NOT NULL,
  area_km2 numeric,
  length_km numeric,
  terminus_change_m numeric,
  status public.glacier_status,
  source text NOT NULL DEFAULT 'RGI v7 / GLIMS',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS glacier_obs_glacier_idx ON public.glacier_observations(glacier_id, observed_at);

ALTER TABLE public.glacier_observations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read glacier observations" ON public.glacier_observations;
CREATE POLICY "Public read glacier observations" ON public.glacier_observations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins insert glacier observations" ON public.glacier_observations;
CREATE POLICY "Admins insert glacier observations" ON public.glacier_observations FOR INSERT
  WITH CHECK (has_role(auth.uid(),'ndma') OR has_role(auth.uid(),'facility_admin'));
