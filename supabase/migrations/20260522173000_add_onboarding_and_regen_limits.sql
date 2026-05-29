-- Migration: Add onboarding and brand context fields to brand_kits, and create regen_limits table
-- Created on: 2026-05-22 17:30:00

-- 1. Update brand_kits table with new onboarding and brand context columns
ALTER TABLE public.brand_kits
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS brand_audience text,
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS phrases_to_include text,
ADD COLUMN IF NOT EXISTS phrases_to_avoid text;

-- 2. Create regen_limits table to track daily image and caption regenerations per post
CREATE TABLE IF NOT EXISTS public.regen_limits (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id uuid NOT NULL UNIQUE REFERENCES public.posts(id) ON DELETE CASCADE,
    image_count integer DEFAULT 0,
    caption_count integer DEFAULT 0,
    reset_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on regen_limits
ALTER TABLE public.regen_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can manage own regen limits" ON public.regen_limits;

-- Create policy allowing users to manage their own post's regeneration limits
CREATE POLICY "Users can manage own regen limits" ON public.regen_limits
FOR ALL USING (
    post_id IN (
        SELECT id FROM public.posts 
        WHERE workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
        )
    )
);

-- Create updated_at trigger for regen_limits table
DROP TRIGGER IF EXISTS update_regen_limits_updated_at ON public.regen_limits;
CREATE TRIGGER update_regen_limits_updated_at 
BEFORE UPDATE ON public.regen_limits 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
