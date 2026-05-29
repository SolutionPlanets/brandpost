-- 1. Create plan table
CREATE TABLE IF NOT EXISTS public.plan (
    id text PRIMARY KEY,
    name text NOT NULL,
    target text,
    usd_monthly numeric NOT NULL,
    usd_yearly numeric NOT NULL,
    inr_monthly numeric NOT NULL,
    inr_yearly numeric NOT NULL,
    post_limit integer NOT NULL,
    brand_kit_limit integer NOT NULL,
    team_members_limit text NOT NULL,
    festive_events text NOT NULL,
    scheduling_queue text NOT NULL,
    post_templates_limit text NOT NULL,
    white_label_reports text NOT NULL,
    features text[] NOT NULL,
    is_featured boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.plan ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy for public read access
DROP POLICY IF EXISTS "Allow public read access to active plans" ON public.plan;
CREATE POLICY "Allow public read access to active plans" ON public.plan
    FOR SELECT USING (is_active = true);

-- 4. Seed initial plans (Solo Starter, SMB Growth, Agency Pro, Franchise, and Trial)
INSERT INTO public.plan (
    id, name, target, usd_monthly, usd_yearly, inr_monthly, inr_yearly,
    post_limit, brand_kit_limit, team_members_limit, festive_events,
    scheduling_queue, post_templates_limit, white_label_reports, features, is_featured
) VALUES
(
    'solo', 'Solo Starter', 'Solo entrepreneur', 29, 276, 2415, 22984,
    30, 1, '1', '12 (major only)', 'Yes', '5', 'No',
    ARRAY[
      '1 Brand kit',
      '30 AI posts / month',
      '1 Team member',
      '12 Festive calendar events (major only)',
      'Scheduling queue',
      '5 Post templates',
      'Standard reports'
    ], false
),
(
    'smb', 'SMB Growth', 'Small business', 59, 564, 4912, 46963,
    100, 3, '3', 'All 30+', 'Yes', '20', 'No',
    ARRAY[
      '3 Brand kits',
      '100 AI posts / month',
      '3 Team members',
      'All 30+ Festive calendar events',
      'Scheduling queue',
      '20 Post templates',
      'Standard reports'
    ], true
),
(
    'agency', 'Agency Pro', 'Marketing agencies', 149, 1428, 12404, 118900,
    2147483647, 15, '10', 'All 30+', 'Yes + bulk', 'Unlimited', 'Yes',
    ARRAY[
      '15 Brand kits',
      'Unlimited AI posts',
      '10 Team members',
      'All 30+ Festive calendar events',
      'Scheduling queue + bulk',
      'Unlimited Post templates',
      'White-label reports'
    ], false
),
(
    'franchise', 'Franchise', 'Franchise brands', 399, 3828, 33218, 318790,
    2147483647, 1000, 'Unlimited', 'All 30+', 'Yes + bulk', 'Unlimited', 'Yes',
    ARRAY[
      'Unlimited Brand kits',
      'Unlimited AI posts',
      'Unlimited Team members',
      'All 30+ Festive calendar events',
      'Scheduling queue + bulk',
      'Unlimited Post templates',
      'White-label reports'
    ], false
),
(
    'trial', 'Trial', 'Trial period configuration', 0, 0, 0, 0,
    100, 3, '3', 'All 30+', 'Yes', '20', 'No',
    ARRAY[]::text[], false
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    target = EXCLUDED.target,
    usd_monthly = EXCLUDED.usd_monthly,
    usd_yearly = EXCLUDED.usd_yearly,
    inr_monthly = EXCLUDED.inr_monthly,
    inr_yearly = EXCLUDED.inr_yearly,
    post_limit = EXCLUDED.post_limit,
    brand_kit_limit = EXCLUDED.brand_kit_limit,
    team_members_limit = EXCLUDED.team_members_limit,
    festive_events = EXCLUDED.festive_events,
    scheduling_queue = EXCLUDED.scheduling_queue,
    post_templates_limit = EXCLUDED.post_templates_limit,
    white_label_reports = EXCLUDED.white_label_reports,
    features = EXCLUDED.features,
    is_featured = EXCLUDED.is_featured;

-- 5. Drop check constraint on users.plan_id to allow dynamic plan IDs
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_plan_id_check;

-- 6. Add foreign key referencing plan table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_plan_id_fkey' AND table_name = 'users'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT users_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plan(id) ON UPDATE CASCADE ON DELETE RESTRICT;
    END IF;
END $$;
