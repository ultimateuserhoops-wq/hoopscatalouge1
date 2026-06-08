
CREATE TABLE public.product_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tier_key TEXT NOT NULL,
  label TEXT NOT NULL,
  price TEXT,
  fabric TEXT,
  feature TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, tier_key)
);

GRANT SELECT ON public.product_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_tiers TO authenticated;
GRANT ALL ON public.product_tiers TO service_role;

ALTER TABLE public.product_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view product tiers"
  ON public.product_tiers FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can manage product tiers"
  ON public.product_tiers FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER product_tiers_set_updated_at
  BEFORE UPDATE ON public.product_tiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed three default tiers for every JERSEYS product
INSERT INTO public.product_tiers (product_id, tier_key, label, price, fabric, feature, sort_order)
SELECT p.id, t.tier_key, t.label,
       CASE t.tier_key
         WHEN 'standard' THEN COALESCE(p.price, '—')
         WHEN 'premium'  THEN COALESCE(p.price, '—')
         WHEN 'elite'    THEN COALESCE(p.price, '—')
       END,
       t.fabric, t.feature, t.sort_order
FROM public.products p
CROSS JOIN (VALUES
  ('standard', 'Standard', 'Performance knit', 'Breathable mesh panels', 1),
  ('premium',  'Premium',  'Premium technical knit', 'Reinforced seams · moisture wicking', 2),
  ('elite',    'Elite',    'Elite engineered knit', 'Lightweight · reinforced seams · pro-level fit', 3)
) AS t(tier_key, label, fabric, feature, sort_order)
WHERE p.category = 'JERSEYS'
ON CONFLICT (product_id, tier_key) DO NOTHING;
