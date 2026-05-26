import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { updateUserPlan, logPayment } from '@/services/billing';

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
    const { planId, amount, currency, phone_no, mail, payment_source } = body;

    if (!planId) {
      return NextResponse.json({ error: 'Missing plan ID' }, { status: 400 });
    }

    // Fetch plan from database to validate it
    const { data: plan, error: planError } = await supabase
      .from('plan')
      .select('id')
      .eq('id', planId.toLowerCase())
      .maybeSingle();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    const mockCustId = `mock_cust_${user.id.substring(0, 8)}`;

    // Call shared service helper to update plan in both users and workspaces tables
    await updateUserPlan(user.id, planId, mockCustId);

    // Log the payment details in database
    await logPayment({
      userId: user.id,
      planId: planId,
      amount: amount || 0,
      currency: currency || 'USD',
      orderId: `mock_order_${Date.now()}`,
      gatewayCustomerId: mockCustId,
      phoneNo: phone_no || '',
      mail: mail || '',
      paymentSource: payment_source || 'mock',
      paymentStatus: 'completed'
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Mock checkout confirmation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update plan.' }, { status: 500 });
  }
}
