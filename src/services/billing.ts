import { createAdminClient } from '@/utils/supabase/admin';

export async function updateUserPlan(userId: string, planId: string, stripeCustomerId?: string) {
  const adminSupabase = createAdminClient();

  const updateData: any = { plan_id: planId };
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

const planIdToName: Record<string, string> = {
  solo: 'Solo Starter',
  smb: 'SMB Growth',
  agency: 'Agency Pro',
  franchise: 'Franchise'
};

export async function logPayment(details: {
  userId: string;
  planId: string;
  planName?: string;
  amount: number;
  currency: string;
  orderId?: string;
  gatewayCustomerId?: string;
  phoneNo?: string;
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

  const mappedPlanName = details.planName || planIdToName[details.planId.toLowerCase()] || details.planId;

  const { error } = await adminSupabase
    .from('payments')
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
      payment_source: details.paymentSource || null,
      payment_status: details.paymentStatus
    });

  if (error) {
    console.error('Error inserting payment log into database:', error);
  } else {
    console.log(`Payment successfully logged for user ${details.userId}: ${mappedPlanName} (${details.amount} ${details.currency}) - Status: ${details.paymentStatus}`);
  }
}
