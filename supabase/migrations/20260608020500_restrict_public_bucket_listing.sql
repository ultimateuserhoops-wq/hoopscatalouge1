-- Drop overly permissive SELECT policy that allowed anonymous listing of all
-- files in the public bucket. Public file URLs (getPublicUrl / render endpoint)
-- continue to work without a SELECT policy because the bucket is public.
DROP POLICY IF EXISTS "hoops images public read" ON storage.objects;
