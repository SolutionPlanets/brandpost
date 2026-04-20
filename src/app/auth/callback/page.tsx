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
      const { error } = await supabase.auth.getSession();
      
      const next = searchParams.get('next') || '/dashboard';
      
      if (error) {
        console.error('Auth callback error:', error.message);
        router.push('/auth/login?error=Authentication failed');
      } else {
        router.push(next);
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
