'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Plus, Check, X, Wand2, Loader2, Building2, Facebook, Instagram } from 'lucide-react';
import { getPalette } from 'colorthief';
import { createClient } from '@/utils/supabase/client';
import { useBrand } from '@/contexts/BrandContext';
import styles from './BrandKitForm.module.css';

export default function BrandKitForm() {
  const { 
    businessName: contextBusinessName, setBusinessName: setContextBusinessName, 
    logo: contextLogo, setLogo: setContextLogo, 
    colors: contextColors, setColors: setContextColors,
    refreshBrandData
  } = useBrand();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    logo: null as string | null,
    colors: { primary: '#4f46e5', secondary: '#64748b', accent: '#06b6d4' },
    headingFont: 'Inter',
    bodyFont: 'Inter',
    tone: 'Professional',
    description: '',
    instagram: '',
    facebook: '',
  });

  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBrandKit();
  }, []);

  // Sync local formData with context values when context updates
  useEffect(() => {
    if (contextBusinessName || contextLogo || contextColors) {
      setFormData(prev => ({
        ...prev,
        businessName: contextBusinessName || prev.businessName,
        logo: contextLogo || prev.logo,
        colors: contextColors || prev.colors
      }));
    }
  }, [contextBusinessName, contextLogo, contextColors]);

  const fetchBrandKit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: brandKit } = await supabase
        .from('brand_kits')
        .select(`
          *,
          workspaces!inner (owner_id)
        `)
        .eq('workspaces.owner_id', user.id)
        .limit(1)
        .maybeSingle();

      if (brandKit) {
        const newData = {
          businessName: brandKit.brand_kit_name || '',
          logo: brandKit.logo_url || null,
          colors: {
            primary: brandKit.primary_color || '#4f46e5',
            secondary: brandKit.secondary_color || '#64748b',
            accent: brandKit.accent_color || '#06b6d4'
          },
          headingFont: brandKit.heading_font || 'Inter',
          bodyFont: brandKit.body_font || 'Inter',
          tone: brandKit.tone ? brandKit.tone.charAt(0).toUpperCase() + brandKit.tone.slice(1) : 'Professional',
          description: brandKit.brand_description || '',
          instagram: brandKit.instagram_handle || '',
          facebook: brandKit.facebook_handle || '',
        };
        setFormData(newData);
        
        // Update context too
        setContextBusinessName(newData.businessName);
        setContextLogo(newData.logo);
        setContextColors(newData.colors);
      }
    } catch (error) {
      console.error('Error fetching brand kit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/svg+xml')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setFormData(prev => ({ ...prev, logo: result }));
        setContextLogo(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeLogoColors = async () => {
    if (!formData.logo) {
      alert('Please upload a logo first!');
      return;
    }

    setIsAnalyzing(true);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = formData.logo;

    img.onload = async () => {
      try {
        const palette = await getPalette(img, 5);
        if (palette && palette.length >= 2) {
          const toHex = (rgb: number[]) => '#' + rgb.map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
          }).join('');

          const newColors = {
            primary: toHex(palette[0]),
            secondary: toHex(palette[1]),
            accent: palette[2] ? toHex(palette[2]) : formData.colors.accent
          };

          setFormData(prev => ({
            ...prev,
            colors: newColors
          }));
          setContextColors(newColors);
        }
      } catch (error) {
        console.error('Color analysis failed:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!workspace) throw new Error('No workspace found');

      const { data: existingBrandKit } = await supabase
        .from('brand_kits')
        .select('id')
        .eq('workspace_id', workspace.id)
        .maybeSingle();

      const payload: any = {
        workspace_id: workspace.id,
        brand_kit_name: formData.businessName,
        primary_color: formData.colors.primary,
        secondary_color: formData.colors.secondary,
        accent_color: formData.colors.accent,
        heading_font: formData.headingFont,
        body_font: formData.bodyFont,
        tone: formData.tone.toLowerCase(),
        brand_description: formData.description,
        logo_url: formData.logo,
        instagram_handle: formData.instagram,
        facebook_handle: formData.facebook,
      };

      if (existingBrandKit?.id) {
        payload.id = existingBrandKit.id;
      }

      const { error: bkError } = await supabase
        .from('brand_kits')
        .upsert(payload);

      if (bkError) throw bkError;

      setContextBusinessName(formData.businessName);
      setContextColors(formData.colors);
      setContextLogo(formData.logo);
      await refreshBrandData();

      alert('Brand Kit saved successfully!');
    } catch (error: any) {
      console.error('Error saving brand kit:', error);
      alert(`Save failed: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className="animate-spin" size={32} />
        <p>Loading your brand settings...</p>
      </div>
    );
  }

  return (
    <div className={styles.formContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Brand Kit</h1>
        <p className={styles.subtitle}>Define your brand's visual identity to maintain consistency across all posts.</p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Business Name</label>
          <div className={styles.inputWithIcon}>
            <Building2 className={styles.inputIcon} size={18} />
            <input
              type="text"
              placeholder="e.g. Pixel Agency"
              className={styles.input}
              value={formData.businessName}
              onChange={(e) => {
                setFormData({ ...formData, businessName: e.target.value });
                setContextBusinessName(e.target.value);
              }}
              required
            />
          </div>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Logo</h2>
          <div className={styles.uploadArea}>
            <input 
              type="file" 
              id="logo-upload" 
              className={styles.fileInput} 
              onChange={handleLogoUpload}
              accept="image/*"
              ref={fileInputRef}
            />
            <label htmlFor="logo-upload" className={styles.uploadLabel}>
              {formData.logo ? (
                <div className={styles.previewWrapper}>
                  <img src={formData.logo} alt="Logo Preview" className={styles.previewImage} />
                  <div className={styles.uploadOverlay}>
                    <Upload size={24} />
                    <span>Change Logo</span>
                  </div>
                </div>
              ) : (
                <div className={styles.uploadPlaceholder}>
                  <Upload size={32} />
                  <span>Drag & drop or Click to upload logo</span>
                  <span className={styles.uploadHint}>SVG, PNG or JPG (max. 2MB)</span>
                </div>
              )}
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Brand Colors</h2>
            <button 
              type="button"
              className={styles.magicBtn}
              onClick={analyzeLogoColors}
              disabled={isAnalyzing || !formData.logo}
            >
              {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              <span>Auto-match from logo</span>
            </button>
          </div>
          <div className={styles.colorGrid}>
            <div className={styles.colorItem}>
              <label>Primary Color</label>
              <div className={styles.colorInputWrapper}>
                <input 
                  type="color" 
                  value={formData.colors.primary} 
                  onChange={(e) => {
                    const newColors = {...formData.colors, primary: e.target.value};
                    setFormData({...formData, colors: newColors});
                    setContextColors(newColors);
                  }} 
                />
                <span>{formData.colors.primary}</span>
              </div>
            </div>
            <div className={styles.colorItem}>
              <label>Secondary Color</label>
              <div className={styles.colorInputWrapper}>
                <input 
                  type="color" 
                  value={formData.colors.secondary} 
                  onChange={(e) => {
                    const newColors = {...formData.colors, secondary: e.target.value};
                    setFormData({...formData, colors: newColors});
                    setContextColors(newColors);
                  }} 
                />
                <span>{formData.colors.secondary}</span>
              </div>
            </div>
            <div className={styles.colorItem}>
              <label>Accent Color</label>
              <div className={styles.colorInputWrapper}>
                <input 
                  type="color" 
                  value={formData.colors.accent} 
                  onChange={(e) => {
                    const newColors = {...formData.colors, accent: e.target.value};
                    setFormData({...formData, colors: newColors});
                    setContextColors(newColors);
                  }} 
                />
                <span>{formData.colors.accent}</span>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.row}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Typography</h2>
            <select 
              className={styles.select}
              value={formData.headingFont}
              onChange={(e) => setFormData({...formData, headingFont: e.target.value, bodyFont: e.target.value})}
            >
              <option value="Inter">Inter (Default)</option>
              <option value="Roboto">Roboto</option>
              <option value="Outfit">Outfit</option>
              <option value="Poppins">Poppins</option>
              <option value="Playfair">Playfair Display</option>
            </select>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Brand Tone</h2>
            <select 
              className={styles.select}
              value={formData.tone}
              onChange={(e) => setFormData({...formData, tone: e.target.value})}
            >
              <option value="Professional">Professional</option>
              <option value="Friendly">Friendly</option>
              <option value="Playful">Playful</option>
              <option value="Authoritative">Authoritative</option>
            </select>
          </section>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Social Media Handles</h2>
          <div className={styles.row} style={{ marginTop: '0.5rem' }}>
            <div className={styles.inputWithIcon} style={{ flex: 1 }}>
              <Facebook className={styles.inputIcon} size={18} style={{ color: '#1877f2' }} />
              <input
                type="text"
                placeholder="Facebook page name"
                className={styles.input}
                value={formData.facebook || ''}
                onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
              />
            </div>
            <div className={styles.inputWithIcon} style={{ flex: 1 }}>
              <Instagram className={styles.inputIcon} size={18} style={{ color: '#e4405f' }} />
              <input
                type="text"
                placeholder="Instagram handle"
                className={styles.input}
                value={formData.instagram || ''}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Brand Description</h2>
          <textarea 
            className={styles.textarea} 
            placeholder="E.g. We are a tech startup focused on making financial tools accessible to everyone..."
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          ></textarea>
        </section>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={fetchBrandKit}>Discard Changes</button>
          <button type="submit" className={styles.saveBtn} disabled={isSaving}>
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            <span>{isSaving ? 'Saving...' : 'Save Brand Kit'}</span>
          </button>
        </div>
      </form >
    </div >
  );
}
