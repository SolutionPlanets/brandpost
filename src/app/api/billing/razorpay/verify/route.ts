import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { updateUserPlan, logPayment } from '@/services/billing';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature, 
      planId,
      amount,
      currency,
      phone_no,
      mail,
      payment_source
    } = body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !planId) {
      return NextResponse.json({ error: 'Missing payment details for verification' }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!keySecret) {
      return NextResponse.json({ error: 'Razorpay keys not configured on server' }, { status: 500 });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.error('Razorpay signature verification failed');
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    // Fetch payment details directly from Razorpay to get the actual user phone and email
    let paymentDetails: any = null;
    if (keyId) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
          headers: {
            'Authorization': authHeader
          }
        });
        if (rzpRes.ok) {
          paymentDetails = await rzpRes.json();
        } else {
          console.warn(`Razorpay payment fetch failed with status ${rzpRes.status}`);
        }
      } catch (fetchErr) {
        console.error('Error fetching Razorpay payment details:', fetchErr);
      }
    }

    const gatewayCustId = `rzp_cust_${user.id.substring(0, 8)}`;

    // Update user plan in DB
    await updateUserPlan(user.id, planId.toLowerCase(), gatewayCustId);

    // Log the payment in DB
    await logPayment({
      userId: user.id,
      planId: planId.toLowerCase(),
      amount: paymentDetails ? paymentDetails.amount / 100 : (amount || 0),
      currency: paymentDetails ? paymentDetails.currency : (currency || 'INR'),
      orderId: razorpay_order_id,
      gatewayCustomerId: gatewayCustId,
      phoneNo: paymentDetails?.contact || phone_no || '',
      mail: paymentDetails?.email || mail || '',
      paymentSource: paymentDetails ? `${paymentDetails.method}${paymentDetails.vpa ? ' (' + paymentDetails.vpa + ')' : ''}` : (payment_source || 'razorpay'),
      paymentStatus: 'completed'
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Razorpay verification error:', error);
    return NextResponse.json({ error: error.message || 'Failed to verify payment' }, { status: 500 });
  }
}
