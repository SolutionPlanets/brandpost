import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createAdminClient } from '@/utils/supabase/admin';
import { updateUserPlan, logPayment } from '@/services/billing';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  if (!stripeSecretKey || !webhookSecret) {
    console.error('Stripe webhook received but Stripe environment variables are not configured.');
    return NextResponse.json({ error: 'Webhook configuration error' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-02-15-preview' as any,
  });

  const payload = await request.text();
  const headerList = await headers();
  const sig = headerList.get('stripe-signature') || '';

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    console.log(`Stripe Webhook Received: ${event.type}`);

    // Map Stripe Price IDs to our internal plan IDs
    const priceToPlanMapping: Record<string, string> = {
      [process.env.STRIPE_PRICE_SOLO_MONTHLY || '']: 'solo',
      [process.env.STRIPE_PRICE_SOLO_YEARLY || '']: 'solo',
      [process.env.STRIPE_PRICE_SMB_MONTHLY || '']: 'smb',
      [process.env.STRIPE_PRICE_SMB_YEARLY || '']: 'smb',
      [process.env.STRIPE_PRICE_AGENCY_MONTHLY || '']: 'agency',
      [process.env.STRIPE_PRICE_AGENCY_YEARLY || '']: 'agency',
      [process.env.STRIPE_PRICE_FRANCHISE_MONTHLY || '']: 'franchise',
      [process.env.STRIPE_PRICE_FRANCHISE_YEARLY || '']: 'franchise',
    };

    const adminSupabase = createAdminClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        const customerId = session.customer as string;

        if (userId && planId) {
          console.log(`Checkout completed. Upgrading user ${userId} to plan ${planId}`);
          await updateUserPlan(userId, planId, customerId);

          // Log payment in DB
          await logPayment({
            userId: userId,
            planId: planId,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency?.toUpperCase() || 'USD',
            orderId: session.id,
            gatewayCustomerId: customerId,
            phoneNo: session.customer_details?.phone || '',
            paymentSource: 'stripe_checkout',
            paymentStatus: 'completed'
          });
        } else {
          console.warn('Checkout completed but metadata (userId/planId) is missing.');
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;

        if (!priceId) break;

        const planId = priceToPlanMapping[priceId];
        if (planId) {
          // Find user by stripe_customer_id
          const { data: user, error: userError } = await adminSupabase
            .from('users')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();

          if (userError || !user) {
            console.error(`User with customer ID ${customerId} not found in database.`);
          } else {
            console.log(`Subscription updated for customer ${customerId}. Updating user ${user.id} to plan ${planId}`);
            await updateUserPlan(user.id, planId);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by stripe_customer_id
        const { data: user, error: userError } = await adminSupabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (userError || !user) {
          console.error(`User with customer ID ${customerId} not found in database.`);
        } else {
          console.log(`Subscription deleted. Downgrading user ${user.id} to 'solo' plan.`);
          await updateUserPlan(user.id, 'solo');
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(`Payment failed for invoice: ${invoice.id}. Customer: ${invoice.customer}`);
        break;
      }

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Stripe webhook execution error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
