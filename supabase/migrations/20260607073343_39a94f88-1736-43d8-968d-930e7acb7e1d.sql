
WITH seed(sku, name, subtitle, category, description, price, price_original, price_save_label, badge_label, season_label, page_left, page_right, collection_label) AS (
  VALUES
    ('HPS-JRY-PG25','PRO GAME JERSEY','Elite Performance Series','JERSEYS','Ultra-lightweight mesh with laser-perforated ventilation zones.','650K','750,000₫','SAVE 13%','BESTSELLER','Season 2025','06','07','Jerseys · 2025 Collection'),
    ('HPS-JRY-EL25','ELITE GAME JERSEY','Tournament Series','JERSEYS','Premium engineered knit for elite-level play, with reinforced seams.','720K','820,000₫','SAVE 12%','PRO PICK','Season 2025','08','09','Jerseys · 2025 Collection'),
    ('HPS-JRY-CL25','CLASSIC JERSEY','Heritage Series','JERSEYS','Traditional cut with modern moisture management for everyday play.','520K','600,000₫','SAVE 13%',NULL,'Season 2025','10','11','Jerseys · 2025 Collection'),
    ('HPS-JRY-TR25','TRAINING JERSEY','Practice Series','JERSEYS','Durable double-knit jersey for daily practice and scrimmages.','420K','480,000₫','SAVE 12%',NULL,'Season 2025','12','13','Jerseys · 2025 Collection'),
    ('HPS-JRY-YT25','YOUTH JERSEY','Junior Series','JERSEYS','Youth-sized cut with soft, lightweight fabric and stretch panels.','380K','440,000₫','SAVE 13%','YOUTH','Season 2025','14','15','Jerseys · 2025 Collection'),
    ('HPS-JRY-RT25','RETRO JERSEY','Throwback Series','JERSEYS','Vintage cut inspired by the golden era — wider armholes, bold trim.','580K','680,000₫','SAVE 14%','LIMITED','Season 2025','16','17','Jerseys · 2025 Collection'),
    ('HPS-JRY-RV25','REVERSIBLE JERSEY','Two-Color Series','JERSEYS','Dual-color reversible mesh — instantly switch teams in practice.','540K','640,000₫','SAVE 15%',NULL,'Season 2025','18','19','Jerseys · 2025 Collection'),
    ('HPS-JRY-SH25','SHOOTER JERSEY','Warm-Up Series','JERSEYS','Sleeveless shooter top with breathable side mesh for warm-ups.','490K','560,000₫','SAVE 12%',NULL,'Season 2025','20','21','Jerseys · 2025 Collection'),
    ('HPS-WU-SS25','SHORT SLEEVE WARM-UP','Pre-Game Series','WARM-UP SETS','Short sleeve top + shorts set for pre-game warm-ups.','880K','1,020,000₫','SAVE 14%',NULL,'Season 2025','22','23','Warm-Up Sets · 2025 Collection'),
    ('HPS-WU-LS25','LONG SLEEVE WARM-UP','Cold Court Series','WARM-UP SETS','Long sleeve top + pants set for cold court conditions.','980K','1,140,000₫','SAVE 14%',NULL,'Season 2025','24','25','Warm-Up Sets · 2025 Collection'),
    ('HPS-WU-EL25','ELITE WARM-UP SET','Tournament Series','WARM-UP SETS','Premium warm-up shooter shirt + tearaway pants combo.','1,180K','1,380,000₫','SAVE 14%','PRO PICK','Season 2025','26','27','Warm-Up Sets · 2025 Collection'),
    ('HPS-PL-PF25','PERFORMANCE POLO','Sideline Series','POLO SHIRTS','Moisture-wicking polo for coaches and staff on the sideline.','580K','660,000₫','SAVE 12%',NULL,'Season 2025','28','29','Polo Shirts · 2025 Collection'),
    ('HPS-PL-CL25','CLASSIC COACH POLO','Heritage Series','POLO SHIRTS','Classic three-button polo with embroidered HOOPS crest.','620K','720,000₫','SAVE 14%',NULL,'Season 2025','30','31','Polo Shirts · 2025 Collection'),
    ('HPS-JK-PF25','PERFORMANCE JACKET','Bench Series','JACKETS & SUITS','Lightweight full-zip jacket with mesh lining for bench warmth.','1,280K','1,480,000₫','SAVE 14%',NULL,'Season 2025','32','33','Jackets & Suits · 2025 Collection'),
    ('HPS-JK-TS25','TRACK SUIT FULL SET','Travel Series','JACKETS & SUITS','Full track suit — jacket + pants — for travel and team uniformity.','1,680K','1,940,000₫','SAVE 13%','TEAM','Season 2025','34','35','Jackets & Suits · 2025 Collection'),
    ('HPS-JK-BN25','BENCH JACKET','Warmth Series','JACKETS & SUITS','Padded bench jacket with quilted lining for cold gym sidelines.','1,480K','1,720,000₫','SAVE 14%',NULL,'Season 2025','36','37','Jackets & Suits · 2025 Collection'),
    ('HPS-QZ-TR25','TRAINING 1/4 ZIP','Pre-Game Series','1/4 ZIP JACKETS','Lightweight quarter-zip pullover for warm-ups and shoot-arounds.','780K','900,000₫','SAVE 13%',NULL,'Season 2025','38','39','1/4 Zip Jackets · 2025 Collection'),
    ('HPS-QZ-EL25','ELITE 1/4 ZIP','Tournament Series','1/4 ZIP JACKETS','Premium engineered knit quarter-zip with thumbholes and stretch.','920K','1,080,000₫','SAVE 14%','PRO PICK','Season 2025','40','41','1/4 Zip Jackets · 2025 Collection'),
    ('HPS-HD-PL25','PULLOVER HOODIE','Off-Court Series','HOODIES','Soft brushed fleece pullover hoodie with embroidered HOOPS logo.','820K','940,000₫','SAVE 12%',NULL,'Season 2025','42','43','Hoodies · 2025 Collection'),
    ('HPS-HD-ZP25','ZIP HOODIE','Off-Court Series','HOODIES','Full-zip brushed fleece hoodie with kangaroo pockets.','880K','1,020,000₫','SAVE 14%',NULL,'Season 2025','44','45','Hoodies · 2025 Collection'),
    ('HPS-SK-PF25','PERFORMANCE SOCKS','Court Series','SOCKS','Cushioned crew-height performance socks with arch support.','180K','220,000₫','SAVE 18%',NULL,'Season 2025','46','47','Socks · 2025 Collection'),
    ('HPS-SK-CP25','COMPRESSION SOCKS','Recovery Series','SOCKS','Graduated compression socks for recovery and circulation.','240K','280,000₫','SAVE 14%','RECOVERY','Season 2025','48','49','Socks · 2025 Collection')
)
INSERT INTO public.products (sku, name, subtitle, category, description, price, price_original, price_save_label, badge_label, season_label, page_left, page_right, collection_label)
SELECT sku, name, subtitle, category, description, price, price_original, price_save_label, badge_label, season_label, page_left, page_right, collection_label FROM seed
ON CONFLICT (sku) DO NOTHING;

WITH defaults(sku, name, hex_main, hex_shade, is_light) AS (
  VALUES
    ('HPS-JRY-PG25','COURT RED','#c8102e','#7a0a1c', false),
    ('HPS-JRY-EL25','MIDNIGHT NAVY','#0b1e3f','#050d1e', false),
    ('HPS-JRY-CL25','HERITAGE WHITE','#f4f4f1','#d6d6d2', true),
    ('HPS-JRY-TR25','PRACTICE GREY','#5b5f66','#33363b', false),
    ('HPS-JRY-YT25','JUNIOR ROYAL','#1d4ed8','#0f2a7a', false),
    ('HPS-JRY-RT25','RETRO GOLD','#c9a14a','#7a6128', false),
    ('HPS-JRY-RV25','REVERSE BLACK','#101114','#000000', false),
    ('HPS-JRY-SH25','SHOOTER ORANGE','#f06a1a','#8a3a0a', false),
    ('HPS-WU-SS25','PRO BLACK','#101114','#000000', false),
    ('HPS-WU-LS25','TEAM NAVY','#13234d','#070f24', false),
    ('HPS-WU-EL25','ELITE CRIMSON','#9b1b2e','#56101a', false),
    ('HPS-PL-PF25','COACH WHITE','#f6f6f3','#dadad6', true),
    ('HPS-PL-CL25','COACH NAVY','#13234d','#070f24', false),
    ('HPS-JK-PF25','SIDELINE BLACK','#101114','#000000', false),
    ('HPS-JK-TS25','TRAVEL CHARCOAL','#2a2d33','#15171b', false),
    ('HPS-JK-BN25','BENCH BLACK','#0c0d10','#000000', false),
    ('HPS-QZ-TR25','TRAINING GREY','#666a72','#3a3c41', false),
    ('HPS-QZ-EL25','ELITE BLACK','#101114','#000000', false),
    ('HPS-HD-PL25','OFFCOURT BONE','#e9e5dc','#bdb9b0', true),
    ('HPS-HD-ZP25','OFFCOURT BLACK','#101114','#000000', false),
    ('HPS-SK-PF25','COURT WHITE','#f6f6f3','#cccccc', true),
    ('HPS-SK-CP25','RECOVERY BLACK','#101114','#000000', false)
)
INSERT INTO public.color_variants (product_id, name, hex_main, hex_shade, is_light, sort_order)
SELECT p.id, d.name, d.hex_main, d.hex_shade, d.is_light, 0
FROM defaults d JOIN public.products p ON p.sku = d.sku
WHERE NOT EXISTS (SELECT 1 FROM public.color_variants cv WHERE cv.product_id = p.id);

INSERT INTO public.spec_rows (product_id, label, value, sort_order)
SELECT p.id, v.label, v.value, v.sort_order
FROM public.products p
CROSS JOIN (VALUES
  ('FABRIC',    'Premium technical knit',         1),
  ('FIT',       'Athletic — true to size',        2),
  ('SIZES',     'XS · S · M · L · XL · 2XL · 3XL',3),
  ('MIN ORDER', '10 units per design',            4)
) AS v(label, value, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.spec_rows sr WHERE sr.product_id = p.id);

UPDATE public.catalog_spreads cs
SET product_id = p.id
FROM public.products p
WHERE cs.product_id IS NULL
  AND cs.spread_type = 'product'
  AND p.sku = (
    CASE cs.spread_id
      WHEN 'jersey-1' THEN 'HPS-JRY-PG25'
      WHEN 'jersey-2' THEN 'HPS-JRY-EL25'
      WHEN 'jersey-3' THEN 'HPS-JRY-CL25'
      WHEN 'jersey-4' THEN 'HPS-JRY-TR25'
      WHEN 'jersey-5' THEN 'HPS-JRY-YT25'
      WHEN 'jersey-6' THEN 'HPS-JRY-RT25'
      WHEN 'jersey-7' THEN 'HPS-JRY-RV25'
      WHEN 'jersey-8' THEN 'HPS-JRY-SH25'
      WHEN 'warmup-1' THEN 'HPS-WU-SS25'
      WHEN 'warmup-2' THEN 'HPS-WU-LS25'
      WHEN 'warmup-3' THEN 'HPS-WU-EL25'
      WHEN 'polo-1'   THEN 'HPS-PL-PF25'
      WHEN 'polo-2'   THEN 'HPS-PL-CL25'
      WHEN 'jacket-1' THEN 'HPS-JK-PF25'
      WHEN 'jacket-2' THEN 'HPS-JK-TS25'
      WHEN 'jacket-3' THEN 'HPS-JK-BN25'
      WHEN 'qzip-1'   THEN 'HPS-QZ-TR25'
      WHEN 'qzip-2'   THEN 'HPS-QZ-EL25'
      WHEN 'hoodie-1' THEN 'HPS-HD-PL25'
      WHEN 'hoodie-2' THEN 'HPS-HD-ZP25'
      WHEN 'socks-1'  THEN 'HPS-SK-PF25'
      WHEN 'socks-2'  THEN 'HPS-SK-CP25'
    END
  );
