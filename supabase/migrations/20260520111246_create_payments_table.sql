-- Create public.subscription table
CREATE TABLE IF NOT EXISTS public.subscription (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
    plan_id text NOT NULL,
    plan_name text NOT NULL,
    amount numeric NOT NULL,
    currency text NOT NULL DEFAULT 'INR',
    order_id text,
    gateway_customer_id text, -- holds razorpay_customer_id or stripe customer id
    phone_no text,
    mail text,
    payment_source text, -- e.g. 'card', 'upi', 'netbanking', 'wallet', 'stripe_checkout', 'mock'
    payment_status text NOT NULL, -- e.g. 'completed', 'failed', 'pending'
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.subscription ENABLE ROW LEVEL SECURITY;

-- Create Policy to allow users to view only their own payments
DROP POLICY IF EXISTS "Users can view their own payments" ON public.subscription;
CREATE POLICY "Users can view their own payments" ON public.subscription
    FOR SELECT USING (auth.uid() = user_id);

-- Create Policy to allow service-role / backend insert
DROP POLICY IF EXISTS "Enable insert for authenticated users or system" ON public.subscription;
CREATE POLICY "Enable insert for authenticated users or system" ON public.subscription
    FOR INSERT WITH CHECK (true);
