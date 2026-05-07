'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface BrandContextType {
  fullName: string;
  ownerName: string;
  businessName: string;
  brandKitName: string;
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
  brandTone: string;
  brandDescription: string;
  planId: string;
  trialEndsAt: string | null;
  createdAt: string | null;
  postsUsed: number;
  workspaceId: string | null;
  timezone: string;
  timing: string;
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
  const [brandKitName, setBrandKitName] = useState('');
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
  const [brandTone, setBrandTone] = useState('Professional');
  const [brandDescription, setBrandDescription] = useState('');
  const [planId, setPlanId] = useState('solo');
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [postsUsed, setPostsUsed] = useState(0);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [timing, setTiming] = useState('');

  const supabase = createClient();

  const refreshBrandData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch user's full_name from the users table
    const { data: userProfile } = await supabase
      .from('users')
      .select('full_name, plan_id, trial_ends_at, created_at')
      .eq('id', user.id)
      .maybeSingle();
 
    if (userProfile) {
      if (userProfile.full_name) setFullName(userProfile.full_name);
      setPlanId(userProfile.plan_id || 'solo');
      setTrialEndsAt(userProfile.trial_ends_at);
      setCreatedAt(userProfile.created_at);
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
        timezone,
        posts_used_this_cycle,
        brand_kits (*)
      `)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (workspace) {
      setWorkspaceId(workspace.id);
      const bKits = workspace.brand_kits;
      const brandKit = bKits ? (Array.isArray(bKits) ? bKits[0] : bKits) : undefined;
      const rawBName = workspace.business_name || '';
      const bName = rawBName.toLowerCase().includes('my workspace') ? '' : rawBName;
      setBusinessName(bName);
      setBrandKitName(brandKit?.brand_kit_name || '');
      setOwnerName(workspace.owner_name || '');
      setAddress(workspace.address || '');
      setPincode(workspace.pincode || '');
      setPostsUsed(workspace.posts_used_this_cycle || 0);
      setTimezone(workspace.timezone || 'Asia/Kolkata');
      setTiming(workspace.business_timing || '');
      setLogo(brandKit?.logo_url || null);
      setInstagram(brandKit?.instagram_handle || '');
      setFacebook(brandKit?.facebook_handle || '');
      setBrandTone(brandKit?.tone || 'Professional');
      setBrandDescription(brandKit?.brand_description || '');
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
        brandTone: brandKit?.tone || 'Professional',
        brandDescription: brandKit?.brand_description || '',
        timezone: workspace.timezone || 'Asia/Kolkata',
        timing: workspace.business_timing || '',
      }));
    }
  };

  useEffect(() => {
    const savedData = localStorage.getItem('brandpost_user_data');
    if (savedData) {
      try {
        const d = JSON.parse(savedData);
        if (d.fullName) setFullName(d.fullName);
        if (d.ownerName) setOwnerName(d.ownerName);
        if (d.businessName) setBusinessName(d.businessName);
        if (d.brandKitName) setBrandKitName(d.brandKitName);
        if (d.address) setAddress(d.address);
        if (d.pincode) setPincode(d.pincode);
        if (d.instagram) setInstagram(d.instagram);
        if (d.facebook) setFacebook(d.facebook);
        if (d.brandTone) setBrandTone(d.brandTone);
        if (d.brandDescription) setBrandDescription(d.brandDescription);
        if (d.planId) setPlanId(d.planId);
        if (d.trialEndsAt) setTrialEndsAt(d.trialEndsAt);
        if (d.createdAt) setCreatedAt(d.createdAt);
        if (d.postsUsed !== undefined) setPostsUsed(d.postsUsed);
        if (d.timezone) setTimezone(d.timezone);
        if (d.timing) setTiming(d.timing);
        if (d.logo) setLogo(d.logo);
        if (d.colors) setColors(d.colors);
      } catch (e) {
        console.error('Error parsing brand data:', e);
      }
    }
    refreshBrandData();
  }, []);

  // Update localStorage when state changes
  useEffect(() => {
    localStorage.setItem('brandpost_user_data', JSON.stringify({
      fullName,
      ownerName,
      businessName,
      brandKitName,
      address,
      pincode,
      instagram,
      facebook,
      brandTone,
      brandDescription,
      planId,
      trialEndsAt,
      createdAt,
      postsUsed,
      timezone,
      logo,
      colors,
      timing
    }));
  }, [fullName, ownerName, businessName, brandKitName, address, pincode, instagram, facebook, brandTone, brandDescription, planId, trialEndsAt, createdAt, postsUsed, timezone, logo, colors, timing]);

  const value = React.useMemo(() => ({
    fullName,
    ownerName,
    businessName,
    brandKitName,
    address,
    pincode,
    instagram,
    facebook,
    brandTone,
    brandDescription,
    logo,
    colors,
    planId,
    trialEndsAt,
    createdAt,
    postsUsed,
    workspaceId,
    timezone,
    timing,
    setBusinessName,
    setLogo,
    setColors,
    refreshBrandData
  }), [fullName, ownerName, businessName, brandKitName, address, pincode, instagram, facebook, brandTone, brandDescription, logo, colors, planId, trialEndsAt, createdAt, postsUsed, workspaceId, timezone, timing]);

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
