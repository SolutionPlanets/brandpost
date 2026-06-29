-- Migration: Add placement_category and layout_style columns to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS placement_category text CHECK (placement_category IN ('physical', 'digital', 'institutional')),
ADD COLUMN IF NOT EXISTS layout_style text CHECK (layout_style IN ('commercial', 'minimalist', 'editorial'));
