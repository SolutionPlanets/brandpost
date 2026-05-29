-- Add timezone column to workspaces table
-- Stores the IANA timezone string (e.g. 'Asia/Kolkata', 'America/New_York')
-- Defaults to UTC if not set by the user during onboarding

ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

-- Backfill existing workspaces with a sensible default (Asia/Kolkata for Indian users)
-- Change this value to match your primary user base timezone
UPDATE public.workspaces
SET timezone = 'Asia/Kolkata'
WHERE timezone = 'UTC' OR timezone IS NULL;
