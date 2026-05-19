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
