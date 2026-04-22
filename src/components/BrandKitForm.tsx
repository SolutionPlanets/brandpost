'use client';

import { useState, useEffect } from 'react';
import { Upload, Plus, Check } from 'lucide-react';
import { useBrand } from '@/contexts/BrandContext';
import styles from './BrandKitForm.module.css';

export default function BrandKitForm() {
  const { businessName, setBusinessName, logo, setLogo, colors: contextColors, setColors: setContextColors } = useBrand();
  const [logoPreview, setLogoPreview] = useState<string | null>(logo);
  const [colors, setColors] = useState(contextColors);

  // Sync local state with context if context changes (e.g. on load)
  useEffect(() => {
    setLogoPreview(logo);
    setColors(contextColors);
  }, [logo, contextColors]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        setLogo(result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={styles.formContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Brand Kit</h1>
        <p className={styles.subtitle}>Define your brand's visual identity to maintain consistency across all posts.</p>
      </header>

      <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Business Name</h2>
          <input 
            type="text" 
            className={styles.input} 
            value={businessName} 
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Pixel Agency"
          />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Logo</h2>
          <div className={styles.uploadArea}>
            <input 
              type="file" 
              id="logo-upload" 
              className={styles.fileInput} 
              onChange={handleLogoUpload}
              accept="image/*"
            />
            <label htmlFor="logo-upload" className={styles.uploadLabel}>
              {logoPreview ? (
                <img src={logoPreview} alt="Logo Preview" className={styles.previewImage} />
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
          <h2 className={styles.sectionTitle}>Brand Colors</h2>
          <div className={styles.colorGrid}>
            <div className={styles.colorItem}>
              <label>Primary Color</label>
              <div className={styles.colorInputWrapper}>
                <input 
                  type="color" 
                  value={colors.primary} 
                  onChange={(e) => {
                    const newColors = {...colors, primary: e.target.value};
                    setColors(newColors);
                    setContextColors(newColors);
                  }} 
                />
                <span>{colors.primary}</span>
              </div>
            </div>
            <div className={styles.colorItem}>
              <label>Secondary Color</label>
              <div className={styles.colorInputWrapper}>
                <input 
                  type="color" 
                  value={colors.secondary} 
                  onChange={(e) => {
                    const newColors = {...colors, secondary: e.target.value};
                    setColors(newColors);
                    setContextColors(newColors);
                  }} 
                />
                <span>{colors.secondary}</span>
              </div>
            </div>
            <div className={styles.colorItem}>
              <label>Accent Color</label>
              <div className={styles.colorInputWrapper}>
                <input 
                  type="color" 
                  value={colors.accent} 
                  onChange={(e) => {
                    const newColors = {...colors, accent: e.target.value};
                    setColors(newColors);
                    setContextColors(newColors);
                  }} 
                />
                <span>{colors.accent}</span>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.row}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Typography</h2>
            <select className={styles.select}>
              <option value="inter">Inter (Default)</option>
              <option value="roboto">Roboto</option>
              <option value="outfit">Outfit</option>
              <option value="poppins">Poppins</option>
              <option value="playfair">Playfair Display</option>
            </select>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Brand Tone</h2>
            <select className={styles.select}>
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="playful">Playful</option>
              <option value="authoritative">Authoritative</option>
            </select>
          </section>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Brand Description</h2>
          <textarea 
            className={styles.textarea} 
            placeholder="E.g. We are a tech startup focused on making financial tools accessible to everyone..."
            rows={4}
          ></textarea>
        </section>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn}>Discard Changes</button>
          <button type="submit" className={styles.saveBtn}>Save Brand Kit</button>
        </div>
      </form>
    </div>
  );
}
