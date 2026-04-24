'use client';

import { useState, useEffect } from 'react';
import OnboardingWizard from '@/components/OnboardingWizard';
import BrandKitCard from '@/components/BrandKitCard';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

export default function BrandKitPage() {
  const [loading, setLoading] = useState(true);
  const [brandKit, setBrandKit] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const supabase = createClient();

  const fetchBrandKit = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, brand_kits(*)')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (workspace?.brand_kits?.[0]) {
      setBrandKit(workspace.brand_kits[0]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBrandKit();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  if (isEditing || !brandKit) {
    return (
      <div>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{brandKit ? 'Edit Brand Kit' : 'Setup Your Brand Kit'}</h1>
          {brandKit && (
            <button 
              onClick={() => setIsEditing(false)}
              style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: 'var(--background)', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius)',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          )}
        </div>
        <OnboardingWizard />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>My Brand Kit</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage your brand identity and voice.</p>
      </div>
      <BrandKitCard 
        brandKit={brandKit} 
        onEdit={() => setIsEditing(true)} 
      />
    </div>
  );
}
