CREATE TABLE public.gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spread_id text NOT NULL REFERENCES public.catalog_spreads(spread_id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  title text,
  subtitle text,
  hex_color text NOT NULL DEFAULT '#FF4D00',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gallery_photos_spread_idx ON public.gallery_photos(spread_id, sort_order);
GRANT SELECT ON public.gallery_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_photos TO authenticated;
GRANT ALL ON public.gallery_photos TO service_role;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery_photos read all" ON public.gallery_photos FOR SELECT USING (true);
CREATE POLICY "gallery_photos write auth" ON public.gallery_photos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_gallery_photos_updated_at BEFORE UPDATE ON public.gallery_photos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();