-- Add timezone column to workspaces table
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Asia/Kolkata';

-- Update the handle_new_user function to include default timezone (optional, but good for consistency)
-- No changes needed to the function if we use a DEFAULT value on the column.
