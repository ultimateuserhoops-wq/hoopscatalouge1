
CREATE POLICY "hoops images public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'hoops-catalog-images');

CREATE POLICY "hoops images auth insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hoops-catalog-images');

CREATE POLICY "hoops images auth update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'hoops-catalog-images') WITH CHECK (bucket_id = 'hoops-catalog-images');

CREATE POLICY "hoops images auth delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'hoops-catalog-images');
