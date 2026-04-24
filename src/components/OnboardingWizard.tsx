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
import styles from './OnboardingWizard.module.css';
import { useRouter } from 'next/navigation';
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

export default function OnboardingWizard() {
  const router = useRouter();
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isOpenOpen, setIsOpenOpen] = useState(false);
  const [isOpenClose, setIsOpenClose] = useState(false);
  const dropdownOpenRef = useRef<HTMLDivElement>(null);
  const dropdownCloseRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    ownerName: '',
    businessName: '',
    address: '',
    pincode: '',
    timing: '',
    logo: null as string | null,
    logoUrl: null as string | null,
    logoFile: null as File | null,
    colors: { primary: '#4f46e5', secondary: '#64748b', accent: '#fbbf24' },
    tone: 'professional',
    description: '',
    brandKitName: '',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    selectedPost: 1,
    selectedPlatforms: [] as string[],
    platforms: [],
    instagram: '',
    facebook: ''
  });

  useEffect(() => {
    async function fetchExistingData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsRefreshing(false);
        return;
      }

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('*, brand_kits(*)')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (workspace) {
        const brandKit = workspace.brand_kits?.[0];
        setFormData(prev => ({
          ...prev,
          ownerName: workspace.owner_name || '',
          businessName: workspace.business_name || '',
          address: workspace.address || '',
          pincode: workspace.pincode || '',
          timing: workspace.business_timing || '',
          logo: brandKit?.logo_url || null,
          logoUrl: brandKit?.logo_url || null,
          colors: brandKit ? {
            primary: brandKit.primary_color || prev.colors.primary,
            secondary: brandKit.secondary_color || prev.colors.secondary,
            accent: brandKit.accent_color || prev.colors.accent,
          } : prev.colors,
          tone: brandKit?.tone ? brandKit.tone.toLowerCase() : 'professional',
          description: brandKit?.brand_description || '',
          brandKitName: brandKit?.brand_kit_name || '',
          headingFont: brandKit?.heading_font || 'Inter',
          bodyFont: brandKit?.body_font || 'Inter',
          instagram: brandKit?.instagram_handle || '',
          facebook: brandKit?.facebook_handle || '',
        }));
        if (workspace.business_name) {
          setIsEditMode(true);
        }
      }
      setIsRefreshing(false);
    }
    fetchExistingData();
  }, []);

  // For color extraction
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

    const { error } = await supabase
      .from('workspaces')
      .update({
        business_name: formData.businessName,
        owner_name: formData.ownerName,
        address: formData.address,
        pincode: formData.pincode,
        business_timing: formData.timing
      })
      .eq('owner_id', user.id);

    if (error) {
      console.error('Workspace update error:', JSON.stringify(error, null, 2));
    }
  };

  const saveBrandKit = async (logoUrlOverride?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('saveBrandKit: No user session found');
        return;
      }

      // Get workspace ID - using maybeSingle to avoid errors if multiple found (though trigger should prevent)
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (wsError) {
        console.error('saveBrandKit: Error fetching workspace:', wsError);
        return;
      }

      if (!workspace) {
        console.warn('saveBrandKit: No workspace found for user', user.id);
        return;
      }

      console.log('saveBrandKit: Saving for workspace', workspace.id);

      // Fetch existing brand kit to append 'id' if it exists. 
      // This bypasses the need for the ON CONFLICT specifying 'workspace_id' which throws 42P10.
      const { data: existingBrandKit } = await supabase
        .from('brand_kits')
        .select('id')
        .eq('workspace_id', workspace.id)
        .maybeSingle();

      const payload: Record<string, any> = {
        workspace_id: workspace.id,
        brand_kit_name: formData.brandKitName || `${formData.businessName} Brand Kit`,
        logo_url: logoUrlOverride || formData.logoUrl || null,
        primary_color: formData.colors.primary,
        secondary_color: formData.colors.secondary,
        accent_color: formData.colors.accent,
        heading_font: formData.headingFont,
        body_font: formData.bodyFont,
        brand_description: formData.description,
        tone: formData.tone,
      };

      if (existingBrandKit?.id) {
        payload.id = existingBrandKit.id; // Append primary key for seamless UPSERT fallback
      }

      const { error, data } = await supabase
        .from('brand_kits')
        .upsert(payload)
        .select();

      if (error) {
        console.error('Brand kit upsert error:', JSON.stringify(error, null, 2));
      } else {
        console.log('Brand kit saved successfully:', data);
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
      if (formData.logoFile && !finalLogoUrl) {
        setUploading(true);
        const fileExt = formData.logoFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('BrandpostAI_logos')
          .upload(fileName, formData.logoFile);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          setErrors({ logo: `Upload failed: ${uploadError.message}` });
          setUploading(false);
          setLoading(false);
          return;
        }

        const { data } = supabase.storage
          .from('BrandpostAI_logos')
          .getPublicUrl(fileName);

        finalLogoUrl = data.publicUrl;
        setUploading(false);
      }

      await saveBrandKit(finalLogoUrl || undefined);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Final submit error:', err);
      setLoading(false);
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

  const togglePlatform = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      selectedPlatforms: prev.selectedPlatforms.includes(platform)
        ? prev.selectedPlatforms.filter(p => p !== platform)
        : [...prev.selectedPlatforms, platform]
    }));
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
                  value={formData.businessName}
                  onChange={(e) => {
                    setFormData({ ...formData, businessName: e.target.value });
                    if (errors.businessName) setErrors({ ...errors, businessName: '' });
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
                  value={formData.ownerName}
                  onChange={(e) => {
                    setFormData({ ...formData, ownerName: e.target.value });
                    if (errors.ownerName) setErrors({ ...errors, ownerName: '' });
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
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className={styles.inputGrid}>
              <div className={styles.inputGroup}>
                <label>Pincode</label>
                <input
                  type="text"
                  placeholder="6-digit code"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Business Timing</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
                  {/* Open Time Custom Dropdown */}
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
                              setFormData({...formData, timing: `${h} - ${end}`});
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

                  {/* Close Time Custom Dropdown */}
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
                              setFormData({...formData, timing: `${start} - ${h}`});
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
          </div>
        );
      case 2:
        return (
          <div className={styles.stepContent}>
            <h2>Upload your logo</h2>
            <p>This will be added to your generated posts.</p>
            {errors.logo && <div style={{ color: 'red', marginBottom: '10px', fontSize: '14px', fontWeight: 500 }}>{errors.logo}</div>}

            {formData.logo ? (
              <div className={styles.previewContainer}>
                <img src={formData.logo} alt="Logo Preview" className={styles.previewImage} />
                <button
                  className={styles.removeBtn}
                  onClick={() => setFormData({ ...formData, logo: null, logoUrl: null, logoFile: null })}
                >
                  <X size={16} style={{ marginRight: '4px' }} /> Remove and try another
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
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                  accept="image/png, image/jpeg, image/svg+xml"
                  style={{ display: 'none' }}
                />
                <Upload size={48} className={styles.uploadIcon} />
                <span>Click to browse or drag and drop</span>
                <p>PNG, SVG or JPG (max 2MB)</p>
              </div>
            )}
          </div>
        );
      case 3:
        return (
          <div className={styles.stepContent}>
            <h2>Choose your colors</h2>
            <p>Select colors that represent your brand.</p>

            {formData.logo && (
              <div className={styles.autoDetectContainer}>
                <button
                  className={styles.aiColorBtn}
                  onClick={handleAutoDetect}
                  type="button"
                >
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
                    value={formData.colors.primary}
                    onChange={(e) => setFormData({ ...formData, colors: { ...formData.colors, primary: e.target.value } })}
                  />
                  <div className={styles.pickerWrapper} style={{ backgroundColor: formData.colors.primary }}>
                    <input
                      type="color"
                      value={formData.colors.primary}
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
                    value={formData.colors.secondary}
                    onChange={(e) => setFormData({ ...formData, colors: { ...formData.colors, secondary: e.target.value } })}
                  />
                  <div className={styles.pickerWrapper} style={{ backgroundColor: formData.colors.secondary }}>
                    <input
                      type="color"
                      value={formData.colors.secondary}
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
                    value={formData.colors.accent}
                    onChange={(e) => setFormData({ ...formData, colors: { ...formData.colors, accent: e.target.value } })}
                  />
                  <div className={styles.pickerWrapper} style={{ backgroundColor: formData.colors.accent }}>
                    <input
                      type="color"
                      value={formData.colors.accent}
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
              <label>Brand Kit Name</label>
              <input
                type="text"
                placeholder="e.g. Main Brand"
                value={formData.brandKitName}
                onChange={(e) => setFormData({ ...formData, brandKitName: e.target.value })}
              />
            </div>

            <div className={styles.inputGroup} style={{ marginBottom: '15px' }}>
              <label>Tone</label>
              <select value={formData.tone} onChange={(e) => setFormData({ ...formData, tone: e.target.value })}>
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

            <div className={styles.inputGroup}>
              <label>Brief Description</label>
              <textarea
                className={styles.descriptionTextarea}
                placeholder="Briefly describe what you do..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              ></textarea>
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
                <button className={styles.connectBtn}>Connect</button>
              </div>
              <div className={styles.socialCard}>
                <div className={styles.socialInfo}>
                  <InstagramIcon className={styles.instagramIcon} />
                  <div>
                    <h3>Instagram</h3>
                    <p>Business account</p>
                  </div>
                </div>
                <button className={styles.connectBtn}>Connect</button>
              </div>
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
        {renderStep()}

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
