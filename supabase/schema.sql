-- ENABLE EXTENSIONS
-- Required for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLES

-- Table: users (Source 49, 50)
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE, -- Managed by Supabase Auth
    email text UNIQUE NOT NULL,
    full_name text,
    plan_id text DEFAULT 'solo' CHECK (plan_id IN ('solo', 'smb', 'agency', 'franchise')),
    stripe_customer_id text,
    trial_ends_at timestamp with time zone DEFAULT (now() + interval '14 days'),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: workspaces (Source 51, 52)
CREATE TABLE IF NOT EXISTS public.workspaces (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    plan_id text NOT NULL, -- Mirrors users.plan_id
    posts_used_this_cycle integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: brand_kits (Source 53, 54)
CREATE TABLE IF NOT EXISTS public.brand_kits (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name text NOT NULL, -- e.g. 'Main brand'
    logo_url text, -- Supabase Storage URL
    logo_dark_url text,
    primary_color text, -- HEX
    secondary_color text, -- HEX
    accent_color text, -- HEX
    heading_font text, -- Google Font name
    body_font text, -- Google Font name
    tone text CHECK (tone IN ('professional', 'friendly', 'playful', 'authoritative')),
    brand_description text, -- Max 300 chars as per PRD Section 5.1
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: social_connections (Source 57, 58)
CREATE TABLE IF NOT EXISTS public.social_connections (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    platform text NOT NULL CHECK (platform IN ('facebook', 'instagram')),
    page_id text NOT NULL,
    page_name text,
    access_token text NOT NULL, -- To be ENCRYPTED (Source 58)
    token_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: posts (Source 55, 56)
CREATE TABLE IF NOT EXISTS public.posts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    brand_kit_id uuid REFERENCES public.brand_kits(id) ON DELETE SET NULL,
    content_type text CHECK (content_type IN ('festive', 'offer', 'informational', 'general')),
    caption text,
    image_url text, -- Supabase Storage URL
    platform text NOT NULL CHECK (platform IN ('facebook', 'instagram', 'both')),
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
    scheduled_at timestamp with time zone, -- Null = publish now
    published_at timestamp with time zone,
    fb_post_id text,
    ig_post_id text,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. AUTOMATIC UPDATED_AT TRIGGER
-- This ensures the updated_at column changes whenever a row is modified.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_brand_kits_updated_at BEFORE UPDATE ON brand_kits FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_social_connections_updated_at BEFORE UPDATE ON social_connections FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 3. ROW LEVEL SECURITY (RLS)
-- As per Security Requirements (Source 275)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Users Policies: Users can only manage their own profile
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Workspaces Policies: Users can only manage workspaces they own
CREATE POLICY "Users can view their own workspaces" ON public.workspaces
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own workspaces" ON public.workspaces
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own workspaces" ON public.workspaces
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own workspaces" ON public.workspaces
    FOR DELETE USING (auth.uid() = owner_id);

-- Brand Kits Policies: Users can manage brand kits via workspace ownership
CREATE POLICY "Users can view brand kits in their workspaces" ON public.brand_kits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspaces
            WHERE workspaces.id = brand_kits.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert brand kits in their workspaces" ON public.brand_kits
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspaces
            WHERE workspaces.id = brand_kits.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update brand kits in their workspaces" ON public.brand_kits
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.workspaces
            WHERE workspaces.id = brand_kits.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
    );

-- Social Connections Policies
CREATE POLICY "Users can view their social connections" ON public.social_connections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspaces
            WHERE workspaces.id = social_connections.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their social connections" ON public.social_connections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspaces
            WHERE workspaces.id = social_connections.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
    );

-- Posts Policies
CREATE POLICY "Users can view their own posts" ON public.posts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspaces
            WHERE workspaces.id = posts.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own posts" ON public.posts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspaces
            WHERE workspaces.id = posts.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
    );
