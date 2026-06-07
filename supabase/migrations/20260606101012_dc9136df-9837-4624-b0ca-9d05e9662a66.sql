
DO $$
DECLARE
  prod RECORD;
BEGIN
  FOR prod IN SELECT id FROM public.products LOOP
    INSERT INTO public.color_variants (product_id, name, hex_main, hex_shade, is_light, sort_order)
    SELECT prod.id, v.name, v.hex_main, v.hex_shade, v.is_light, v.sort_order
    FROM (VALUES
      ('SKY BLUE',    '#1E90FF', '#0A5CAD', false, 9),
      ('CRIMSON RED', '#C0141E', '#8B0000', false, 10),
      ('TEAL',        '#008B8B', '#005F5F', false, 11),
      ('SILVER GRAY', '#9E9E9E', '#616161', false, 12)
    ) AS v(name, hex_main, hex_shade, is_light, sort_order)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.color_variants cv
      WHERE cv.product_id = prod.id AND cv.name = v.name
    );
  END LOOP;
END $$;
