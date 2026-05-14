'use client';

import { useState, useEffect } from 'react';
import OnboardingWizard from '@/components/OnboardingWizard';
import BrandKitCard from '@/components/BrandKitCard';
import { useBrand } from '@/contexts/BrandContext';
import { Loader2, Plus, Lock, Check } from 'lucide-react';
import styles from './BrandKit.module.css';

export default function BrandKitPage() {
  const { brandKits, brandKitLimit, refreshBrandData } = useBrand();
  const [loading, setLoading] = useState(false);
  const [editingKitId, setEditingKitId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);

  useEffect(() => {
    if (brandKits.length > 0 && !selectedKitId) {
      setSelectedKitId(brandKits[0].id);
    }
  }, [brandKits, selectedKitId]);

  const handleEdit = (id: string) => {
    setEditingKitId(id);
  };

  const handleCreateNew = () => {
    setIsCreatingNew(true);
  };

  const handleComplete = async () => {
    setLoading(true);
    await refreshBrandData();
    setEditingKitId(null);
    setIsCreatingNew(false);
    setLoading(false);
  };

  const selectedKit = brandKits.find(k => k.id === selectedKitId) || brandKits[0];

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <Loader2 size={32} className={styles.spinner} />
      </div>
    );
  }

  if (editingKitId || isCreatingNew) {
    return (
      <div className={styles.editorContainer}>
        <div className={styles.editorHeader}>
          <h1 className={styles.title}>{editingKitId ? 'Edit Brand Kit' : 'Setup New Brand Kit'}</h1>
          <button 
            onClick={() => { setEditingKitId(null); setIsCreatingNew(false); }}
            className={styles.cancelBtn}
          >
            Cancel
          </button>
        </div>
        <OnboardingWizard 
          key={editingKitId || 'new'}
          brandKitId={editingKitId || undefined} 
          onComplete={handleComplete} 
        />
      </div>
    );
  }

  // Dynamic slots logic
  const items: any[] = [];
  
  // 1. All existing kits
  brandKits.forEach((kit, index) => {
    const isLockedByPlan = index >= brandKitLimit;
    items.push({ 
      type: isLockedByPlan ? 'locked' : 'kit', 
      data: kit, 
      index 
    });
  });

  // 2. Add ONE "Add New" slot if limit not reached
  if (brandKits.length < brandKitLimit) {
    items.push({ type: 'new', index: brandKits.length });
  }

  // 3. Padding to ensure at least 3 slots are shown (showing locked ones if necessary)
  const minSlots = 3;
  while (items.length < minSlots) {
    const nextIndex = items.length;
    if (nextIndex < brandKitLimit) {
      items.push({ type: 'empty', index: nextIndex });
    } else {
      items.push({ type: 'locked', index: nextIndex });
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Brand Kits</h1>
        <p className={styles.subtitle}>Manage your brand identities and voices across different businesses or projects.</p>
      </header>

      <div className={styles.slotsGrid}>
        {items.map((item, i) => {
          const { type, data: kit, index } = item;
          const isSelected = type === 'kit' && selectedKitId === kit.id;
          
          return (
            <div 
              key={i} 
              className={`
                ${styles.slotCard} 
                ${type === 'locked' ? styles.slotLocked : ''} 
                ${isSelected ? styles.slotSelected : ''}
                ${type === 'new' ? styles.slotPlus : ''}
              `}
              onClick={() => type === 'kit' && setSelectedKitId(kit.id)}
              style={{ cursor: type === 'kit' ? 'pointer' : 'default' }}
            >
              <div className={styles.slotHeader}>
                <span className={styles.slotLabel}>Brand Kit {index + 1}</span>
                {type === 'kit' && <span className={styles.activeBadge}><Check size={12} /> Setup Done</span>}
                {type === 'locked' && <span className={styles.lockedBadge}><Lock size={12} /> Locked</span>}
              </div>

              <div className={styles.slotBody}>
                {type === 'kit' ? (
                  <div className={styles.kitPreview}>
                    <div className={styles.kitInfo}>
                      <div className={styles.kitLogoWrap}>
                        {kit.logo_url ? (
                          <img src={kit.logo_url} alt={kit.brand_kit_name} />
                        ) : (
                          <div className={styles.logoInitial}>{kit.brand_kit_name.charAt(0)}</div>
                        )}
                      </div>
                      <div className={styles.kitText}>
                        <h4>{kit.brand_kit_name}</h4>
                        <p>{kit.tone}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(kit.id); }} 
                      className={styles.editBtn}
                    >
                      Edit Identity
                    </button>
                  </div>
                ) : type === 'new' ? (
                  <div className={styles.plusContent} onClick={() => handleCreateNew()}>
                    <div className={styles.plusCircle}>
                      <Plus size={32} />
                    </div>
                    <p>Setup New Brand Kit</p>
                  </div>
                ) : type === 'locked' ? (
                  <div className={styles.lockedContent}>
                    <p>Upgrade your plan to unlock more brand kits.</p>
                    <button onClick={() => window.location.href = '/pricing?from=dashboard'} className={styles.upgradeBtn}>
                      Upgrade Plan
                    </button>
                  </div>
                ) : (
                  <div className={styles.emptyContent}>
                    <p>Available slot for a new identity.</p>
                    <button onClick={() => handleCreateNew()} className={styles.createBtn}>
                      <Plus size={16} /> Setup
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedKit && (
        <div className={styles.fullPreviewSection}>
          <div className={styles.previewHeaderRow}>
            <h2 className={styles.sectionTitle}>Detailed Preview: {selectedKit.brand_kit_name}</h2>
          </div>
          <BrandKitCard 
            brandKit={selectedKit} 
            onEdit={() => handleEdit(selectedKit.id)} 
          />
        </div>
      )}
    </div>
  );
}
