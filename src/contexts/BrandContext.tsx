'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface BrandContextType {
  fullName: string;
  ownerName: string;
  businessName: string;
  logo: string | null;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  address: string;
  pincode: string;
  instagram: string;
  facebook: string;
  setBusinessName: (name: string) => void;
  setLogo: (logo: string | null) => void;
  setColors: (colors: { primary: string; secondary: string; accent: string }) => void;
  refreshBrandData: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [fullName, setFullName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [colors, setColors] = useState({
    primary: '#4f46e5',
    secondary: '#64748b',
    accent: '#06b6d4'
  });
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');

  const supabase = createClient();

  const refreshBrandData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch user's full_name from the users table
    const { data: userProfile } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (userProfile?.full_name) {
      setFullName(userProfile.full_name);
    }

    // Fetch workspace and brand kit
    const { data: workspace } = await supabase
      .from('workspaces')
      .select(`
        id,
        business_name,
        owner_name,
        address,
        pincode,
        brand_kits (*)
      `)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (workspace) {
      const bKits = workspace.brand_kits;
      const brandKit = bKits ? (Array.isArray(bKits) ? bKits[0] : bKits) : undefined;
      const bName = workspace.business_name && workspace.business_name !== 'My Workspace' 
        ? workspace.business_name 
        : '';
      setBusinessName(bName);
      setOwnerName(workspace.owner_name || '');
      setAddress(workspace.address || '');
      setPincode(workspace.pincode || '');
      setLogo(brandKit?.logo_url || null);
      setInstagram(brandKit?.instagram_handle || '');
      setFacebook(brandKit?.facebook_handle || '');
      if (brandKit?.primary_color) {
        setColors({
          primary: brandKit.primary_color,
          secondary: brandKit.secondary_color || '#64748b',
          accent: brandKit.accent_color || '#06b6d4'
        });
      }

      // Sync with localStorage for legacy components
      localStorage.setItem('brandpost_user_data', JSON.stringify({
        fullName: userProfile?.full_name || '',
        ownerName: workspace.owner_name || '',
        businessName: bName,
        address: workspace.address || '',
        pincode: workspace.pincode || '',
        logo: brandKit?.logo_url || null,
        instagram: brandKit?.instagram_handle || '',
        facebook: brandKit?.facebook_handle || '',
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
      fullName,
      ownerName,
      businessName,
      address,
      pincode,
      logo,
      instagram,
      facebook
    }));
  }, [fullName, ownerName, businessName, address, pincode, logo, instagram, facebook]);

  const value = React.useMemo(() => ({
    fullName,
    ownerName,
    businessName,
    address,
    pincode,
    instagram,
    facebook,
    logo,
    colors,
    setBusinessName,
    setLogo,
    setColors,
    refreshBrandData
  }), [fullName, ownerName, businessName, address, pincode, instagram, facebook, logo, colors]);

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

