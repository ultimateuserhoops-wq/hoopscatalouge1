
CREATE TABLE public.template_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Template',
  template_jersey TEXT,
  template_back TEXT,
  template_shorts TEXT,
  template_name TEXT,
  template_back_name TEXT,
  template_shorts_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

GRANT SELECT ON public.template_sets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_sets TO authenticated;
GRANT ALL ON public.template_sets TO service_role;

ALTER TABLE public.template_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ts read all" ON public.template_sets FOR SELECT USING (true);
CREATE POLICY "ts write auth" ON public.template_sets FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER set_template_sets_updated_at
BEFORE UPDATE ON public.template_sets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
