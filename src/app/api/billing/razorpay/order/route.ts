import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import Razorpay from 'razorpay';

const inrPricesPaisa: Record<string, { monthly: number; yearly: number }> = {
  solo: { monthly: 241500, yearly: 2298400 },
  smb: { monthly: 491200, yearly: 4696300 },
  agency: { monthly: 1240400, yearly: 11890000 },
  franchise: { monthly: 3321800, yearly: 31879000 }
};

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { planId, period } = body; // period: 'monthly' | 'yearly'

    const validPlans = ['solo', 'smb', 'agency', 'franchise'];
    if (!planId || !validPlans.includes(planId.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid planId' }, { status: 400 });
    }

    const isYearly = period === 'yearly';
    const planPrices = inrPricesPaisa[planId.toLowerCase()];
    const amountPaisa = isYearly ? planPrices.yearly : planPrices.monthly;

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Check if Razorpay keys are configured
    if (!keyId || !keySecret || keyId.trim() === '' || keySecret.trim() === '') {
      console.log('Razorpay keys not configured. Responding with mock: true');
      return NextResponse.json({ 
        mock: true, 
        amount: amountPaisa / 100, 
        planId: planId.toLowerCase(), 
        period 
      });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    const orderOptions = {
      amount: amountPaisa,
      currency: 'INR',
      receipt: `receipt_${user.id.substring(0, 8)}_${planId}_${Date.now()}`,
      notes: {
        userId: user.id,
        planId: planId.toLowerCase(),
        period: period
      }
    };

    const order = await razorpay.orders.create(orderOptions);

    return NextResponse.json({
      mock: false,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: keyId
    });
  } catch (err: any) {
    console.error('Razorpay order creation error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create order' }, { status: 500 });
  }
}
