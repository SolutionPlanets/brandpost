'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Building2,
  Upload,
  Palette,
  MessageSquare,
  Share2,
  FacebookIcon,
  InstagramIcon,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Instagram,
  Facebook,
  Loader2,
  Sparkles
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useBrand } from '@/contexts/BrandContext';
import styles from './OnboardingWizard.module.css';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePalette } from 'color-thief-react';
import Select from 'react-select';

const fontOptions = [
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Raleway', label: 'Raleway' },
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'Lora', label: 'Lora' }
];

const customSelectStyles = {
  option: (provided: any, state: any) => ({
    ...provided,
    fontFamily: state.data.value,
  }),
  singleValue: (provided: any, state: any) => ({
    ...provided,
    fontFamily: state.data.value,
  })
};

const steps = [
  { title: 'Business Info', icon: Building2 },
  { title: 'Logo', icon: Upload },
  { title: 'Colors', icon: Palette },
  { title: 'Brand Voice', icon: MessageSquare },
  { title: 'Connect', icon: Share2 },
];

const HOURS = [
  '12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
  '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'
];
interface OnboardingWizardProps {
  brandKitId?: string;
  onComplete?: () => void;
}

export default function OnboardingWizard({ brandKitId, onComplete }: OnboardingWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { refreshBrandData } = useBrand();

  const [currentStep, setCurrentStep] = useState(() => {
    const stepParam = searchParams.get('step');
    return stepParam ? parseInt(stepParam, 10) : 1;
  });

  const [isOpenOpen, setIsOpenOpen] = useState(false);
  const [isOpenClose, setIsOpenClose] = useState(false);
  const dropdownOpenRef = useRef<HTMLDivElement>(null);
  const dropdownCloseRef = useRef<HTMLDivElement>(null);

  const [socialConnections, setSocialConnections] = useState({ facebook: false, instagram: false });
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const darkFileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    ownerName: '',
    businessName: '',
    address: '',
    pincode: '',
    timing: '9 AM - 6 PM',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    logo: null as string | null,
    logoUrl: null as string | null,
    logoFile: null as File | null,
    logoDark: null as string | null,
    logoDarkUrl: null as string | null,
    logoDarkFile: null as File | null,
    colors: { primary: '#4f46e5', secondary: '#64748b', accent: '#fbbf24' },
    tone: 'professional',
    description: '',
    brandKitName: '',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    industry: '',
    brandAudience: '',
    websiteUrl: '',
    phrasesToInclude: '',
    phrasesToAvoid: '',
    selectedPost: 1,
    selectedPlatforms: [] as string[],
    platforms: [],
    instagram: '',
    facebook: '',
    productImages: [] as { id?: string; imageUrl: string; productName: string; file?: File; displayOrder: number }[]
  });

  useEffect(() => {
    async function fetchExistingData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsRefreshing(false);
        return;
      }

      // 1. Fetch from DB
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('*, brand_kits(*), social_connections(*)')
        .eq('owner_id', user.id)
        .maybeSingle();

      let dbData: any = {};
      if (workspace) {
        if (workspace.social_connections && workspace.social_connections.length > 0) {
          setSocialConnections({
            facebook: workspace.social_connections.some((c: any) => c.platform === 'facebook'),
            instagram: workspace.social_connections.some((c: any) => c.platform === 'instagram'),
          });
        }
        // Determine if we are creating a new kit (supplementary) or doing initial onboarding
        const isInitialOnboarding = (workspace.brand_kits || []).length === 0;
        const isAddingNewKit = !brandKitId && !isInitialOnboarding;
        // Find the specific brand kit
        const brandKit = brandKitId 
          ? workspace.brand_kits?.find((k: any) => k.id === brandKitId)
          : null; // Don't fallback to first kit if adding new

        const socialConns = workspace.social_connections || [];
        const instaConn = Array.isArray(socialConns) ? socialConns.find((c: any) => c.platform === 'instagram') : null;
        const fbConn = Array.isArray(socialConns) ? socialConns.find((c: any) => c.platform === 'facebook') : null;
        
        if (isAddingNewKit) {
          // If adding a NEW kit, start with BLANK brand kit data, but keep workspace data if helpful
          dbData = {
            ownerName: workspace.owner_name || '',
            businessName: (workspace.business_name || '').toLowerCase().includes('my workspace') ? '' : (workspace.business_name || ''),
            address: workspace.address || '',
            pincode: workspace.pincode || '',
            timing: workspace.business_timing || '',
            timezone: workspace.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            logo: null,
            logoUrl: null,
            logoDark: null,
            logoDarkUrl: null,
            colors: { primary: '#4f46e5', secondary: '#64748b', accent: '#fbbf24' },
            tone: 'professional',
            description: '',
            brandKitName: '',
            headingFont: 'Inter',
            bodyFont: 'Inter',
            instagram: '',
            facebook: '',
            industry: '',
            brandAudience: '',
            websiteUrl: '',
            phrasesToInclude: '',
            phrasesToAvoid: '',
            productImages: [],
          };
        } else {
          // Editing existing or initial onboarding
          dbData = {
            ownerName: workspace.owner_name || '',
            businessName: (workspace.business_name || '').toLowerCase().includes('my workspace') ? '' : (workspace.business_name || ''),
            brandKitName: brandKit?.brand_kit_name || '',
            address: workspace.address || '',
            pincode: workspace.pincode || '',
            timing: workspace.business_timing || '',
            timezone: workspace.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            logo: brandKit?.logo_url || null,
            logoUrl: brandKit?.logo_url || null,
            logoDark: brandKit?.logo_dark_url || null,
            logoDarkUrl: brandKit?.logo_dark_url || null,
            colors: brandKit ? {
              primary: brandKit.primary_color || '#4f46e5',
              secondary: brandKit.secondary_color || '#64748b',
              accent: brandKit.accent_color || '#fbbf24',
            } : { primary: '#4f46e5', secondary: '#64748b', accent: '#fbbf24' },
            tone: brandKit?.tone ? brandKit.tone.toLowerCase() : 'professional',
            description: brandKit?.brand_description || '',
            headingFont: brandKit?.heading_font || 'Inter',
            bodyFont: brandKit?.body_font || 'Inter',
            instagram: brandKit?.instagram_handle || '',
            facebook: brandKit?.facebook_handle || '',
            industry: brandKit?.industry || '',
            brandAudience: brandKit?.brand_audience || '',
            websiteUrl: brandKit?.website_url || '',
            phrasesToInclude: brandKit?.phrases_to_include || '',
            phrasesToAvoid: brandKit?.phrases_to_avoid || '',
            productImages: (brandKit?.brand_kit_products || []).map((p: any) => ({
              id: p.id,
              imageUrl: p.image_url,
              productName: p.product_name || '',
              displayOrder: p.display_order || 0
            })).sort((a: any, b: any) => a.displayOrder - b.displayOrder),
          };
        }

        const bNameToCheck = workspace.business_name || workspace.name || '';
        if (bNameToCheck && !bNameToCheck.toLowerCase().includes('my workspace') && !isAddingNewKit) {
          setIsEditMode(true);
        }
      } else {
        const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (detectedTz) {
          dbData.timezone = detectedTz;
        }
      }

      // 2. Load from localStorage (ONLY for initial onboarding draft)
      const isInitialOnboarding = !brandKitId && (!workspace || (workspace.brand_kits || []).length === 0);
      if (isInitialOnboarding) {
        const savedState = localStorage.getItem('onboarding_formData');
        if (savedState) {
          try {
            const parsed = JSON.parse(savedState);
            setFormData(prev => ({ ...prev, ...dbData, ...parsed }));
            
            const savedStep = localStorage.getItem('onboarding_currentStep');
            if (savedStep && !searchParams.get('step')) {
              setCurrentStep(parseInt(savedStep, 10));
            }
          } catch (e) {
            console.error('Error parsing onboarding state:', e);
            setFormData(prev => ({ ...prev, ...dbData }));
          }
        } else {
          setFormData(prev => ({ ...prev, ...dbData }));
        }
      } else {
        setFormData(prev => ({ ...prev, ...dbData }));
      }

      setIsRefreshing(false);
    }
    fetchExistingData();
  }, [brandKitId, refreshBrandData]);

  // Save to localStorage whenever formData or currentStep changes
  useEffect(() => {
    if (isRefreshing) return;
    
    // Only save to localStorage during initial onboarding (when there are no brand kit IDs yet)
    if (brandKitId) return;

    const stateToSave = { ...formData };
    // Don't save File objects or large base64 strings in localStorage
    delete (stateToSave as any).logoFile;
    delete (stateToSave as any).logoDarkFile;
    delete (stateToSave as any).logo;
    delete (stateToSave as any).logoDark;
    
    try {
      localStorage.setItem('onboarding_formData', JSON.stringify(stateToSave));
      localStorage.setItem('onboarding_currentStep', currentStep.toString());
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [formData, currentStep, isRefreshing, brandKitId]);

  const { data: palette } = usePalette(formData.logo || '', 5, 'hex', {
    quality: 10,
  });

  const handleAutoDetect = () => {
    if (palette && palette.length >= 2) {
      setFormData({
        ...formData,
        colors: {
          primary: palette[0],
          secondary: palette[1],
          accent: palette.length >= 3 ? palette[2] : formData.colors.accent
        }
      });
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownOpenRef.current && !dropdownOpenRef.current.contains(event.target as Node)) {
        setIsOpenOpen(false);
      }
      if (dropdownCloseRef.current && !dropdownCloseRef.current.contains(event.target as Node)) {
        setIsOpenClose(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveWorkspace = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check existing workspace and kits
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, business_name, brand_kits(id)')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!workspace) return;

    const bKits = workspace.brand_kits || [];
    const isInitialOnboarding = bKits.length === 0;
    
    // We ONLY update global workspace info during initial setup 
    // or when explicitly editing the VERY FIRST brand kit.
    // Supplementary kits (Kit 2, 3) should NOT touch global workspace settings.
    const isFirstKit = bKits.length > 0 && brandKitId === bKits[0].id;

    if (!isInitialOnboarding && !isFirstKit && !(!brandKitId && isInitialOnboarding)) {
      // If we are adding Kit 2/3 or editing Kit 2/3, we skip workspace global updates
      return;
    }

    const updatePayload: any = {
      owner_name: formData.ownerName,
      address: formData.address,
      pincode: formData.pincode,
      business_timing: formData.timing,
      timezone: formData.timezone
    };

    if (isInitialOnboarding || isFirstKit) {
      updatePayload.business_name = formData.businessName;
    }

    const { error } = await supabase
      .from('workspaces')
      .update(updatePayload)
      .eq('id', workspace.id);

    if (error) {
      console.error('Workspace update error:', JSON.stringify(error, null, 2));
    }
  };

  const saveBrandKit = async (logoUrlOverride?: string, logoDarkUrlOverride?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (wsError || !workspace) return;

      if (!workspace) {
        console.warn('saveBrandKit: No workspace found for user', user.id);
        return;
      }

      console.log('saveBrandKit: Saving for workspace', workspace.id);

      // Determine the target brand kit ID
      let targetId = brandKitId;
      if (!targetId) {
        // If brandKitId prop is not provided, fetch existing brand kits for the workspace to see if we already have some.
        const { data: existingKits } = await supabase
          .from('brand_kits')
          .select('id')
          .eq('workspace_id', workspace.id);

        const kits = existingKits || [];
        const isInitialOnboarding = kits.length === 0;

        if (isInitialOnboarding) {
          // No kits exist at all, so we let it insert or fetch any temporarily created row
          targetId = kits[0]?.id;
        }
      }

      const payload: Record<string, any> = {
        workspace_id: workspace.id,
        brand_kit_name: formData.brandKitName || formData.businessName || 'My Brand Kit',
        logo_url: logoUrlOverride || formData.logoUrl || null,
        logo_dark_url: logoDarkUrlOverride || formData.logoDarkUrl || null,
        primary_color: formData.colors.primary,
        secondary_color: formData.colors.secondary,
        accent_color: formData.colors.accent,
        heading_font: formData.headingFont,
        body_font: formData.bodyFont,
        brand_description: formData.description,
        tone: formData.tone,
        instagram_handle: formData.instagram,
        facebook_handle: formData.facebook,
        industry: formData.industry,
        brand_audience: formData.brandAudience,
        website_url: formData.websiteUrl,
        phrases_to_include: formData.phrasesToInclude,
        phrases_to_avoid: formData.phrasesToAvoid,
      };

      if (targetId) {
        payload.id = targetId;
      }

      const { data: upsertedKit, error: upsertError } = await supabase.from('brand_kits').upsert(payload).select().single();
      
      if (upsertError) {
        console.error('Error upserting brand kit:', upsertError);
        return;
      }

      const finalBrandKitId = upsertedKit?.id || targetId;

      // Sync products
      if (finalBrandKitId && formData.productImages) {
        // 1. Fetch existing products for this kit to know what to delete
        const { data: existingProducts } = await supabase
          .from('brand_kit_products')
          .select('id')
          .eq('brand_kit_id', finalBrandKitId);
        
        const existingIds = (existingProducts || []).map(p => p.id);
        const currentIds = formData.productImages.filter(p => p.id).map(p => p.id);
        const idsToDelete = existingIds.filter(id => !currentIds.includes(id));

        // 2. Delete removed products
        if (idsToDelete.length > 0) {
          await supabase.from('brand_kit_products').delete().in('id', idsToDelete);
        }

        // 3. Upsert current products
        if (formData.productImages.length > 0) {
          const productsPayload = formData.productImages.map((p, index) => ({
            ...(p.id ? { id: p.id } : {}),
            brand_kit_id: finalBrandKitId,
            product_name: p.productName || null,
            image_url: p.imageUrl,
            display_order: index
          }));
          await supabase.from('brand_kit_products').upsert(productsPayload);
        }
      }
      
    } catch (err) {
      console.error('Fatal error in saveBrandKit:', err);
    }
  };

  const submitAllData = async () => {
    setLoading(true);
    try {
      await saveWorkspace();

      let finalLogoUrl = formData.logoUrl;
      let finalLogoDarkUrl = formData.logoDarkUrl;

      const base64ToFile = (base64String: string, fileName: string) => {
        const arr = base64String.split(',');
        const mime = arr[0].match(/:(.*?);/)![1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], fileName, { type: mime });
      };

      // Upload Primary Logo
      let logoFileToUpload = formData.logoFile;
      if (!logoFileToUpload && formData.logo && formData.logo.startsWith('data:image')) {
        logoFileToUpload = base64ToFile(formData.logo, 'logo.png');
      }

      if (logoFileToUpload && !finalLogoUrl) {
        setUploading(true);
        const fileExt = logoFileToUpload.name.split('.').pop() || 'png';
        const fileName = `${Date.now()}_primary_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('BrandpostAI_logos')
          .upload(fileName, logoFileToUpload);

        if (!uploadError) {
          const { data } = supabase.storage.from('BrandpostAI_logos').getPublicUrl(fileName);
          finalLogoUrl = data.publicUrl;
        }
      }

      // Upload Transparent Logo
      let logoDarkFileToUpload = formData.logoDarkFile;
      if (!logoDarkFileToUpload && formData.logoDark && formData.logoDark.startsWith('data:image')) {
        logoDarkFileToUpload = base64ToFile(formData.logoDark, 'logo_dark.png');
      }

      if (logoDarkFileToUpload && !finalLogoDarkUrl) {
        setUploading(true);
        const fileExt = logoDarkFileToUpload.name.split('.').pop() || 'png';
        const fileName = `${Date.now()}_dark_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('BrandpostAI_logos')
          .upload(fileName, logoDarkFileToUpload);

        if (!uploadError) {
          const { data } = supabase.storage.from('BrandpostAI_logos').getPublicUrl(fileName);
          finalLogoDarkUrl = data.publicUrl;
        }
      }

      setUploading(false);
      await (saveBrandKit as any)(finalLogoUrl || undefined, finalLogoDarkUrl || undefined);
      
      await refreshBrandData();
      
      await refreshBrandData();
      
      // Success! Clear state
      localStorage.removeItem('onboarding_formData');
      localStorage.removeItem('onboarding_currentStep');
      
      if (isEditMode || brandKitId) {
        alert('Changes saved successfully');
      }
      
      if (onComplete) {
        onComplete();
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Final submit error:', err);
      setLoading(false);
    }
  };

  const connectFacebook = async () => {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/onboarding?step=5&provider=facebook')}`,
        scopes: 'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish',
        queryParams: {
          config_id: '1280830517526784'
        }
      },
    });
    if (error) {
      console.error('Facebook connect error:', error.message);
      alert(`Connection failed: ${error.message}`);
    }
  };

  const nextStep = async () => {
    if (currentStep === 1) {
      const newErrors: Record<string, string> = {};
      if (!formData.businessName.trim()) newErrors.businessName = 'Business Name is required';
      if (!formData.ownerName.trim()) newErrors.ownerName = 'Owner Name is required';

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }

    if (currentStep === 2) {
      if (!formData.logoUrl && !formData.logo && !formData.logoFile) {
        setErrors({ logo: 'Please upload a logo to continue' });
        return;
      }
    }

    if (currentStep === 4) {
      if (!formData.brandKitName.trim()) {
        setErrors({ brandKitName: 'Brand Kit Name is required' });
        return;
      }
      if (formData.websiteUrl && !/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(formData.websiteUrl.trim())) {
        setErrors({ websiteUrl: 'Please enter a valid URL' });
        return;
      }
    }

    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    } else {
      await submitAllData();
    }
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const skipSocials = async () => {
    await submitAllData();
  };

  const handleFile = (file: File) => {
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/svg+xml')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({ ...prev, logo: e.target?.result as string, logoFile: file }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDarkFile = (file: File) => {
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/svg+xml')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({ ...prev, logoDark: e.target?.result as string, logoDarkFile: file }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    setUploading(true);
    const files = Array.from(e.target.files);
    
    const newProducts = [...formData.productImages];
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${Date.now()}_product_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-ingest')
        .upload(fileName, file);
        
      if (!uploadError) {
        const { data } = supabase.storage.from('product-ingest').getPublicUrl(fileName);
        newProducts.push({
          imageUrl: data.publicUrl,
          productName: '',
          displayOrder: newProducts.length
        });
      } else {
        console.error('Error uploading product image:', uploadError);
      }
    }
    
    setFormData(prev => ({ ...prev, productImages: newProducts }));
    setUploading(false);
  };

  const handleProductDelete = (index: number) => {
    const newProducts = [...formData.productImages];
    newProducts.splice(index, 1);
    setFormData(prev => ({ ...prev, productImages: newProducts }));
  };

  const handleProductNameChange = (index: number, newName: string) => {
    const newProducts = [...formData.productImages];
    newProducts[index].productName = newName;
    setFormData(prev => ({ ...prev, productImages: newProducts }));
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className={styles.stepContent}>
            <h2>Tell us about your business</h2>
            <p>We'll use this to personalize your content and profile.</p>
            <div className={styles.inputGrid}>
              <div className={styles.inputGroup}>
                <label>Business Name <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Pixel Agency"
                  value={formData.businessName || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({ ...prev, businessName: val }));
                    if (errors.businessName) setErrors(prev => ({ ...prev, businessName: '' }));
                  }}
                  style={errors.businessName ? { borderColor: 'red' } : {}}
                />
                {errors.businessName && <span style={{ color: 'red', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.businessName}</span>}
              </div>
              <div className={styles.inputGroup}>
                <label>Business Owner Name <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Chirag Mutha"
                  value={formData.ownerName || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({ ...prev, ownerName: val }));
                    if (errors.ownerName) setErrors(prev => ({ ...prev, ownerName: '' }));
                  }}
                  style={errors.ownerName ? { borderColor: 'red' } : {}}
                />
                {errors.ownerName && <span style={{ color: 'red', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.ownerName}</span>}
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label>Address</label>
              <input
                type="text"
                placeholder="Shop/Office location"
                value={formData.address || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, address: val }));
                }}
              />
            </div>
            
            <div className={styles.inputGrid}>
              <div className={styles.inputGroup}>
                <label>Industry (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Bakery, Tech, Real Estate" 
                  value={formData.industry}
                  onChange={(e) => setFormData({...formData, industry: e.target.value})}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Brand Audience (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Gen-Z, Parents, Local Residents" 
                  value={formData.brandAudience}
                  onChange={(e) => setFormData({...formData, brandAudience: e.target.value})}
                />
              </div>
            </div>

            <div className={styles.inputGrid}>
              <div className={styles.inputGroup}>
                <label>Pincode</label>
                <input
                  type="text"
                  placeholder="6-digit code"
                  value={formData.pincode || ''}
                  onChange={(e) => {
                    const rawVal = e.target.value;
                    const val = rawVal.replace(/\D/g, '').slice(0, 6);
                    if (rawVal.length > 6) {
                      setErrors(prev => ({ ...prev, pincode: 'Pincode cannot be more than 6 digits' }));
                    } else {
                      if (errors.pincode) setErrors(prev => ({ ...prev, pincode: '' }));
                    }
                    setFormData(prev => ({ ...prev, pincode: val }));
                  }}
                  style={errors.pincode ? { borderColor: 'red' } : {}}
                />
                {errors.pincode && <span style={{ color: 'red', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.pincode}</span>}
              </div>
              <div className={styles.inputGroup}>
                <label>Business Timing</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
                  <div style={{ flex: 1, position: 'relative' }} ref={dropdownOpenRef}>
                    <div
                      onClick={() => setIsOpenOpen(!isOpenOpen)}
                      style={{
                        height: '40px',
                        padding: '0 0.75rem',
                        fontSize: '1rem',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: 'white'
                      }}
                    >
                      <span>{formData.timing.split(' - ')[0] || 'Open'}</span>
                      <span style={{ fontSize: '0.8rem' }}>▼</span>
                    </div>
                    {isOpenOpen && (
                      <div style={{
                        position: 'absolute',
                        top: '44px',
                        left: 0,
                        right: 0,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        zIndex: 100,
                        boxShadow: 'var(--shadow-lg)'
                      }}>
                        {HOURS.map(h => (
                          <div
                            key={`open-${h}`}
                            onClick={() => {
                              const end = formData.timing.split(' - ')[1] || '6 PM';
                              setFormData({ ...formData, timing: `${h} - ${end}` });
                              setIsOpenOpen(false);
                            }}
                            style={{ padding: '4px 8px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#f5f5f5'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            {h}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>to</span>
                  <div style={{ flex: 1, position: 'relative' }} ref={dropdownCloseRef}>
                    <div
                      onClick={() => setIsOpenClose(!isOpenClose)}
                      style={{
                        height: '40px',
                        padding: '0 0.75rem',
                        fontSize: '1rem',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: 'white'
                      }}
                    >
                      <span>{formData.timing.split(' - ')[1] || 'Close'}</span>
                      <span style={{ fontSize: '0.8rem' }}>▼</span>
                    </div>
                    {isOpenClose && (
                      <div style={{
                        position: 'absolute',
                        top: '44px',
                        left: 0,
                        right: 0,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        zIndex: 100,
                        boxShadow: 'var(--shadow-lg)'
                      }}>
                        {HOURS.map(h => (
                          <div
                            key={`close-${h}`}
                            onClick={() => {
                              const start = formData.timing.split(' - ')[0] || '9 AM';
                              setFormData({ ...formData, timing: `${start} - ${h}` });
                              setIsOpenClose(false);
                            }}
                            style={{ padding: '4px 8px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#f5f5f5'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            {h}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Timezone Dropdown */}
            <div className={styles.inputGroup}>
              <label>Timezone</label>
              <select
                value={formData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'}
                onChange={(e) => setFormData({...formData, timezone: e.target.value})}
              >
                {Intl.supportedValuesOf('timeZone').map(tz => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>
        );
      case 2:
        return (
          <div className={styles.stepContent}>
            <h2>Upload your brand logos</h2>
            <p>Upload your primary logo and an optional transparent/dark version.</p>
            {errors.logo && <div style={{ color: 'red', marginBottom: '10px', fontSize: '14px', fontWeight: 500 }}>{errors.logo}</div>}
            <div className={styles.logoUploadGrid}>
              <div className={styles.logoSection}>
                <h3>Primary Logo <span style={{ color: 'red' }}>*</span></h3>
                {formData.logo ? (
                  <div className={styles.previewContainer}>
                    <div className={styles.logoPreviewWrapper}>
                      <img src={formData.logo} alt="Logo Preview" className={styles.previewImage} />
                    </div>
                    <button
                      className={styles.removeBtn}
                      onClick={() => setFormData({ ...formData, logo: null, logoUrl: null, logoFile: null })}
                    >
                      <X size={16} /> Remove
                    </button>
                  </div>
                ) : (
                  <div
                    className={`${styles.uploadBox} ${isDragging ? styles.dragging : ''}`}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      key="primary-logo-input"
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                      accept="image/png, image/jpeg, image/svg+xml"
                      style={{ display: 'none' }}
                    />
                    <Upload size={32} className={styles.uploadIcon} />
                    <span>Click to browse</span>
                    <p>PNG, SVG or JPG</p>
                  </div>
                )}
              </div>
              <div className={styles.logoSection}>
                <h3>Transparent Logo <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 400 }}>(Optional)</span></h3>
                {formData.logoDark ? (
                  <div className={styles.previewContainer}>
                    <div className={styles.logoPreviewWrapper} style={{ backgroundColor: '#1e293b' }}>
                      <img src={formData.logoDark} alt="Dark Logo Preview" className={styles.previewImage} />
                    </div>
                    <button
                      className={styles.removeBtn}
                      onClick={() => setFormData({ ...formData, logoDark: null, logoDarkUrl: null, logoDarkFile: null })}
                    >
                      <X size={16} /> Remove
                    </button>
                  </div>
                ) : (
                  <div
                    className={styles.uploadBox}
                    onClick={() => darkFileInputRef.current?.click()}
                  >
                    <input
                      key="dark-logo-input"
                      type="file"
                      ref={darkFileInputRef}
                      onChange={(e) => e.target.files && handleDarkFile(e.target.files[0])}
                      accept="image/png, image/jpeg, image/svg+xml"
                      style={{ display: 'none' }}
                    />
                    <Upload size={32} className={styles.uploadIcon} />
                    <span>Click to browse</span>
                    <p>PNG or SVG</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className={styles.stepContent}>
            <h2>Choose your colors</h2>
            <p>Select colors that represent your brand.</p>
            {formData.logo && (
              <div className={styles.autoDetectContainer}>
                <button className={styles.aiColorBtn} onClick={handleAutoDetect} type="button">
                  <Sparkles size={20} /> Auto-detect from Logo
                </button>
              </div>
            )}
            <div className={styles.colorSelection}>
              <div className={styles.colorPicker}>
                <label>Primary</label>
                <div className={styles.colorInput}>
                  <input
                    type="text"
                    className={styles.hexText}
                    value={formData.colors.primary || ''}
                    onChange={(e) => setFormData({ ...formData, colors: { ...formData.colors, primary: e.target.value } })}
                  />
                  <div className={styles.pickerWrapper} style={{ backgroundColor: formData.colors.primary || '#ffffff' }}>
                    <input
                      type="color"
                      value={formData.colors.primary || '#000000'}
                      onChange={(e) => setFormData({ ...formData, colors: { ...formData.colors, primary: e.target.value } })}
                    />
                  </div>
                </div>
              </div>
              <div className={styles.colorPicker}>
                <label>Secondary</label>
                <div className={styles.colorInput}>
                  <input
                    type="text"
                    className={styles.hexText}
                    value={formData.colors.secondary || ''}
                    onChange={(e) => setFormData({ ...formData, colors: { ...formData.colors, secondary: e.target.value } })}
                  />
                  <div className={styles.pickerWrapper} style={{ backgroundColor: formData.colors.secondary || '#ffffff' }}>
                    <input
                      type="color"
                      value={formData.colors.secondary || '#000000'}
                      onChange={(e) => setFormData({ ...formData, colors: { ...formData.colors, secondary: e.target.value } })}
                    />
                  </div>
                </div>
              </div>
              <div className={styles.colorPicker}>
                <label>Accent</label>
                <div className={styles.colorInput}>
                  <input
                    type="text"
                    className={styles.hexText}
                    value={formData.colors.accent || ''}
                    onChange={(e) => setFormData({ ...formData, colors: { ...formData.colors, accent: e.target.value } })}
                  />
                  <div className={styles.pickerWrapper} style={{ backgroundColor: formData.colors.accent || '#ffffff' }}>
                    <input
                      type="color"
                      value={formData.colors.accent || '#000000'}
                      onChange={(e) => setFormData({ ...formData, colors: { ...formData.colors, accent: e.target.value } })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className={styles.stepContent}>
            <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Roboto&family=Inter&family=Open+Sans&family=Lato&family=Poppins&family=Montserrat&family=Oswald&family=Playfair+Display&family=Raleway&family=Merriweather&family=Lora&display=swap');` }} />
            <h2>Brand Voice</h2>
            <p>How should your brand speak to its audience?</p>
            <div className={styles.inputGroup} style={{ marginBottom: '15px' }}>
              <label>Brand Kit Name <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                placeholder="e.g. Main Brand"
                value={formData.brandKitName || ''}
                onChange={(e) => {
                  setFormData({ ...formData, brandKitName: e.target.value });
                  if (errors.brandKitName) setErrors({ ...errors, brandKitName: '' });
                }}
                style={errors.brandKitName ? { borderColor: 'red' } : {}}
              />
              {errors.brandKitName && <span style={{ color: 'red', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.brandKitName}</span>}
            </div>
            <div className={styles.inputGroup} style={{ marginBottom: '15px' }}>
              <label>Brand / Product Website (Optional)</label>
              <input 
                type="url" 
                placeholder="https://www.example.com" 
                value={formData.websiteUrl}
                onChange={(e) => {
                  setFormData({...formData, websiteUrl: e.target.value});
                  if (errors.websiteUrl) setErrors({...errors, websiteUrl: ''});
                }}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val && !/^https?:\/\//i.test(val)) {
                    setFormData({...formData, websiteUrl: `https://${val}`});
                  }
                }}
                style={errors.websiteUrl ? { borderColor: 'red' } : {}}
              />
              {errors.websiteUrl && <span style={{color: 'red', fontSize: '12px', marginTop: '4px', display: 'block'}}>{errors.websiteUrl}</span>}
            </div>

            <div className={styles.inputGroup} style={{ marginBottom: '15px' }}>
              <label>Tone</label>
              <select value={formData.tone || 'professional'} onChange={(e) => setFormData({ ...formData, tone: e.target.value })}>
                <option value="professional">Professional</option>
                <option value="playful">Playful</option>
                <option value="friendly">Friendly</option>
                <option value="authoritative">Authoritative</option>
              </select>
            </div>
            <div className={styles.inputGrid} style={{ marginBottom: '15px' }}>
              <div className={styles.inputGroup}>
                <label>Heading Font</label>
                <Select
                  options={fontOptions}
                  styles={customSelectStyles}
                  value={fontOptions.find(opt => opt.value === formData.headingFont) || fontOptions[1]}
                  onChange={(selected: any) => setFormData({ ...formData, headingFont: selected.value })}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Body Font</label>
                <Select
                  options={fontOptions}
                  styles={customSelectStyles}
                  value={fontOptions.find(opt => opt.value === formData.bodyFont) || fontOptions[1]}
                  onChange={(selected: any) => setFormData({ ...formData, bodyFont: selected.value })}
                />
              </div>
            </div>
            <div className={styles.inputGrid} style={{ marginBottom: '15px' }}>
              <div className={styles.inputGroup}>
                <label>Phrases to Include (Optional)</label>
                <textarea 
                  className={styles.descriptionTextarea}
                  placeholder="e.g. Call now, Limited Time"
                  value={formData.phrasesToInclude}
                  onChange={(e) => setFormData({...formData, phrasesToInclude: e.target.value})}
                  rows={2}
                ></textarea>
              </div>
              <div className={styles.inputGroup}>
                <label>Phrases to Avoid (Optional)</label>
                <textarea 
                  className={styles.descriptionTextarea}
                  placeholder="e.g. Cheap, Fake"
                  value={formData.phrasesToAvoid}
                  onChange={(e) => setFormData({...formData, phrasesToAvoid: e.target.value})}
                  rows={2}
                ></textarea>
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label>Brief Description</label>
              <textarea
                className={styles.descriptionTextarea}
                placeholder="Briefly describe what you do..."
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              ></textarea>
            </div>
            
            {/* Product Images Upload Section */}
            <div className={styles.inputGroup} style={{ marginTop: '20px' }}>
              <label>Product Images (Optional)</label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Upload your product images with transparent or white backgrounds to feature them in generated posts.
              </p>
              
              <div 
                className={`${styles.uploadBox} ${isDragging ? styles.dragging : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                  if (files.length > 0) {
                    const fakeEvent = { target: { files } } as any;
                    handleProductUpload(fakeEvent);
                  }
                }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = 'image/png, image/jpeg, image/webp';
                  input.onchange = handleProductUpload as any;
                  input.click();
                }}
                style={{ minHeight: '100px', padding: '1.5rem', marginBottom: '15px' }}
              >
                {uploading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                    <Loader2 size={20} className="animate-spin" /> Uploading...
                  </div>
                ) : (
                  <>
                    <Upload size={24} className={styles.uploadIcon} />
                    <span>Click or drag products here</span>
                  </>
                )}
              </div>
              
              {formData.productImages.length > 0 && (
                <div className={styles.productGallery}>
                  {formData.productImages.map((product, index) => (
                    <div key={index} className={styles.productCard}>
                      <button 
                        className={styles.productDeleteBtn} 
                        onClick={() => handleProductDelete(index)}
                        title="Remove product"
                      >
                        <X size={14} />
                      </button>
                      <div className={styles.productThumb}>
                        <img src={product.imageUrl} alt={product.productName || 'Product'} />
                      </div>
                      <input 
                        type="text" 
                        className={styles.productNameInput}
                        placeholder="Product Name (e.g. Zeera Soda)" 
                        value={product.productName || ''}
                        onChange={(e) => handleProductNameChange(index, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case 5:
        return (
          <div className={styles.stepContent}>
            <h2>Connect Social Media</h2>
            <p>Connect your platforms to start posting.</p>
            <div className={styles.socialGrid}>
              <div className={styles.socialCard}>
                <div className={styles.socialInfo}>
                  <FacebookIcon className={styles.facebookIcon} />
                  <div>
                    <h3>Facebook</h3>
                    <p>Connect pages</p>
                  </div>
                </div>
                {socialConnections.facebook ? (
                  <button className={styles.connectBtn} style={{ backgroundColor: '#22c55e', borderColor: '#22c55e', color: 'white' }} disabled>Connected</button>
                ) : (
                  <button className={styles.connectBtn} onClick={connectFacebook}>Connect</button>
                )}
              </div>
              <div className={styles.socialCard}>
                <div className={styles.socialInfo}>
                  <InstagramIcon className={styles.instagramIcon} />
                  <div>
                    <h3>Instagram</h3>
                    <p>Business account</p>
                  </div>
                </div>
                {socialConnections.instagram ? (
                  <button className={styles.connectBtn} style={{ backgroundColor: '#22c55e', borderColor: '#22c55e', color: 'white' }} disabled>Connected</button>
                ) : (
                  <button className={styles.connectBtn} onClick={connectFacebook}>Connect</button>
                )}
              </div>
            </div>
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button className={styles.skipBtn} onClick={skipSocials}>Skip for now</button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (isRefreshing) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div className={styles.wizard}>
      <div className={styles.progressContainer}>
        {steps.map((step, index) => (
          <div key={index} className={`${styles.stepIndicator} ${currentStep > index + 1 ? styles.completed : ''} ${currentStep === index + 1 ? styles.current : ''}`}>
            <div className={styles.iconCircle}>
              {currentStep > index + 1 ? <Check size={16} /> : <step.icon size={16} />}
            </div>
            <span className={styles.stepTitle}>{step.title}</span>
            {index < steps.length - 1 && <div className={styles.line}></div>}
          </div>
        ))}
      </div>
      <div className={styles.mainCard}>
        <div key={currentStep}>
          {renderStep()}
        </div>
        <div className={styles.footer}>
          <button
            className={styles.backBtn}
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft size={18} /> Back
          </button>
          <button
            className={styles.nextBtn}
            onClick={nextStep}
            disabled={loading || uploading}
          >
            {loading ? 'Saving...' : uploading ? 'Uploading...' : (currentStep === steps.length ? (isEditMode ? 'Changes Done' : 'Get Started') : 'Next')} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
