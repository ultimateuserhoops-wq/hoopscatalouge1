
-- 1) template_sets: restrict SELECT to authenticated users (admin/CMS assets)
DROP POLICY IF EXISTS "ts read all" ON public.template_sets;
CREATE POLICY "ts read authenticated" ON public.template_sets
  FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.template_sets FROM anon;

-- 2) app_settings: ensure anonymous role has zero access (stores API keys)
REVOKE ALL ON public.app_settings FROM anon;
