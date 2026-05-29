-- 1. FIX USERS TABLE
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS mail_verified boolean DEFAULT false;

-- 2. FIX WORKSPACES TABLE
-- Rename 'name' to 'business_name' to match the PRD and Frontend code
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspaces' AND column_name='name') THEN
    ALTER TABLE public.workspaces RENAME COLUMN name TO business_name;
  END IF;
END $$;

-- Ensure all required columns exist in workspaces
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS pincode text,
ADD COLUMN IF NOT EXISTS business_timing text,
ADD COLUMN IF NOT EXISTS owner_name text,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Asia/Kolkata';

-- 3. FIX BRAND_KITS TABLE
-- Ensure 'brand_kit_name' exists and is not 'name'
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brand_kits' AND column_name='name') THEN
    ALTER TABLE public.brand_kits RENAME COLUMN name TO brand_kit_name;
  END IF;
END $$;

-- Ensure all columns used by Brand Kit Manager and onboarding exist
ALTER TABLE public.brand_kits
ADD COLUMN IF NOT EXISTS logo_dark_url text,
ADD COLUMN IF NOT EXISTS instagram_handle text,
ADD COLUMN IF NOT EXISTS facebook_handle text,
ADD COLUMN IF NOT EXISTS accent_color text,
ADD COLUMN IF NOT EXISTS heading_font text,
ADD COLUMN IF NOT EXISTS body_font text,
ADD COLUMN IF NOT EXISTS brand_description text;

-- 4. FIX ROW LEVEL SECURITY (RLS)
-- Users Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;

CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Enable insert for authenticated users only" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Workspaces Policies
DROP POLICY IF EXISTS "Users can view their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can update their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can insert their own workspaces" ON workspaces;

CREATE POLICY "Users can view their own workspaces" ON workspaces FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can update their own workspaces" ON workspaces FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own workspaces" ON workspaces FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Brand Kits Policies
DROP POLICY IF EXISTS "Users can view their own brand kits" ON brand_kits;
DROP POLICY IF EXISTS "Users can update their own brand kits" ON brand_kits;
DROP POLICY IF EXISTS "Users can insert their own brand kits" ON brand_kits;

CREATE POLICY "Users can view their own brand kits" ON brand_kits 
FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can update their own brand kits" ON brand_kits 
FOR UPDATE USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can insert their own brand kits" ON brand_kits 
FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 5. UPDATE TRIGGER FUNCTION
-- Ensure it handles mail_verified and business_name
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

-- 6. SECURE EMAIL EXISTENCE CHECK (FOR SIGNUP UX)
CREATE OR REPLACE FUNCTION public.check_user_exists(email_to_check text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.users WHERE email = email_to_check);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
