import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { updateUserPlan } from '@/services/billing';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Verify session using cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { planId } = body;

    const validPlans = ['solo', 'smb', 'agency', 'franchise'];
    if (!planId || !validPlans.includes(planId)) {
      return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    // Call shared service helper to update plan in both users and workspaces tables
    await updateUserPlan(user.id, planId, `mock_cust_${user.id.substring(0, 8)}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Mock checkout confirmation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update plan.' }, { status: 500 });
  }
}
