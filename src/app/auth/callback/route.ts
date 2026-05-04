import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const error_description = searchParams.get('error_description');

  if (error_description) {
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error_description)}`);
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    // Exchange the code for a session (PKCE)
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Exchange successful! Now ensure public user record exists
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fallback: Ensure the public user record exists in case the trigger failed
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!existingUser) {
          // Create the public user record manually
          await supabase.from('users').insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || 'User',
            mail_verified: true,
            plan_id: 'solo',
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          });
          
          // Create initial workspace
          await supabase.from('workspaces').insert({
            owner_id: user.id,
            business_name: 'My Workspace',
            plan_id: 'solo'
          });
        } else {
          // Mark user email as verified in our public table
          await supabase
            .from('users')
            .update({ mail_verified: true })
            .eq('id', user.id);
        }

        // Check if user has completed onboarding
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id, brand_kits(id)')
          .eq('owner_id', user.id)
          .maybeSingle();

        const brandKits = workspace?.brand_kits;
        const hasBrandKit = brandKits ? (Array.isArray(brandKits) ? brandKits.length > 0 : Object.keys(brandKits).length > 0) : false;
        
        const redirectPath = hasBrandKit ? next : '/onboarding';
        return NextResponse.redirect(`${origin}${redirectPath}`);
      }
    } else {
      console.error('Code exchange error:', error);
      // If verifier is missing, provide a clearer error message
      let msg = error.message;
      if (msg.includes('code verifier not found')) {
        msg = 'Verification failed: Please open the confirmation link in the same browser you used to sign up.';
      }
      return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(msg)}`);
    }
  }

  // Fallback if no code and no error
  return NextResponse.redirect(`${origin}/auth/login?error=Authentication failed. Link may be invalid or expired.`);
}
