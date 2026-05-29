'use client';

import OnboardingWizard from '@/components/OnboardingWizard';
import { BrandProvider } from '@/contexts/BrandContext';
import styles from './OnboardingPage.module.css';

export default function OnboardingPage() {
  return (
    <BrandProvider>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>B</div>
            <span>BrandPost AI</span>
          </div>
        </header>
        
        <main>
          <OnboardingWizard />
        </main>
      </div>
    </BrandProvider>
  );
}
