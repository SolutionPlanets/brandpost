'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface BrandContextType {
  fullName: string;
  businessName: string;
  logo: string | null;
  profilePhoto: string | null;
  authProvider: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  setBusinessName: (name: string) => void;
  setLogo: (logo: string | null) => void;
  setProfilePhoto: (photo: string | null) => void;
  setColors: (colors: { primary: string; secondary: string; accent: string }) => void;
  refreshBrandData: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<string>('email');
  const [colors, setColors] = useState({
    primary: '#4f46e5',
    secondary: '#64748b',
    accent: '#06b6d4'
  });

  const supabase = createClient();

  const refreshBrandData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch user's full_name, profile_photo, and auth_provider from the users table
    const { data: userProfile } = await supabase
      .from('users')
      .select('full_name, profile_photo, auth_provider')
      .eq('id', user.id)
      .maybeSingle();

    if (userProfile?.full_name) {
      setFullName(userProfile.full_name);
    }

    // Determine profile photo based on auth provider
    const storedProvider = userProfile?.auth_provider || 'email';
    setAuthProvider(storedProvider);

    // Priority: 1) Photo from DB (captured in callback or uploaded) 2) OAuth metadata
    if (userProfile?.profile_photo) {
      setProfilePhoto(userProfile.profile_photo);
    } else if (storedProvider === 'google') {
      setProfilePhoto(user.user_metadata?.avatar_url || user.user_metadata?.picture || null);
    } else if (storedProvider === 'facebook') {
      setProfilePhoto(user.user_metadata?.avatar_url || user.user_metadata?.picture || null);
    } else {
      setProfilePhoto(null);
    }

    // Fetch workspace and brand kit
    const { data: workspace } = await supabase
      .from('workspaces')
      .select(`
        id,
        business_name,
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
        fullName: userProfile?.full_name || '',
        businessName: bName,
        logo: brandKit?.logo_url || null,
        profilePhoto: userProfile?.profile_photo || null,
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
      businessName,
      logo
    }));
  }, [fullName, businessName, logo]);

  const value = React.useMemo(() => ({
    fullName,
    businessName,
    logo,
    profilePhoto,
    authProvider,
    colors,
    setBusinessName,
    setLogo,
    setProfilePhoto,
    setColors,
    refreshBrandData
  }), [fullName, businessName, logo, profilePhoto, authProvider, colors]);

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

