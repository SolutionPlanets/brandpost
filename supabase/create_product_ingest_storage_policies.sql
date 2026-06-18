-- Storage policies for the product-ingest bucket
-- Ensure the bucket exists and is set to public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-ingest', 'product-ingest', true) 
ON CONFLICT (id) DO NOTHING;

-- 1. Allow authenticated users to upload to their own folder inside the product-ingest bucket
DROP POLICY IF EXISTS "Users can upload product photos" ON storage.objects;
CREATE POLICY "Users can upload product photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-ingest' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Allow authenticated users to update their own uploaded product photos
DROP POLICY IF EXISTS "Users can update product photos" ON storage.objects;
CREATE POLICY "Users can update product photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-ingest' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Allow public read access to product photos (needed for the API and UI to load the images)
DROP POLICY IF EXISTS "Public can view product photos" ON storage.objects;
CREATE POLICY "Public can view product photos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'product-ingest');

-- 4. Allow users to delete their own product photos
DROP POLICY IF EXISTS "Users can delete product photos" ON storage.objects;
CREATE POLICY "Users can delete product photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-ingest' AND (storage.foldername(name))[1] = auth.uid()::text);
