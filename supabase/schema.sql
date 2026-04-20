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
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- EXAMPLE POLICY (Workspaces): Users can only see workspaces they own
CREATE POLICY "Users can view their own workspaces" ON workspaces
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can update their own workspaces" ON workspaces
    FOR UPDATE USING (auth.uid() = owner_id);
