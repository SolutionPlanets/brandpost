import React from 'react';
import styles from './BrandKitCard.module.css';
import { Palette, MessageSquare, Type, Edit2 } from 'lucide-react';
import { useBrand } from '@/contexts/BrandContext';

interface BrandKitCardProps {
  brandKit: {
    brand_kit_name: string;
    logo_url: string;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    heading_font: string;
    body_font: string;
    tone: string;
    brand_description: string;
  };
  onEdit?: () => void;
}

const BrandKitCard: React.FC<BrandKitCardProps> = ({ brandKit, onEdit }) => {
  const { profilePhoto } = useBrand();
  
  // Use manual logo if exists, otherwise fallback to OAuth profile photo
  const effectiveLogo = brandKit.logo_url || profilePhoto;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.logoSection}>
          {effectiveLogo ? (
            <img src={effectiveLogo} alt={brandKit.brand_kit_name} className={styles.logo} referrerPolicy="no-referrer" />
          ) : (
            <div className={styles.logoPlaceholder}>
              {brandKit.brand_kit_name ? brandKit.brand_kit_name.charAt(0).toUpperCase() : 'B'}
            </div>
          )}
          <div className={styles.nameInfo}>
            <h3 className={styles.name}>{brandKit.brand_kit_name}</h3>
            <span className={styles.toneBadge}>{brandKit.tone}</span>
          </div>
        </div>
        {onEdit && (
          <button onClick={onEdit} className={styles.editBtn}>
            <Edit2 size={16} /> Edit
          </button>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Palette size={16} />
            <span>Brand Colors</span>
          </div>
          <div className={styles.colorGrid}>
            <div className={styles.colorItem}>
              <div className={styles.swatch} style={{ backgroundColor: brandKit.primary_color }} />
              <div className={styles.colorInfo}>
                <span className={styles.colorLabel}>Primary</span>
                <span className={styles.colorValue}>{brandKit.primary_color}</span>
              </div>
            </div>
            <div className={styles.colorItem}>
              <div className={styles.swatch} style={{ backgroundColor: brandKit.secondary_color }} />
              <div className={styles.colorInfo}>
                <span className={styles.colorLabel}>Secondary</span>
                <span className={styles.colorValue}>{brandKit.secondary_color}</span>
              </div>
            </div>
            <div className={styles.colorItem}>
              <div className={styles.swatch} style={{ backgroundColor: brandKit.accent_color }} />
              <div className={styles.colorInfo}>
                <span className={styles.colorLabel}>Accent</span>
                <span className={styles.colorValue}>{brandKit.accent_color}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Type size={16} />
            <span>Typography</span>
          </div>
          <div className={styles.fontGrid}>
            <div className={styles.fontItem}>
              <span className={styles.fontLabel}>Heading</span>
              <span className={styles.fontValue} style={{ fontFamily: brandKit.heading_font }}>{brandKit.heading_font}</span>
            </div>
            <div className={styles.fontItem}>
              <span className={styles.fontLabel}>Body</span>
              <span className={styles.fontValue} style={{ fontFamily: brandKit.body_font }}>{brandKit.body_font}</span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <MessageSquare size={16} />
            <span>Description</span>
          </div>
          <p className={styles.description}>{brandKit.brand_description}</p>
        </div>
      </div>
    </div>
  );
};

export default BrandKitCard;
