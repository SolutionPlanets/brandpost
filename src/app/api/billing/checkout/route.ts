import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const planId = searchParams.get('planId') || 'solo';
  const billingPeriod = searchParams.get('period') || 'monthly'; // 'monthly' | 'yearly'

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Verify active user session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.redirect(`${origin}/auth/login?from=pricing`);
  }

  // Redirect directly to the unified Razorpay page which handles real script loading and mock sandbox fallback
  return NextResponse.redirect(`${origin}/pricing/razorpay?planId=${planId}&period=${billingPeriod}`);
}
