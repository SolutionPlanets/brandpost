-- Add missing social handle columns to brand_kits table
ALTER TABLE public.brand_kits 
ADD COLUMN IF NOT EXISTS instagram_handle text,
ADD COLUMN IF NOT EXISTS facebook_handle text;

-- Add brand_description if it's missing (sometimes renamed or forgotten)
ALTER TABLE public.brand_kits 
ADD COLUMN IF NOT EXISTS brand_description text;

-- Add heading and body font if missing
ALTER TABLE public.brand_kits 
ADD COLUMN IF NOT EXISTS heading_font text DEFAULT 'Inter',
ADD COLUMN IF NOT EXISTS body_font text DEFAULT 'Inter';

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
