import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect address
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Fetch user to determine onboarding status
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if user has completed onboarding (has a brand kit)
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id, brand_kits(id)')
          .eq('owner_id', user.id)
          .maybeSingle();

        const brandKits = workspace?.brand_kits;
        const hasBrandKit = brandKits ? (Array.isArray(brandKits) ? brandKits.length > 0 : Object.keys(brandKits).length > 0) : false;
        
        // Redirect to onboarding if new, otherwise to dashboard
        const redirectPath = hasBrandKit ? '/dashboard' : '/onboarding';
        return NextResponse.redirect(`${origin}${redirectPath}`);
      }
    } else {
      console.error('Code exchange error:', error);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/login?error=Authentication failed`);
}
