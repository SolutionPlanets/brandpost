-- 1. Create the social_connections table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.social_connections (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    platform text NOT NULL CHECK (platform IN ('facebook', 'instagram')),
    page_id text NOT NULL,
    page_name text,
    picture_url text,
    access_token text NOT NULL,
    token_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy: Users can view their own workspace's social connections
DROP POLICY IF EXISTS "Users can view their own social connections" ON public.social_connections;
CREATE POLICY "Users can view their own social connections"
ON public.social_connections
FOR SELECT
USING (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
  )
);

-- 4. Create Policy: Users can insert their own workspace's social connections
DROP POLICY IF EXISTS "Users can insert their own social connections" ON public.social_connections;
CREATE POLICY "Users can insert their own social connections"
ON public.social_connections
FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
  )
);

-- 5. Create Policy: Users can update their own workspace's social connections
DROP POLICY IF EXISTS "Users can update their own social connections" ON public.social_connections;
CREATE POLICY "Users can update their own social connections"
ON public.social_connections
FOR UPDATE
USING (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
  )
);

-- 6. Create Policy: Users can delete their own workspace's social connections
DROP POLICY IF EXISTS "Users can delete their own social connections" ON public.social_connections;
CREATE POLICY "Users can delete their own social connections"
ON public.social_connections
FOR DELETE
USING (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
  )
);

-- 7. Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
