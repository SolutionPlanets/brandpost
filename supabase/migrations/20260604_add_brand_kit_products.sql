-- Migration: Create brand_kit_products table for multi-product support per brand kit
-- Created on: 2026-06-04

-- 1. Create the brand_kit_products table
CREATE TABLE IF NOT EXISTS public.brand_kit_products (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_kit_id uuid NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
    product_name text,
    image_url text NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.brand_kit_products ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy: users can manage products for their own brand kits
DROP POLICY IF EXISTS "Users can manage own brand kit products" ON public.brand_kit_products;
CREATE POLICY "Users can manage own brand kit products" ON public.brand_kit_products
FOR ALL USING (
    brand_kit_id IN (
        SELECT bk.id FROM public.brand_kits bk
        JOIN public.workspaces w ON bk.workspace_id = w.id
        WHERE w.owner_id = auth.uid()
    )
);

-- 4. Auto-update trigger
DROP TRIGGER IF EXISTS update_brand_kit_products_updated_at ON public.brand_kit_products;
CREATE TRIGGER update_brand_kit_products_updated_at
BEFORE UPDATE ON public.brand_kit_products
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 5. STORAGE BUCKET & POLICIES FOR product-ingest
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-ingest', 'product-ingest', true) 
ON CONFLICT (id) DO NOTHING;

-- RLS: Allow authenticated users to upload to product-ingest
DROP POLICY IF EXISTS "Allow authenticated uploads to product-ingest" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to product-ingest" 
ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'product-ingest');

-- RLS: Allow public viewing of product-ingest
DROP POLICY IF EXISTS "Allow public viewing of product-ingest" ON storage.objects;
CREATE POLICY "Allow public viewing of product-ingest" 
ON storage.objects 
FOR SELECT TO public 
USING (bucket_id = 'product-ingest');

-- RLS: Allow authenticated users to update their product-ingest files
DROP POLICY IF EXISTS "Allow authenticated updates to product-ingest" ON storage.objects;
CREATE POLICY "Allow authenticated updates to product-ingest" 
ON storage.objects 
FOR UPDATE TO authenticated 
USING (auth.uid() = owner) 
WITH CHECK (bucket_id = 'product-ingest');

-- RLS: Allow authenticated users to delete their product-ingest files
DROP POLICY IF EXISTS "Allow authenticated deletes to product-ingest" ON storage.objects;
CREATE POLICY "Allow authenticated deletes to product-ingest" 
ON storage.objects 
FOR DELETE TO authenticated 
USING (auth.uid() = owner AND bucket_id = 'product-ingest');
