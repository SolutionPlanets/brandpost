'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  Upload, 
  Palette, 
  MessageSquare, 
  Share2, 
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Wand2
} from 'lucide-react';
import { getPalette } from 'colorthief';
import { createClient } from '@/utils/supabase/client';
import { useBrand } from '@/contexts/BrandContext';
import styles from './OnboardingWizard.module.css';

const steps = [
  { title: 'Business Info', icon: Building2 },
  { title: 'Logo', icon: Upload },
  { title: 'Colors', icon: Palette },
  { title: 'Brand Voice', icon: MessageSquare },
  { title: 'Connect', icon: Share2 },
];

export default function OnboardingWizard({ isDashboardMode = false }: { isDashboardMode?: boolean }) {
  const { setBusinessName, setLogo } = useBrand();
  const [currentStep, setCurrentStep] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    businessName: '',
    address: '',
    pincode: '',
    timing: '',
    logo: null as string | null,
    colors: { primary: '#4f46e5', secondary: '#64748b' },
    tone: 'Professional',
    description: '',
    fontSize: '16px',
    selectedPost: 1,
    selectedPlatforms: [] as string[],
    platforms: [],
    scheduledTime: '',
  });

  // Sync with global BrandContext for real-time UI updates (e.g. Header)
  useEffect(() => {
    setBusinessName(formData.businessName);
  }, [formData.businessName, setBusinessName]);

  useEffect(() => {
    setLogo(formData.logo);
  }, [formData.logo, setLogo]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchExistingData() {
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
        const name = brandKit?.name || workspace.name || '';
        setFormData(prev => ({
          ...prev,
          businessName: name === 'My Workspace' ? '' : name,
          colors: {
            primary: brandKit?.primary_color || prev.colors.primary,
            secondary: brandKit?.secondary_color || prev.colors.secondary,
          },
          tone: brandKit?.tone ? brandKit.tone.charAt(0).toUpperCase() + brandKit.tone.slice(1) : prev.tone,
          description: brandKit?.brand_description || prev.description,
          logo: brandKit?.logo_url || prev.logo
        }));
      }
    }
    fetchExistingData();
  }, []);
  
  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Ensure user exists
      const { data: userData } = await supabase.from('users').select('id').eq('id', user.id).maybeSingle();
      if (!userData) {
        await supabase.from('users').insert({ id: user.id, email: user.email, plan_id: 'solo' });
      }

      // 2. Ensure workspace exists
      let { data: workspace } = await supabase.from('workspaces').select('id').eq('owner_id', user.id).maybeSingle();
      if (!workspace) {
        const { data: newWs } = await supabase.from('workspaces').insert({
          owner_id: user.id,
          name: formData.businessName || 'My Workspace',
          plan_id: 'solo'
        }).select().single();
        workspace = newWs;
      }

      // 3. Upsert Brand Kit
      const brandKitData = {
        workspace_id: workspace!.id,
        name: formData.businessName || 'Main Brand',
        primary_color: formData.colors.primary,
        secondary_color: formData.colors.secondary,
        tone: formData.tone.toLowerCase(),
        brand_description: formData.description,
        logo_url: formData.logo
      };

      const { data: existingBK } = await supabase.from('brand_kits').select('id').eq('workspace_id', workspace!.id).maybeSingle();

      if (existingBK) {
        await supabase.from('brand_kits').update(brandKitData).eq('id', existingBK.id);
      } else {
        await supabase.from('brand_kits').insert(brandKitData);
      }

      alert('Changes saved successfully!');
      if (!isDashboardMode) {
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const analyzeLogoColors = async () => {
    if (!formData.logo) {
      alert('Please upload a logo first in the previous step!');
      setCurrentStep(2);
      return;
    }

    setIsAnalyzing(true);
    
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = formData.logo;
    
    img.onload = async () => {
      try {
        const palette = await getPalette(img, { colorCount: 5 });
        
        if (palette && palette.length >= 2) {
          const primaryHex = palette[0].hex();
          const secondaryHex = palette[1].hex();
          
          setFormData(prev => ({
            ...prev,
            colors: {
              primary: primaryHex,
              secondary: secondaryHex,
            }
          }));
        }
      } catch (error) {
        console.error('Error extracting colors:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    img.onerror = () => {
      console.error('Failed to load image for color analysis');
      setIsAnalyzing(false);
    };
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

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
        setFormData({ ...formData, logo: e.target?.result as string });
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
              <label>Business Name</label>
              <input 
                type="text" 
                placeholder="e.g. Pixel Agency" 
                value={formData.businessName}
                onChange={(e) => setFormData({...formData, businessName: e.target.value})}
              />
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
            
            {formData.logo ? (
              <div className={styles.previewContainer}>
                <img src={formData.logo} alt="Logo Preview" className={styles.previewImage} />
                <button 
                  className={styles.removeBtn}
                  onClick={() => setFormData({ ...formData, logo: null })}
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
            
            <button 
              className={`${styles.aiColorBtn} ${isAnalyzing ? styles.analyzing : ''}`}
              onClick={analyzeLogoColors}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>Analyzing logo...</>
              ) : (
                <>
                  <Wand2 size={18} />
                  Auto-detect from Logo
                </>
              )}
            </button>

            <div className={styles.colorSelection}>
              <div className={styles.colorPicker}>
                <label>Primary</label>
                <div className={styles.colorInput}>
                  <input 
                    type="text" 
                    value={formData.colors.primary} 
                    onChange={(e) => setFormData({...formData, colors: {...formData.colors, primary: e.target.value}})}
                    className={styles.hexText}
                  />
                  <div className={styles.pickerWrapper}>
                    <input 
                      type="color" 
                      value={formData.colors.primary} 
                      onChange={(e) => setFormData({...formData, colors: {...formData.colors, primary: e.target.value}})} 
                    />
                  </div>
                </div>
              </div>
              <div className={styles.colorPicker}>
                <label>Secondary</label>
                <div className={styles.colorInput}>
                  <input 
                    type="text" 
                    value={formData.colors.secondary} 
                    onChange={(e) => setFormData({...formData, colors: {...formData.colors, secondary: e.target.value}})}
                    className={styles.hexText}
                  />
                  <div className={styles.pickerWrapper}>
                    <input 
                      type="color" 
                      value={formData.colors.secondary} 
                      onChange={(e) => setFormData({...formData, colors: {...formData.colors, secondary: e.target.value}})} 
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
            <h2>Brand Voice</h2>
            <p>How should your brand speak to its audience?</p>
            <div className={styles.inputGrid}>
              <div className={styles.inputGroup}>
                <label>Tone</label>
                <select value={formData.tone} onChange={(e) => setFormData({...formData, tone: e.target.value})}>
                  <option>Professional</option>
                  <option>Playful</option>
                  <option>Friendly</option>
                  <option>Authoritative</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Description Font Size</label>
                <select value={formData.fontSize} onChange={(e) => setFormData({...formData, fontSize: e.target.value})}>
                  <option value="12px">Small (12px)</option>
                  <option value="14px">Normal (14px)</option>
                  <option value="16px">Regular (16px)</option>
                  <option value="18px">Medium (18px)</option>
                  <option value="20px">Large (20px)</option>
                </select>
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label>Brief Description</label>
              <textarea 
                className={styles.descriptionTextarea}
                placeholder="Briefly describe what you do..."
                value={formData.description}
                style={{ fontSize: formData.fontSize }}
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
                  <MessageSquare className={styles.facebookIcon} />
                  <div>
                    <h3>Facebook</h3>
                    <p>Connect pages</p>
                  </div>
                </div>
                <button className={styles.connectBtn}>Connect</button>
              </div>
              <div className={styles.socialCard}>
                <div className={styles.socialInfo}>
                  <Share2 className={styles.instagramIcon} />
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

        {zoomedImage && (
          <div className={styles.modalOverlay} onClick={() => setZoomedImage(null)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <button className={styles.closeModal} onClick={() => setZoomedImage(null)}>
                <X size={24} />
              </button>
              <img src={zoomedImage} alt="Fullscreen Preview" className={styles.fullImage} />
            </div>
          </div>
        )}

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
            onClick={currentStep === steps.length ? handleFinish : nextStep}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : (
              currentStep === steps.length 
                ? (isDashboardMode ? 'Save Changes' : 'Finish & Go to Dashboard') 
                : 'Next'
            )} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
