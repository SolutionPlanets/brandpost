import OnboardingWizard from '@/components/OnboardingWizard';
import styles from './OnboardingPage.module.css';

export default function OnboardingPage() {
  return (
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
  );
}
