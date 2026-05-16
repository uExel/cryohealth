
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

INSERT INTO public.districts (name, province, centroid_lat, centroid_lng, population) VALUES
  ('Chitral', 'Khyber Pakhtunkhwa', 35.8511, 71.7889, 450000),
  ('Skardu', 'Gilgit Baltistan', 35.2971, 75.6333, 290000),
  ('Shigar', 'Gilgit Baltistan', 35.4250, 75.7400, 90000),
  ('Ghanche', 'Gilgit Baltistan', 35.0167, 76.3333, 100000),
  ('Astore', 'Gilgit Baltistan', 35.3667, 74.8500, 95000),
  ('Diamer', 'Gilgit Baltistan', 35.5500, 73.7500, 250000)
ON CONFLICT DO NOTHING;

DO $$ BEGIN
  CREATE TYPE public.glacier_status AS ENUM ('stable','retreating','advancing','surging','unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.glaciers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rgi_id text UNIQUE,
  glims_id text,
  district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  area_km2 numeric,
  length_km numeric,
  elevation_min_m integer,
  elevation_max_m integer,
  terminus_type text,
  status public.glacier_status NOT NULL DEFAULT 'unknown',
  source text NOT NULL DEFAULT 'RGI v7 / GLIMS',
  last_observed date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS glaciers_district_idx ON public.glaciers(district_id);
CREATE INDEX IF NOT EXISTS glaciers_status_idx ON public.glaciers(status);

ALTER TABLE public.glaciers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read glaciers" ON public.glaciers;
CREATE POLICY "Public can read glaciers" ON public.glaciers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins insert glaciers" ON public.glaciers;
CREATE POLICY "Admins insert glaciers" ON public.glaciers FOR INSERT
  WITH CHECK (has_role(auth.uid(),'ndma') OR has_role(auth.uid(),'facility_admin'));

DROP POLICY IF EXISTS "Admins update glaciers" ON public.glaciers;
CREATE POLICY "Admins update glaciers" ON public.glaciers FOR UPDATE
  USING (has_role(auth.uid(),'ndma') OR has_role(auth.uid(),'facility_admin'));

DROP TRIGGER IF EXISTS update_glaciers_updated_at ON public.glaciers;
CREATE TRIGGER update_glaciers_updated_at
  BEFORE UPDATE ON public.glaciers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
