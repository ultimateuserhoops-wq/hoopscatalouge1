
CREATE TABLE IF NOT EXISTS public.mix_match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jersey_id UUID NOT NULL REFERENCES public.mix_match_templates(id) ON DELETE CASCADE,
  shorts_id UUID NOT NULL REFERENCES public.mix_match_templates(id) ON DELETE CASCADE,
  result_photo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mix_match_results TO authenticated;
GRANT SELECT ON public.mix_match_results TO anon;
GRANT ALL ON public.mix_match_results TO service_role;
ALTER TABLE public.mix_match_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mix_match_results public read" ON public.mix_match_results FOR SELECT USING (true);
CREATE POLICY "mix_match_results auth write" ON public.mix_match_results FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.mix_match_defaults (
  jersey_id UUID NOT NULL REFERENCES public.mix_match_templates(id) ON DELETE CASCADE,
  shorts_id UUID NOT NULL REFERENCES public.mix_match_templates(id) ON DELETE CASCADE,
  result_photo TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (jersey_id, shorts_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mix_match_defaults TO authenticated;
GRANT SELECT ON public.mix_match_defaults TO anon;
GRANT ALL ON public.mix_match_defaults TO service_role;
ALTER TABLE public.mix_match_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mix_match_defaults public read" ON public.mix_match_defaults FOR SELECT USING (true);
CREATE POLICY "mix_match_defaults auth write" ON public.mix_match_defaults FOR ALL TO authenticated USING (true) WITH CHECK (true);
