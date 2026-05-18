'use client';

import * as Sentry from "@sentry/nextjs";

if (typeof window !== "undefined") {
  console.log("Explicit Sentry initialization on client side with:", process.env.NEXT_PUBLIC_SENTRY_DSN);
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://ea83f38ceb195bc8d536f10586f52b8d@o4511410644451328.ingest.de.sentry.io/4511410650677328",
    tracesSampleRate: 1.0,
    debug: true,
  });
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface BrandKit {
  id: string;
  workspace_id: string;
  brand_kit_name: string;
  logo_url: string | null;
  logo_dark_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  heading_font: string;
  body_font: string;
  brand_description: string;
  tone: string;
  instagram_handle: string;
  facebook_handle: string;
  created_at: string;
}

interface BrandContextType {
  fullName: string;
  ownerName: string;
  businessName: string;
  brandKitName: string;
  brandKits: BrandKit[];
  logo: string | null;
  profilePhoto: string | null;
  authProvider: string;
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
  isLimitReached: boolean;
  currentLimit: number;
  brandKitLimit: number;
  setBusinessName: (name: string) => void;
  setLogo: (logo: string | null) => void;
  setProfilePhoto: (photo: string | null) => void;
  setColors: (colors: { primary: string; secondary: string; accent: string }) => void;
  refreshBrandData: () => Promise<void>;
  checkLimitAndRedirect: () => boolean;
}

const PLAN_LIMITS: Record<string, number> = {
  'solo': 30,
  'smb': 100,
  'agency': 10000,
  'franchise': 10000,
  'trial': 100
};

const BRAND_KIT_LIMITS: Record<string, number> = {
  'solo': 1,
  'smb': 3,
  'agency': 15,
  'franchise': 1000,
  'trial': 3
};

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [fullName, setFullName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [brandKitName, setBrandKitName] = useState('');
  const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<string>('email');
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

    // Fetch user profile info
    const { data: userProfile } = await supabase
      .from('users')
      .select('full_name, plan_id, trial_ends_at, created_at, profile_photo, auth_provider')
      .eq('id', user.id)
      .maybeSingle();
 
    if (userProfile) {
      if (userProfile.full_name) setFullName(userProfile.full_name);
      setPlanId(userProfile.plan_id || 'solo');
      setTrialEndsAt(userProfile.trial_ends_at);
      setCreatedAt(userProfile.created_at);
      
      const storedProvider = userProfile.auth_provider || 'email';
      setAuthProvider(storedProvider);

      // Priority: 1) Photo from DB 2) OAuth metadata
      if (userProfile.profile_photo) {
        setProfilePhoto(userProfile.profile_photo);
      } else if (storedProvider === 'google' || storedProvider === 'facebook') {
        setProfilePhoto(user.user_metadata?.avatar_url || user.user_metadata?.picture || null);
      } else {
        setProfilePhoto(null);
      }
    }

    // Fetch workspace and brand kits
    const { data: workspace } = await supabase
      .from('workspaces')
      .select(`
        id,
        business_name,
        owner_name,
        address,
        pincode,
        timezone,
        business_timing,
        posts_used_this_cycle,
        brand_kits (*),
        social_connections (*)
      `)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (workspace) {
      setWorkspaceId(workspace.id);
      const bKits = (workspace.brand_kits || []) as BrandKit[];
      // Sort by creation date to keep slots consistent
      bKits.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setBrandKits(bKits);
      
      const brandKit = bKits.length > 0 ? bKits[0] : undefined;
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

      const socialConns = workspace.social_connections || [];
      const instaConn = Array.isArray(socialConns) ? socialConns.find((c: any) => c.platform === 'instagram') : null;
      const fbConn = Array.isArray(socialConns) ? socialConns.find((c: any) => c.platform === 'facebook') : null;

      setInstagram(instaConn?.page_name || brandKit?.instagram_handle || '');
      setFacebook(fbConn?.page_name || brandKit?.facebook_handle || '');
      setBrandTone(brandKit?.tone || 'Professional');
      setBrandDescription(brandKit?.brand_description || '');
      if (brandKit?.primary_color) {
        setColors({
          primary: brandKit.primary_color,
          secondary: brandKit.secondary_color || '#64748b',
          accent: brandKit.accent_color || '#06b6d4'
        });
      }
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
        if (d.profilePhoto) setProfilePhoto(d.profilePhoto);
        if (d.authProvider) setAuthProvider(d.authProvider);
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
      timing,
      profilePhoto,
      authProvider
    }));
  }, [fullName, ownerName, businessName, brandKitName, address, pincode, instagram, facebook, brandTone, brandDescription, planId, trialEndsAt, createdAt, postsUsed, timezone, logo, colors, timing, profilePhoto, authProvider]);

  const isTrial = planId === 'solo' && trialEndsAt && new Date(trialEndsAt) > new Date();
  const currentLimit = isTrial ? PLAN_LIMITS['trial'] : (PLAN_LIMITS[planId] || 30);
  const brandKitLimit = isTrial ? BRAND_KIT_LIMITS['trial'] : (BRAND_KIT_LIMITS[planId] || 1);
  const isLimitReached = postsUsed >= currentLimit;

  const checkLimitAndRedirect = () => {
    if (isLimitReached) {
      alert(`Your AI generation limit (${currentLimit} posts) has been reached. Please upgrade your plan to continue creating amazing content!`);
      window.location.href = '/pricing?from=limit_reached';
      return true;
    }
    return false;
  };

  const value = React.useMemo(() => ({
    fullName,
    ownerName,
    businessName,
    brandKitName,
    brandKits,
    address,
    pincode,
    instagram,
    facebook,
    brandTone,
    brandDescription,
    logo,
    profilePhoto,
    authProvider,
    colors,
    planId,
    trialEndsAt,
    createdAt,
    postsUsed,
    workspaceId,
    timezone,
    timing,
    isLimitReached,
    currentLimit,
    brandKitLimit,
    setBusinessName,
    setLogo,
    setProfilePhoto,
    setColors,
    refreshBrandData,
    checkLimitAndRedirect
  }), [fullName, ownerName, businessName, brandKitName, brandKits, address, pincode, instagram, facebook, brandTone, brandDescription, logo, colors, planId, trialEndsAt, createdAt, postsUsed, workspaceId, timezone, timing, profilePhoto, authProvider, isLimitReached, currentLimit, brandKitLimit]);

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
