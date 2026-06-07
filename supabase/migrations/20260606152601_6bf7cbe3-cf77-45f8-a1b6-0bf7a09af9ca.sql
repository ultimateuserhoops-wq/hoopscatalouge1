
-- Ensure SKU is unique so the seed ON CONFLICT works
ALTER TABLE public.products ADD CONSTRAINT products_sku_key UNIQUE (sku);

-- 1. catalog_spreads table
CREATE TABLE IF NOT EXISTS public.catalog_spreads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spread_id   text UNIQUE NOT NULL,
  spread_type text NOT NULL,
  page_left   integer NOT NULL,
  page_right  integer NOT NULL,
  product_id  uuid REFERENCES public.products(id) ON DELETE SET NULL,
  category    text,
  title       text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.catalog_spreads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_spreads TO authenticated;
GRANT ALL ON public.catalog_spreads TO service_role;

ALTER TABLE public.catalog_spreads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cs read all" ON public.catalog_spreads FOR SELECT TO public USING (true);
CREATE POLICY "cs write auth" ON public.catalog_spreads FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER set_catalog_spreads_updated_at
  BEFORE UPDATE ON public.catalog_spreads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Seed products
INSERT INTO public.products (sku, name, category, subtitle, description, price, price_original, price_save_label, badge_label, season_label, collection_label, cta_label, page_left, page_right) VALUES
  ('HPS-JRY-EL25', 'ELITE GAME JERSEY', 'JERSEYS', 'Tournament Grade', 'Tournament-grade construction with reinforced stitching.', '720K', '820,000₫', 'SAVE 12%', 'NEW', 'Season 2025', 'Jerseys · 2025 Collection', 'ORDER NOW →', '08', '09'),
  ('HPS-JRY-CL25', 'CLASSIC JERSEY', 'JERSEYS', 'Heritage Collection', 'Heritage cut inspired by the golden era of the game.', '550K', '650,000₫', 'SAVE 15%', NULL, 'Season 2025', 'Jerseys · 2025 Collection', 'ORDER NOW →', '10', '11'),
  ('HPS-JRY-TR25', 'TRAINING JERSEY', 'JERSEYS', 'Daily Training Series', 'Built for daily training with moisture-wicking mesh.', '450K', '500,000₫', 'SAVE 10%', NULL, 'Season 2025', 'Jerseys · 2025 Collection', 'ORDER NOW →', '12', '13'),
  ('HPS-JRY-YT25', 'YOUTH JERSEY', 'JERSEYS', 'Youth Competition Series', 'Youth-sized competition jersey with pro construction.', '380K', '450,000₫', 'SAVE 16%', NULL, 'Season 2025', 'Jerseys · 2025 Collection', 'ORDER NOW →', '14', '15'),
  ('HPS-JRY-RT25', 'RETRO JERSEY', 'JERSEYS', 'Throwback Collection', 'Throwback cut and trim details from the heritage archive.', '620K', '720,000₫', 'SAVE 14%', 'HERITAGE', 'Season 2025', 'Jerseys · 2025 Collection', 'ORDER NOW →', '16', '17'),
  ('HPS-JRY-RV25', 'REVERSIBLE JERSEY', 'JERSEYS', 'Double-Sided Series', 'Two looks in one — fully reversible mesh construction.', '590K', '690,000₫', 'SAVE 14%', NULL, 'Season 2025', 'Jerseys · 2025 Collection', 'ORDER NOW →', '18', '19'),
  ('HPS-JRY-SH25', 'SHOOTER JERSEY', 'JERSEYS', 'Practice & Warm-Up', 'Practice and warm-up shirt with open mesh shoulders.', '410K', '480,000₫', 'SAVE 14%', NULL, 'Season 2025', 'Jerseys · 2025 Collection', 'ORDER NOW →', '20', '21'),
  ('HPS-WU-SS25', 'PERFORMANCE WARM-UP', 'WARM-UP SETS', 'Short Sleeve Series', 'Lightweight short-sleeve warm-up set with side venting.', '880K', '1,000,000₫', 'SAVE 12%', NULL, 'Season 2025', 'Warm-Ups · 2025 Collection', 'ORDER NOW →', '22', '23'),
  ('HPS-WU-LS25', 'TRAINING WARM-UP', 'WARM-UP SETS', 'Long Sleeve Series', 'Long-sleeve training set with brushed interior.', '950K', '1,100,000₫', 'SAVE 14%', NULL, 'Season 2025', 'Warm-Ups · 2025 Collection', 'ORDER NOW →', '24', '25'),
  ('HPS-WU-EL25', 'ELITE WARM-UP SET', 'WARM-UP SETS', 'Full Set Collection', 'Full jacket-and-pant warm-up set for elite teams.', '1.45M', '1,650,000₫', 'SAVE 12%', 'BESTSELLER', 'Season 2025', 'Warm-Ups · 2025 Collection', 'ORDER NOW →', '26', '27'),
  ('HPS-PL-PF25', 'PERFORMANCE POLO', 'POLO SHIRTS', 'Technical Fabric Series', 'Technical polo with stretch knit and UV resistance.', '490K', '580,000₫', 'SAVE 16%', NULL, 'Season 2025', 'Polos · 2025 Collection', 'ORDER NOW →', '28', '29'),
  ('HPS-PL-CL25', 'CLASSIC COACH POLO', 'POLO SHIRTS', 'Staff & Coach Edition', 'Cotton-blend classic polo for staff and coaches.', '460K', '540,000₫', 'SAVE 15%', NULL, 'Season 2025', 'Polos · 2025 Collection', 'ORDER NOW →', '30', '31'),
  ('HPS-JK-PF25', 'PERFORMANCE JACKET', 'JACKETS & SUITS', 'Competition Outerwear', 'Performance shell jacket with sealed seams.', '1.2M', '1,400,000₫', 'SAVE 14%', NULL, 'Season 2025', 'Outerwear · 2025 Collection', 'ORDER NOW →', '32', '33'),
  ('HPS-JK-TS25', 'TRACK SUIT FULL SET', 'JACKETS & SUITS', 'Jacket + Pants Bundle', 'Two-piece track suit — jacket and pant combo.', '1.6M', '1,850,000₫', 'SAVE 13%', 'BUNDLE', 'Season 2025', 'Outerwear · 2025 Collection', 'ORDER NOW →', '34', '35'),
  ('HPS-JK-BN25', 'BENCH JACKET', 'JACKETS & SUITS', 'Sideline Collection', 'Insulated bench jacket for sideline warmth.', '1.35M', '1,550,000₫', 'SAVE 13%', NULL, 'Season 2025', 'Outerwear · 2025 Collection', 'ORDER NOW →', '36', '37'),
  ('HPS-QZ-TR25', 'TRAINING 1/4 ZIP', '1/4 ZIP JACKETS', 'Lightweight Training', 'Lightweight 1/4 zip pullover for early warmups.', '690K', '800,000₫', 'SAVE 14%', NULL, 'Season 2025', '1/4 Zip · 2025 Collection', 'ORDER NOW →', '38', '39'),
  ('HPS-QZ-EL25', 'ELITE 1/4 ZIP', '1/4 ZIP JACKETS', 'Premium Performance', 'Premium 1/4 zip with brushed interior and thumb loops.', '820K', '950,000₫', 'SAVE 14%', NULL, 'Season 2025', '1/4 Zip · 2025 Collection', 'ORDER NOW →', '40', '41'),
  ('HPS-HD-PL25', 'PULLOVER HOODIE', 'HOODIES', 'Relaxed Fit Series', 'Relaxed-fit pullover hoodie with embroidered logo.', '720K', '850,000₫', 'SAVE 15%', NULL, 'Season 2025', 'Hoodies · 2025 Collection', 'ORDER NOW →', '42', '43'),
  ('HPS-HD-ZP25', 'ZIP HOODIE', 'HOODIES', 'Full-Zip Collection', 'Full-zip hoodie with kangaroo pockets.', '780K', '900,000₫', 'SAVE 13%', NULL, 'Season 2025', 'Hoodies · 2025 Collection', 'ORDER NOW →', '44', '45'),
  ('HPS-SK-PF25', 'PERFORMANCE SOCKS', 'SOCKS', 'Basketball Performance', 'Mid-cut basketball performance socks with cushioned sole.', '120K', '140,000₫', 'SAVE 14%', NULL, 'Season 2025', 'Socks · 2025 Collection', 'ORDER NOW →', '46', '47'),
  ('HPS-SK-CP25', 'COMPRESSION SOCKS', 'SOCKS', 'Elite Compression', 'Knee-high compression socks for elite recovery.', '180K', '210,000₫', 'SAVE 14%', NULL, 'Season 2025', 'Socks · 2025 Collection', 'ORDER NOW →', '48', '49')
ON CONFLICT (sku) DO NOTHING;

UPDATE public.products SET page_left = '06', page_right = '07' WHERE sku = 'HPS-JRY-PG25';

-- 3. Default color variants for new products
INSERT INTO public.color_variants (product_id, name, hex_main, hex_shade, is_light, sort_order)
SELECT p.id, 'MIDNIGHT', '#1a1a2e', '#0d0d1a', false, 1
FROM public.products p
WHERE p.sku <> 'HPS-JRY-PG25'
  AND NOT EXISTS (SELECT 1 FROM public.color_variants cv WHERE cv.product_id = p.id);

INSERT INTO public.color_variants (product_id, name, hex_main, hex_shade, is_light, sort_order)
SELECT p.id, 'CRIMSON', '#c41e3a', '#7a1226', false, 2
FROM public.products p
WHERE p.sku <> 'HPS-JRY-PG25'
  AND (SELECT count(*) FROM public.color_variants cv WHERE cv.product_id = p.id) < 2;

INSERT INTO public.color_variants (product_id, name, hex_main, hex_shade, is_light, sort_order)
SELECT p.id, 'ARCTIC', '#f0f0f5', '#c8c8d0', true, 3
FROM public.products p
WHERE p.sku <> 'HPS-JRY-PG25'
  AND (SELECT count(*) FROM public.color_variants cv WHERE cv.product_id = p.id) < 3;

-- 4. Default spec rows for new products
INSERT INTO public.spec_rows (product_id, label, value, sort_order)
SELECT p.id, 'Fabric', '100% Polyester Mesh', 1
FROM public.products p
WHERE p.sku <> 'HPS-JRY-PG25'
  AND NOT EXISTS (SELECT 1 FROM public.spec_rows sr WHERE sr.product_id = p.id);

INSERT INTO public.spec_rows (product_id, label, value, sort_order)
SELECT p.id, 'Weight', '180 GSM', 2
FROM public.products p
WHERE p.sku <> 'HPS-JRY-PG25'
  AND (SELECT count(*) FROM public.spec_rows sr WHERE sr.product_id = p.id) < 2;

INSERT INTO public.spec_rows (product_id, label, value, sort_order)
SELECT p.id, 'Origin', 'Made in Vietnam', 3
FROM public.products p
WHERE p.sku <> 'HPS-JRY-PG25'
  AND (SELECT count(*) FROM public.spec_rows sr WHERE sr.product_id = p.id) < 3;

INSERT INTO public.spec_rows (product_id, label, value, sort_order)
SELECT p.id, 'Care', 'Machine Wash Cold', 4
FROM public.products p
WHERE p.sku <> 'HPS-JRY-PG25'
  AND (SELECT count(*) FROM public.spec_rows sr WHERE sr.product_id = p.id) < 4;

-- 5. Seed catalog_spreads
INSERT INTO public.catalog_spreads (spread_id, spread_type, page_left, page_right, product_id, category, title, sort_order) VALUES
  ('cover',    'cover',   0,  1,  NULL, NULL, 'HOOPS BASKETBALL CATALOGUE', 0),
  ('menu-1',   'menu',    2,  3,  NULL, NULL, 'CATALOGUE CONTENTS', 1),
  ('menu-2',   'menu',    4,  5,  NULL, NULL, 'CATALOGUE CONTENTS', 2),
  ('jersey-1', 'product', 6,  7,  (SELECT id FROM public.products WHERE sku = 'HPS-JRY-PG25'), 'JERSEYS', NULL, 3),
  ('jersey-2', 'product', 8,  9,  (SELECT id FROM public.products WHERE sku = 'HPS-JRY-EL25'), 'JERSEYS', NULL, 4),
  ('jersey-3', 'product', 10, 11, (SELECT id FROM public.products WHERE sku = 'HPS-JRY-CL25'), 'JERSEYS', NULL, 5),
  ('jersey-4', 'product', 12, 13, (SELECT id FROM public.products WHERE sku = 'HPS-JRY-TR25'), 'JERSEYS', NULL, 6),
  ('jersey-5', 'product', 14, 15, (SELECT id FROM public.products WHERE sku = 'HPS-JRY-YT25'), 'JERSEYS', NULL, 7),
  ('jersey-6', 'product', 16, 17, (SELECT id FROM public.products WHERE sku = 'HPS-JRY-RT25'), 'JERSEYS', NULL, 8),
  ('jersey-7', 'product', 18, 19, (SELECT id FROM public.products WHERE sku = 'HPS-JRY-RV25'), 'JERSEYS', NULL, 9),
  ('jersey-8', 'product', 20, 21, (SELECT id FROM public.products WHERE sku = 'HPS-JRY-SH25'), 'JERSEYS', NULL, 10),
  ('warmup-1', 'product', 22, 23, (SELECT id FROM public.products WHERE sku = 'HPS-WU-SS25'),  'WARM-UP SETS', NULL, 11),
  ('warmup-2', 'product', 24, 25, (SELECT id FROM public.products WHERE sku = 'HPS-WU-LS25'),  'WARM-UP SETS', NULL, 12),
  ('warmup-3', 'product', 26, 27, (SELECT id FROM public.products WHERE sku = 'HPS-WU-EL25'),  'WARM-UP SETS', NULL, 13),
  ('polo-1',   'product', 28, 29, (SELECT id FROM public.products WHERE sku = 'HPS-PL-PF25'),  'POLO SHIRTS', NULL, 14),
  ('polo-2',   'product', 30, 31, (SELECT id FROM public.products WHERE sku = 'HPS-PL-CL25'),  'POLO SHIRTS', NULL, 15),
  ('jacket-1', 'product', 32, 33, (SELECT id FROM public.products WHERE sku = 'HPS-JK-PF25'),  'JACKETS & SUITS', NULL, 16),
  ('jacket-2', 'product', 34, 35, (SELECT id FROM public.products WHERE sku = 'HPS-JK-TS25'),  'JACKETS & SUITS', NULL, 17),
  ('jacket-3', 'product', 36, 37, (SELECT id FROM public.products WHERE sku = 'HPS-JK-BN25'),  'JACKETS & SUITS', NULL, 18),
  ('qzip-1',   'product', 38, 39, (SELECT id FROM public.products WHERE sku = 'HPS-QZ-TR25'),  '1/4 ZIP JACKETS', NULL, 19),
  ('qzip-2',   'product', 40, 41, (SELECT id FROM public.products WHERE sku = 'HPS-QZ-EL25'),  '1/4 ZIP JACKETS', NULL, 20),
  ('hoodie-1', 'product', 42, 43, (SELECT id FROM public.products WHERE sku = 'HPS-HD-PL25'),  'HOODIES', NULL, 21),
  ('hoodie-2', 'product', 44, 45, (SELECT id FROM public.products WHERE sku = 'HPS-HD-ZP25'),  'HOODIES', NULL, 22),
  ('socks-1',  'product', 46, 47, (SELECT id FROM public.products WHERE sku = 'HPS-SK-PF25'),  'SOCKS', NULL, 23),
  ('socks-2',  'product', 48, 49, (SELECT id FROM public.products WHERE sku = 'HPS-SK-CP25'),  'SOCKS', NULL, 24),
  ('size',     'size',    50, 51, NULL, NULL, 'SIZE GUIDE', 25),
  ('contact',  'contact', 52, 53, NULL, NULL, 'CONTACT & ORDER', 26)
ON CONFLICT (spread_id) DO NOTHING;
