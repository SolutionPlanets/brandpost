'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface BrandKit {
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
  address: string;
  pincode: string;
  instagram: string;
  facebook: string;
  brandTone: string;
  brandDescription: string;
  industry: string;
  brandAudience: string;
  websiteUrl: string;
  phrasesToInclude: string;
  phrasesToAvoid: string;
  logo: string | null;
  logoDark: string | null;
  profilePhoto: string | null;
  authProvider: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  planId: string;
  plans: any[];
  trialEndsAt: string | null;
  createdAt: string | null;
  postsUsed: number;
  workspaceId: string | null;
  timezone: string;
  timing: string;
  isLoading: boolean;
  hasBrandKit: boolean | null;
  isLimitReached: boolean;
  currentLimit: number;
  brandKitLimit: number;
  setBusinessName: (name: string) => void;
  setLogo: (logo: string | null) => void;
  setLogoDark: (logo: string | null) => void;
  setProfilePhoto: (photo: string | null) => void;
  setColors: (colors: { primary: string; secondary: string; accent: string }) => void;
  refreshBrandData: (silent?: boolean) => Promise<void>;
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

export const DEFAULT_PLANS = [
  {
    id: 'solo',
    name: 'Solo Starter',
    target: 'Solo entrepreneur',
    usd_monthly: 29,
    usd_yearly: 276,
    inr_monthly: 2415,
    inr_yearly: 22984,
    post_limit: 30,
    brand_kit_limit: 1,
    team_members_limit: '1',
    festive_events: '12 (major only)',
    scheduling_queue: 'Yes',
    post_templates_limit: '5',
    white_label_reports: 'No',
    features: [
      '1 Brand kit',
      '30 AI posts / month',
      '1 Team member',
      '12 Festive calendar events (major only)',
      'Scheduling queue',
      '5 Post templates',
      'Standard reports'
    ],
    gst: 18
  },
  {
    id: 'smb',
    name: 'SMB Growth',
    target: 'Small business',
    usd_monthly: 59,
    usd_yearly: 564,
    inr_monthly: 4912,
    inr_yearly: 46963,
    post_limit: 100,
    brand_kit_limit: 3,
    team_members_limit: '3',
    festive_events: 'All 30+',
    scheduling_queue: 'Yes',
    post_templates_limit: '20',
    white_label_reports: 'No',
    features: [
      '3 Brand kits',
      '100 AI posts / month',
      '3 Team members',
      'All 30+ Festive calendar events',
      'Scheduling queue',
      '20 Post templates',
      'Standard reports'
    ],
    is_featured: true,
    gst: 18
  },
  {
    id: 'agency',
    name: 'Agency Pro',
    target: 'Marketing agencies',
    usd_monthly: 149,
    usd_yearly: 1428,
    inr_monthly: 12404,
    inr_yearly: 118900,
    post_limit: 2147483647,
    brand_kit_limit: 15,
    team_members_limit: '10',
    festive_events: 'All 30+',
    scheduling_queue: 'Yes + bulk',
    post_templates_limit: 'Unlimited',
    white_label_reports: 'Yes',
    features: [
      '15 Brand kits',
      'Unlimited AI posts',
      '10 Team members',
      'All 30+ Festive calendar events',
      'Scheduling queue + bulk',
      'Unlimited Post templates',
      'White-label reports'
    ],
    gst: 18
  },
  {
    id: 'franchise',
    name: 'Franchise',
    target: 'Franchise brands',
    usd_monthly: 399,
    usd_yearly: 3828,
    inr_monthly: 33218,
    inr_yearly: 318790,
    post_limit: 2147483647,
    brand_kit_limit: 1000,
    team_members_limit: 'Unlimited',
    festive_events: 'All 30+',
    scheduling_queue: 'Yes + bulk',
    post_templates_limit: 'Unlimited',
    white_label_reports: 'Yes',
    features: [
      'Unlimited Brand kits',
      'Unlimited AI posts',
      'Unlimited Team members',
      'All 30+ Festive calendar events',
      'Scheduling queue + bulk',
      'Unlimited Post templates',
      'White-label reports'
    ],
    gst: 18
  },
  {
    id: 'trial',
    name: 'Trial',
    target: 'Trial period configuration',
    usd_monthly: 0,
    usd_yearly: 0,
    inr_monthly: 0,
    inr_yearly: 0,
    post_limit: 100,
    brand_kit_limit: 3,
    team_members_limit: '3',
    festive_events: 'All 30+',
    scheduling_queue: 'Yes',
    post_templates_limit: '20',
    white_label_reports: 'No',
    features: [],
    gst: 0
  }
];

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [fullName, setFullName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [brandKitName, setBrandKitName] = useState('');
  const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoDark, setLogoDark] = useState<string | null>(null);
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
  const [industry, setIndustry] = useState('');
  const [brandAudience, setBrandAudience] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [phrasesToInclude, setPhrasesToInclude] = useState('');
  const [phrasesToAvoid, setPhrasesToAvoid] = useState('');
  const [planId, setPlanId] = useState('solo');
  const [plans, setPlans] = useState<any[]>(DEFAULT_PLANS);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [postsUsed, setPostsUsed] = useState(0);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [timing, setTiming] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasBrandKit, setHasBrandKit] = useState<boolean | null>(null);

  const supabase = createClient();

  const refreshBrandData = async (silent = false) => {
    if (!silent) setIsLoading(true);

    // Fetch active plans dynamically from database
    try {
      const { data: plansData } = await supabase
        .from('plan')
        .select('*')
        .eq('is_active', true);
      if (plansData && plansData.length > 0) {
        setPlans(plansData);
      }
    } catch (e) {
      console.error('Error fetching plans from DB:', e);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Fetch user's full_name, profile_photo, and auth_provider from the users table
    const { data: userProfile } = await supabase
      .from('users')
      .select('full_name, profile_photo, auth_provider, plan_id, trial_ends_at, created_at')
      .eq('id', user.id)
      .maybeSingle();

    if (userProfile) {
      if (userProfile.full_name) setFullName(userProfile.full_name);
      setPlanId(userProfile.plan_id || 'solo');
      setTrialEndsAt(userProfile.trial_ends_at);
      setCreatedAt(userProfile.created_at);
      
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
        business_timing,
        posts_used_this_cycle,
        brand_kits (*)
      `)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (workspace) {
      setWorkspaceId(workspace.id);
      const bKits = workspace.brand_kits;
      const brandKitsArray = bKits ? (Array.isArray(bKits) ? bKits : [bKits]) : [];
      setBrandKits(brandKitsArray as BrandKit[]);
      const brandKit = brandKitsArray[0] || undefined;
      setHasBrandKit(!!brandKit);
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
      setLogoDark(brandKit?.logo_dark_url || null);
      setInstagram(brandKit?.instagram_handle || '');
      setFacebook(brandKit?.facebook_handle || '');
      setBrandTone(brandKit?.tone || 'Professional');
      setBrandDescription(brandKit?.brand_description || '');
      setIndustry(brandKit?.industry || '');
      setBrandAudience(brandKit?.brand_audience || '');
      setWebsiteUrl(brandKit?.website_url || '');
      setPhrasesToInclude(brandKit?.phrases_to_include || '');
      setPhrasesToAvoid(brandKit?.phrases_to_avoid || '');
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
        logoDark: brandKit?.logo_dark_url || null,
        profilePhoto: userProfile?.profile_photo || null,
        instagram: brandKit?.instagram_handle || '',
        facebook: brandKit?.facebook_handle || '',
        brandTone: brandKit?.tone || 'Professional',
        brandDescription: brandKit?.brand_description || '',
        industry: brandKit?.industry || '',
        brandAudience: brandKit?.brand_audience || '',
        websiteUrl: brandKit?.website_url || '',
        phrasesToInclude: brandKit?.phrases_to_include || '',
        phrasesToAvoid: brandKit?.phrases_to_avoid || '',
        timezone: workspace.timezone || 'Asia/Kolkata',
        timing: workspace.business_timing || '',
      }));
    } else {
      setHasBrandKit(false);
    }
    
    setIsLoading(false);
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
        if (d.industry) setIndustry(d.industry);
        if (d.brandAudience) setBrandAudience(d.brandAudience);
        if (d.websiteUrl) setWebsiteUrl(d.websiteUrl);
        if (d.phrasesToInclude) setPhrasesToInclude(d.phrasesToInclude);
        if (d.phrasesToAvoid) setPhrasesToAvoid(d.phrasesToAvoid);
        if (d.planId) setPlanId(d.planId);
        if (d.plans) setPlans(d.plans);
        if (d.trialEndsAt) setTrialEndsAt(d.trialEndsAt);
        if (d.createdAt) setCreatedAt(d.createdAt);
        if (d.postsUsed !== undefined) setPostsUsed(d.postsUsed);
        if (d.timezone) setTimezone(d.timezone);
        if (d.timing) setTiming(d.timing);
        if (d.logo) setLogo(d.logo);
        if (d.logoDark) setLogoDark(d.logoDark);
        if (d.profilePhoto) setProfilePhoto(d.profilePhoto);
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
      industry,
      brandAudience,
      websiteUrl,
      phrasesToInclude,
      phrasesToAvoid,
      planId,
      plans,
      trialEndsAt,
      createdAt,
      postsUsed,
      timezone,
      logo,
      logoDark,
      profilePhoto,
      authProvider,
      colors,
      timing
    }));
  }, [fullName, ownerName, businessName, brandKitName, address, pincode, instagram, facebook, brandTone, brandDescription, industry, brandAudience, websiteUrl, phrasesToInclude, phrasesToAvoid, planId, plans, trialEndsAt, createdAt, postsUsed, timezone, logo, logoDark, profilePhoto, authProvider, colors, timing]);

  // Automatic redirect if trial is expired and user is on a dashboard route
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
      const isExpired = trialEndsAt !== null && new Date(trialEndsAt) <= new Date();
      if (isExpired) {
        alert("Your 14-day free trial has expired. Please buy a plan to continue using Brandpost!");
        window.location.href = '/pricing?from=trial_expired';
      }
    }
  }, [trialEndsAt]);

  const activePlan = plans.find(p => p.id === planId) || DEFAULT_PLANS.find(p => p.id === planId) || DEFAULT_PLANS[0];
  const trialPlan = plans.find(p => p.id === 'trial') || DEFAULT_PLANS.find(p => p.id === 'trial') || DEFAULT_PLANS[4];

  const isTrial = planId === 'solo' && trialEndsAt !== null && new Date(trialEndsAt) > new Date();
  const isTrialExpired = trialEndsAt !== null && new Date(trialEndsAt) <= new Date();
  const currentLimit = isTrialExpired ? 0 : (isTrial ? trialPlan.post_limit : activePlan.post_limit);
  const brandKitLimit = isTrialExpired ? 0 : (isTrial ? trialPlan.brand_kit_limit : activePlan.brand_kit_limit);
  const isLimitReached = postsUsed >= currentLimit;

  const checkLimitAndRedirect = () => {
    if (isTrialExpired) {
      alert("Your 14-day free trial has expired. Please buy a plan to continue using Brandpost!");
      window.location.href = '/pricing?from=trial_expired';
      return true;
    }
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
    industry,
    brandAudience,
    websiteUrl,
    phrasesToInclude,
    phrasesToAvoid,
    logo,
    logoDark,
    profilePhoto,
    authProvider,
    colors,
    planId,
    plans,
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
    setLogoDark,
    setProfilePhoto,
    setColors,
    refreshBrandData,
    checkLimitAndRedirect,
    isLoading,
    hasBrandKit
  }), [fullName, ownerName, businessName, brandKitName, brandKits, address, pincode, instagram, facebook, brandTone, brandDescription, industry, brandAudience, websiteUrl, phrasesToInclude, phrasesToAvoid, logo, logoDark, profilePhoto, authProvider, colors, planId, plans, trialEndsAt, createdAt, postsUsed, workspaceId, timezone, timing, isLoading, hasBrandKit, isLimitReached, currentLimit, brandKitLimit]);

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

