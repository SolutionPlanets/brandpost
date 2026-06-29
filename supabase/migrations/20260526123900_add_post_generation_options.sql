-- Migration: Add post generation options
-- Created on: 2026-05-26

ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS mention_brand_logo boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS brand_logo_position text DEFAULT 'Bottom Right',
  ADD COLUMN IF NOT EXISTS mention_website_in_post boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS brand_link_position text DEFAULT 'Bottom Center',
  ADD COLUMN IF NOT EXISTS mention_website_in_caption boolean DEFAULT true;
