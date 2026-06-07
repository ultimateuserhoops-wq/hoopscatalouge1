ALTER TABLE public.catalog_themes ADD COLUMN IF NOT EXISTS display_bg text NOT NULL DEFAULT '#ffffff';
UPDATE public.catalog_themes SET display_bg = '#ffffff';