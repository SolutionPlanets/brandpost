-- Add profile_photo and auth_provider columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_photo text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_provider text DEFAULT 'email' CHECK (auth_provider IN ('email', 'google', 'facebook'));

-- Storage policy for Brandpost_AI_Profile bucket
-- Users can upload their own profile photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('Brandpost_AI_Profile', 'Brandpost_AI_Profile', true) 
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
DROP POLICY IF EXISTS "Users can upload profile photos" ON storage.objects;
CREATE POLICY "Users can upload profile photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'Brandpost_AI_Profile' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own photos
DROP POLICY IF EXISTS "Users can update profile photos" ON storage.objects;
CREATE POLICY "Users can update profile photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'Brandpost_AI_Profile' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to profile photos
DROP POLICY IF EXISTS "Public can view profile photos" ON storage.objects;
CREATE POLICY "Public can view profile photos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'Brandpost_AI_Profile');

-- Allow users to delete their own photos
DROP POLICY IF EXISTS "Users can delete profile photos" ON storage.objects;
CREATE POLICY "Users can delete profile photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'Brandpost_AI_Profile' AND (storage.foldername(name))[1] = auth.uid()::text);
