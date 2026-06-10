
-- Mix & Match templates
CREATE TABLE IF NOT EXISTS public.mix_match_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  photo TEXT,
  photo_name TEXT,
  athlete_template TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mix_match_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mix_match_templates TO authenticated;
GRANT ALL ON public.mix_match_templates TO service_role;

ALTER TABLE public.mix_match_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mix_match_templates public read"
  ON public.mix_match_templates FOR SELECT
  USING (true);

CREATE POLICY "mix_match_templates authed write"
  ON public.mix_match_templates FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

-- Shift existing catalog spreads down by 1 starting at sort_order 4 (jersey-1+)
UPDATE public.catalog_spreads SET sort_order = sort_order + 1 WHERE sort_order >= 4;

-- Insert the mixmatch spread between menu-2 (sort 3) and jersey-1 (now sort 5)
INSERT INTO public.catalog_spreads (spread_id, spread_type, page_left, page_right, product_id, category, title, sort_order)
VALUES ('mixmatch', 'mixmatch', 0, 0, NULL, NULL, 'BUILD YOUR SET', 4)
ON CONFLICT DO NOTHING;
