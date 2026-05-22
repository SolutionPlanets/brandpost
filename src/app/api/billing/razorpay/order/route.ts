import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import Razorpay from 'razorpay';

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

    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    // Fetch plan details dynamically from the database
    const { data: plan, error: planError } = await supabase
      .from('plan')
      .select('*')
      .eq('id', planId.toLowerCase())
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan not found or database offline' }, { status: 404 });
    }

    const isYearly = period === 'yearly';
    const baseInrPrice = isYearly ? Number(plan.inr_yearly) : Number(plan.inr_monthly);
    const gstPercentage = Number(plan.gst || 0);
    const priceWithGst = baseInrPrice * (1 + gstPercentage / 100);
    const amountPaisa = Math.round(priceWithGst * 100);

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
