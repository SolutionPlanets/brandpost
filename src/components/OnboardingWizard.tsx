'use client';

import { useState, useRef } from 'react';
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
  Facebook
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

export default function OnboardingWizard() {
  const router = useRouter();
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    businessName: '',
    address: '',
    pincode: '',
    timing: '',
    logo: null as string | null,
    logoUrl: null as string | null,
    logoFile: null as File | null,
    colors: { primary: '#4f46e5', secondary: '#64748b', accent: '#fbbf24' },
    tone: 'Professional',
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

  const saveWorkspace = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('workspaces')
      .update({ 
        business_name: formData.businessName,
        address: formData.address,
        pincode: formData.pincode,
        business_timing: formData.timing
      })
      .eq('owner_id', user.id);

    if (error) console.error('Workspace update error:', error);
  };

  const saveBrandKit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get workspace ID
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!workspace) return;

    // UPSERT brand kit
    const { error } = await supabase
      .from('brand_kits')
      .upsert({
        workspace_id: workspace.id,
        brand_kit_name: formData.brandKitName || `${formData.businessName} Brand Kit`,
        logo_url: formData.logoUrl || formData.logo,
        primary_color: formData.colors.primary,
        secondary_color: formData.colors.secondary,
        accent_color: formData.colors.accent,
        heading_font: formData.headingFont,
        body_font: formData.bodyFont,
        brand_description: formData.description,
        tone: formData.tone,
        instagram_handle: formData.instagram,
        facebook_handle: formData.facebook
      }, { onConflict: 'workspace_id' });

    if (error) console.error('Brand kit upsert error:', error);
  };

  const nextStep = async () => {
    if (currentStep === 1 && !formData.businessName.trim()) {
      setErrors({ businessName: 'Business Name is required' });
      return;
    }
    
    setLoading(true);

    if (currentStep === 1) await saveWorkspace();

    if (currentStep === 2) {
      if (!formData.logoUrl && !formData.logo && !formData.logoFile) {
        setErrors({ logo: 'Please upload a logo to continue' });
        setLoading(false);
        return;
      }
      
      // Upload execution is conditionally deferred precisely to Step 2 validation checkpoint
      if (formData.logoFile && !formData.logoUrl) {
        setUploading(true);
        try {
          const fileExt = formData.logoFile.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('BrandpostAI_logos')
            .upload(filePath, formData.logoFile);

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            setErrors({ logo: `Upload failed: ${uploadError.message}` });
            setUploading(false);
            setLoading(false);
            return;
          }

          const { data } = supabase.storage
            .from('BrandpostAI_logos')
            .getPublicUrl(filePath);

          setFormData(prev => ({ ...prev, logoUrl: data.publicUrl }));
          setErrors(prev => ({ ...prev, logo: '' }));
        } catch (err: any) {
          console.error('Error in upload:', err);
          setErrors({ logo: `Upload error: ${err?.message || 'Unknown error'}` });
          setUploading(false);
          setLoading(false);
          return;
        } finally {
          setUploading(false);
        }
      }
    }

    if (currentStep === 4) await saveBrandKit();
    
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const skipSocials = () => {
    router.push('/dashboard');
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
        setFormData(prev => ({...prev, logo: e.target?.result as string, logoFile: file }));
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
    switch(currentStep) {
      case 1:
        return (
          <div className={styles.stepContent}>
            <h2>Tell us about your business</h2>
            <p>We'll use this to personalize your content and profile.</p>
            <div className={styles.inputGroup}>
              <label>Business Name <span style={{color: 'red'}}>*</span></label>
              <input 
                type="text" 
                placeholder="e.g. Pixel Agency" 
                value={formData.businessName}
                onChange={(e) => {
                  setFormData({...formData, businessName: e.target.value});
                  if (errors.businessName) setErrors({...errors, businessName: ''});
                }}
                style={errors.businessName ? { borderColor: 'red' } : {}}
              />
              {errors.businessName && <span style={{color: 'red', fontSize: '12px', marginTop: '4px', display: 'block'}}>{errors.businessName}</span>}
            </div>
            <div className={styles.inputGroup}>
              <label>Address</label>
              <input 
                type="text" 
                placeholder="Shop/Office location" 
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>
            <div className={styles.inputGrid}>
              <div className={styles.inputGroup}>
                <label>Pincode</label>
                <input 
                  type="text" 
                  placeholder="6-digit code" 
                  value={formData.pincode}
                  onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Business Timing</label>
                <input 
                  type="text" 
                  placeholder="e.g. 9 AM - 8 PM" 
                  value={formData.timing}
                  onChange={(e) => setFormData({...formData, timing: e.target.value})}
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className={styles.stepContent}>
            <h2>Upload your logo</h2>
            <p>This will be added to your generated posts.</p>
            {errors.logo && <div style={{color: 'red', marginBottom: '10px', fontSize: '14px', fontWeight: 500}}>{errors.logo}</div>}
            
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
                  className={styles.autoDetectBtn}
                  onClick={handleAutoDetect}
                  type="button"
                >
                  <Palette size={18} /> Auto detect from Logo
                </button>
              </div>
            )}

            <div className={styles.colorSelection}>
              <div className={styles.colorPicker}>
                <label>Primary</label>
                <div className={styles.colorInput}>
                  <input type="color" value={formData.colors.primary} onChange={(e) => setFormData({...formData, colors: {...formData.colors, primary: e.target.value}})} />
                  <span>{formData.colors.primary}</span>
                </div>
              </div>
              <div className={styles.colorPicker}>
                <label>Secondary</label>
                <div className={styles.colorInput}>
                  <input type="color" value={formData.colors.secondary} onChange={(e) => setFormData({...formData, colors: {...formData.colors, secondary: e.target.value}})} />
                  <span>{formData.colors.secondary}</span>
                </div>
              </div>
              <div className={styles.colorPicker}>
                <label>Accent</label>
                <div className={styles.colorInput}>
                  <input type="color" value={formData.colors.accent} onChange={(e) => setFormData({...formData, colors: {...formData.colors, accent: e.target.value}})} />
                  <span>{formData.colors.accent}</span>
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
                onChange={(e) => setFormData({...formData, brandKitName: e.target.value})}
              />
            </div>

            <div className={styles.inputGroup} style={{ marginBottom: '15px' }}>
              <label>Tone</label>
              <select value={formData.tone} onChange={(e) => setFormData({...formData, tone: e.target.value})}>
                <option>Professional</option>
                <option>Playful</option>
                <option>Friendly</option>
                <option>Authoritative</option>
              </select>
            </div>

            <div className={styles.inputGrid} style={{ marginBottom: '15px' }}>
              <div className={styles.inputGroup}>
                <label>Heading Font</label>
                <Select 
                  options={fontOptions}
                  styles={customSelectStyles}
                  value={fontOptions.find(opt => opt.value === formData.headingFont) || fontOptions[1]}
                  onChange={(selected: any) => setFormData({...formData, headingFont: selected.value})}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Body Font</label>
                <Select 
                  options={fontOptions}
                  styles={customSelectStyles}
                  value={fontOptions.find(opt => opt.value === formData.bodyFont) || fontOptions[1]}
                  onChange={(selected: any) => setFormData({...formData, bodyFont: selected.value})}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Brief Description</label>
              <textarea 
                className={styles.descriptionTextarea}
                placeholder="Briefly describe what you do..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
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
            <div className={styles.socialInputs}>
              <div className={styles.inputGroup}>
                <label>Instagram Handle</label>
                <div className={styles.inputWithIcon}>
                  <Instagram size={18} />
                  <input 
                    type="text" 
                    placeholder="@yourbrand" 
                    value={formData.instagram}
                    onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                  />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label>Facebook Page URL</label>
                <div className={styles.inputWithIcon}>
                  <Facebook size={18} />
                  <input 
                    type="text" 
                    placeholder="facebook.com/yourbrand" 
                    value={formData.facebook}
                    onChange={(e) => setFormData({...formData, facebook: e.target.value})}
                  />
                </div>
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
            {loading ? 'Saving...' : uploading ? 'Uploading...' : (currentStep === steps.length ? 'Get Started' : 'Next')} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
