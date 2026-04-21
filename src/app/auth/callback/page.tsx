'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = createClient();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      const nextParam = searchParams.get('next');
      
      if (error || !session) {
        console.error('Auth callback error:', error?.message);
        router.push('/auth/login?error=Authentication failed');
        return;
      }

      // Check if user already has a workspace (meaning they finished onboarding)
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', session.user.id)
        .single();

      if (workspace) {
        // User exists and is set up
        if (nextParam === '/onboarding') {
          // They clicked "Sign up" but already have an account
          router.push('/auth/login?message=existing_user');
        } else {
          router.push('/dashboard');
        }
      } else {
        // New user or incomplete onboarding
        router.push('/onboarding');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyCenter: 'center', backgroundColor: '#f9fafb' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: '#4f46e5' }} />
        <p style={{ color: '#6b7280', fontWeight: 500 }}>Confirming authentication...</p>
      </div>
    </div>
  );
}
