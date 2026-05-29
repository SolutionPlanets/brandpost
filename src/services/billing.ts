import { createAdminClient } from '@/utils/supabase/admin';

export async function updateUserPlan(
  userId: string,
  planId: string,
  stripeCustomerId?: string,
  trialEndsAt: string | null = null
) {
  const adminSupabase = createAdminClient();

  const updateData: any = { 
    plan_id: planId,
    trial_ends_at: trialEndsAt
  };
  if (stripeCustomerId) {
    updateData.stripe_customer_id = stripeCustomerId;
  }

  // 1. Update user profile
  const { error: userError } = await adminSupabase
    .from('users')
    .update(updateData)
    .eq('id', userId);

  if (userError) {
    console.error('Error updating user plan via admin:', userError);
    throw userError;
  }

  // 2. Update all workspaces owned by the user
  const { error: workspaceError } = await adminSupabase
    .from('workspaces')
    .update({ plan_id: planId })
    .eq('owner_id', userId);

  if (workspaceError) {
    console.error('Error updating workspaces plan via admin:', workspaceError);
    throw workspaceError;
  }

  console.log(`Successfully upgraded user ${userId} and their workspaces to plan ${planId}`);
  return true;
}

export async function logPayment(details: {
  userId: string;
  planId: string;
  planName?: string;
  amount: number;
  currency: string;
  orderId?: string;
  gatewayCustomerId?: string;
  phoneNo?: string;
  mail?: string;
  paymentSource?: string;
  paymentStatus: 'completed' | 'failed' | 'pending';
}) {
  const adminSupabase = createAdminClient();

  let workspaceId: string | null = null;
  try {
    const { data: workspaces } = await adminSupabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', details.userId)
      .limit(1);
    if (workspaces && workspaces.length > 0) {
      workspaceId = workspaces[0].id;
    }
  } catch (e) {
    console.error('Error fetching workspace ID for logging payment:', e);
  }

  let mappedPlanName = details.planName;
  if (!mappedPlanName) {
    try {
      const { data: plan } = await adminSupabase
        .from('plan')
        .select('name')
        .eq('id', details.planId.toLowerCase())
        .maybeSingle();
      if (plan) {
        mappedPlanName = plan.name;
      }
    } catch (e) {
      console.error('Error fetching plan name for payment logging:', e);
    }
  }
  if (!mappedPlanName) {
    mappedPlanName = details.planId;
  }

  const { error } = await adminSupabase
    .from('subscription')
    .insert({
      user_id: details.userId,
      workspace_id: workspaceId,
      plan_id: details.planId,
      plan_name: mappedPlanName,
      amount: details.amount,
      currency: details.currency,
      order_id: details.orderId || null,
      gateway_customer_id: details.gatewayCustomerId || null,
      phone_no: details.phoneNo || null,
      mail: details.mail || null,
      payment_source: details.paymentSource || null,
      payment_status: details.paymentStatus
    });

  if (error) {
    console.error('Error inserting payment log into database:', error);
  } else {
    console.log(`Payment successfully logged for user ${details.userId}: ${mappedPlanName} (${details.amount} ${details.currency}) - Status: ${details.paymentStatus}`);
  }
}
