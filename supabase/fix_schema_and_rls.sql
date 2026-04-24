-- 1. FIX WORKSPACES TABLE
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
ADD COLUMN IF NOT EXISTS business_timing text;

-- 2. FIX BRAND_KITS TABLE
-- Ensure 'brand_kit_name' exists and is not 'name'
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brand_kits' AND column_name='name') THEN
    ALTER TABLE public.brand_kits RENAME COLUMN name TO brand_kit_name;
  END IF;
END $$;

-- 3. FIX ROW LEVEL SECURITY (RLS)
-- This is likely why you get {} error: the user doesn't have permission to Update or Insert.

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

-- 4. UPDATE TRIGGER FUNCTION
-- Ensure it uses the new column name 'business_name'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_user_id uuid;
BEGIN
    INSERT INTO public.users (id, email, full_name, plan_id, trial_ends_at)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'solo', now() + interval '14 days')
    RETURNING id INTO new_user_id;

    INSERT INTO public.workspaces (owner_id, business_name, plan_id)
    VALUES (new_user_id, 'My Workspace', 'solo');

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
