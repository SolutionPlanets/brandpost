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
    business_name text NOT NULL,
    plan_id text NOT NULL, -- Mirrors users.plan_id
    address text,
    pincode text,
    business_timing text,
    posts_used_this_cycle integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: brand_kits (Source 53, 54)
CREATE TABLE IF NOT EXISTS public.brand_kits (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id uuid NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
    brand_kit_name text NOT NULL, -- e.g. 'Main brand'
    logo_url text, -- Supabase Storage URL
    logo_dark_url text,
    primary_color text, -- HEX
    secondary_color text, -- HEX
    accent_color text, -- HEX
    heading_font text, -- Google Font name
    body_font text, -- Google Font name
    tone text,
    brand_description text, -- Max 300 chars as per PRD Section 5.1
    instagram_handle text,
    facebook_handle text,
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

-- Table: users: Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Table: workspaces: Users can manage their own workspaces
CREATE POLICY "Users can view own workspaces" ON workspaces FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can update own workspaces" ON workspaces FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own workspaces" ON workspaces FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Table: brand_kits: Users can manage brand kits for their workspaces
CREATE POLICY "Users can view own brand kits" ON brand_kits FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);
CREATE POLICY "Users can update own brand kits" ON brand_kits FOR UPDATE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);
CREATE POLICY "Users can insert own brand kits" ON brand_kits FOR INSERT WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- Table: social_connections: Users can manage connections for their workspaces
CREATE POLICY "Users can manage own social connections" ON social_connections FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- Table: posts: Users can manage posts for their workspaces
CREATE POLICY "Users can manage own posts" ON posts FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- 4. NEW USER REGISTRATION TRIGGER
-- This function runs whenever a new user signs up via Supabase Auth.
-- It automatically creates a public user profile and a default workspace.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_user_id uuid;
    is_verified boolean;
    provider_name text;
    avatar_url text;
BEGIN
    -- OAuth/Social users are auto-verified
    is_verified := (new.raw_app_meta_data->>'provider' IN ('google', 'facebook'));

    -- Determine clean provider name matching public.users CHECK constraints
    provider_name := new.raw_app_meta_data->>'provider';
    IF provider_name IS NULL OR provider_name NOT IN ('google', 'facebook') THEN
        provider_name := 'email';
    END IF;

    -- Extract avatar URL from provider metadata
    avatar_url := COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture');

    INSERT INTO public.users (id, email, full_name, plan_id, trial_ends_at, mail_verified, auth_provider, profile_photo)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'solo', now() + interval '14 days', is_verified, provider_name, avatar_url)
    RETURNING id INTO new_user_id;

    INSERT INTO public.workspaces (owner_id, business_name, plan_id)
    VALUES (new_user_id, 'My Workspace', 'solo');

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created in auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. STORAGE POLICIES
-- NOTE: Please run this block below in your Supabase SQL Editor to fix the 400 RLS Upload Error.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('BrandpostAI_logos', 'BrandpostAI_logos', true) 
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated uploads" 
ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'BrandpostAI_logos');

CREATE POLICY "Allow public viewing of logos" 
ON storage.objects 
FOR SELECT TO public 
USING (bucket_id = 'BrandpostAI_logos');

CREATE POLICY "Allow authenticated updates" 
ON storage.objects 
FOR UPDATE TO authenticated 
USING (auth.uid() = owner) 
WITH CHECK (bucket_id = 'BrandpostAI_logos');

CREATE POLICY "Allow authenticated deletes" 
ON storage.objects 
FOR DELETE TO authenticated 
USING (auth.uid() = owner AND bucket_id = 'BrandpostAI_logos');
