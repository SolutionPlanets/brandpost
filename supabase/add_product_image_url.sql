-- Add product_image_url column to posts table
-- This stores the URL of the user-uploaded product photo used for subject-conditioned generation
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS product_image_url text NULL;

COMMENT ON COLUMN public.posts.product_image_url IS 'URL of the uploaded product photo (white background) used in subject-conditioned image generation';
