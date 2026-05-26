import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.redirect(`${origin}/auth/login?from=pricing`);
  }

  // Razorpay handles self-serve cancellation and receipts on our customer portal page
  return NextResponse.redirect(`${origin}/pricing/mock-portal`);
}
