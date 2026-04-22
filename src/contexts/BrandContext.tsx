'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface BrandContextType {
  businessName: string;
  logo: string | null;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  setBusinessName: (name: string) => void;
  setLogo: (logo: string | null) => void;
  setColors: (colors: { primary: string; secondary: string; accent: string }) => void;
  refreshBrandData: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [businessName, setBusinessName] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [colors, setColors] = useState({
    primary: '#4f46e5',
    secondary: '#64748b',
    accent: '#06b6d4'
  });

  const supabase = createClient();

  const refreshBrandData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: workspace } = await supabase
      .from('workspaces')
      .select(`
        id,
        name,
        brand_kits (*)
      `)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (workspace) {
      const brandKit = workspace.brand_kits?.[0];
      let name = brandKit?.name || workspace.name || '';
      if (name === 'My Workspace') name = '';
      setBusinessName(name);
      setLogo(brandKit?.logo_url || null);
      if (brandKit?.primary_color) {
        setColors({
          primary: brandKit.primary_color,
          secondary: brandKit.secondary_color || '#64748b',
          accent: brandKit.accent_color || '#06b6d4'
        });
      }

      // Sync with localStorage for legacy components
      localStorage.setItem('brandpost_user_data', JSON.stringify({
        businessName: name,
        logo: brandKit?.logo_url || null,
        address: brandKit?.address || '',
        pincode: brandKit?.pincode || '',
      }));
    }
  };

  useEffect(() => {
    refreshBrandData();
  }, []);

  // Update localStorage when businessName changes locally (for real-time sync with legacy components)
  useEffect(() => {
    const savedData = localStorage.getItem('brandpost_user_data');
    const parsedData = savedData ? JSON.parse(savedData) : {};
    localStorage.setItem('brandpost_user_data', JSON.stringify({
      ...parsedData,
      businessName,
      logo
    }));
  }, [businessName, logo]);

  const value = React.useMemo(() => ({
    businessName,
    logo,
    colors,
    setBusinessName,
    setLogo,
    setColors,
    refreshBrandData
  }), [businessName, logo, colors]);

  return (
    <BrandContext.Provider value={value}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}
