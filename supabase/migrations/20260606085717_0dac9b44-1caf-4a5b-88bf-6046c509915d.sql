
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'PRO GAME JERSEY',
  subtitle TEXT DEFAULT 'Elite Performance Series',
  category TEXT DEFAULT 'GAME JERSEY',
  sku TEXT NOT NULL DEFAULT 'HPS-JRY-PG25',
  description TEXT DEFAULT 'Ultra-lightweight mesh construction with laser-perforated ventilation zones.',
  price TEXT DEFAULT '650K',
  price_original TEXT DEFAULT '750,000₫',
  price_save_label TEXT DEFAULT 'SAVE 13%',
  badge_label TEXT DEFAULT 'BESTSELLER',
  season_label TEXT DEFAULT 'Season 2025',
  page_left TEXT DEFAULT '04',
  page_right TEXT DEFAULT '05',
  collection_label TEXT DEFAULT 'Jerseys · 2025 Collection',
  cta_label TEXT DEFAULT 'ORDER NOW →',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products read all" ON public.products FOR SELECT USING (true);
CREATE POLICY "products write auth" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.color_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'NEW COLOR',
  hex_main TEXT NOT NULL DEFAULT '#888888',
  hex_shade TEXT DEFAULT '#555555',
  is_light BOOLEAN DEFAULT FALSE,
  jersey_photo TEXT,
  jersey_photo_name TEXT,
  body_photo TEXT,
  body_photo_name TEXT,
  motion_gif TEXT,
  motion_gif_name TEXT,
  note TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT ON public.color_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.color_variants TO authenticated;
GRANT ALL ON public.color_variants TO service_role;
ALTER TABLE public.color_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cv read all" ON public.color_variants FOR SELECT USING (true);
CREATE POLICY "cv write auth" ON public.color_variants FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.spec_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Label',
  value TEXT NOT NULL DEFAULT 'Value',
  sort_order INTEGER DEFAULT 0
);
GRANT SELECT ON public.spec_rows TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spec_rows TO authenticated;
GRANT ALL ON public.spec_rows TO service_role;
ALTER TABLE public.spec_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr read all" ON public.spec_rows FOR SELECT USING (true);
CREATE POLICY "sr write auth" ON public.spec_rows FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.catalog_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  accent TEXT NOT NULL,
  accent2 TEXT NOT NULL,
  bg TEXT NOT NULL,
  surface TEXT NOT NULL,
  text_color TEXT NOT NULL,
  subtext_color TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE
);
GRANT SELECT ON public.catalog_themes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_themes TO authenticated;
GRANT ALL ON public.catalog_themes TO service_role;
ALTER TABLE public.catalog_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "th read all" ON public.catalog_themes FOR SELECT USING (true);
CREATE POLICY "th write auth" ON public.catalog_themes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  label TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "as auth only" ON public.app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER app_settings_updated BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
