-- Add owner_name column to workspaces table
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS owner_name text;
