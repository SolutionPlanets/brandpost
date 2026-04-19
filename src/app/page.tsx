import Link from 'next/link';
import { ArrowRight, Sparkles, BarChart3, Clock, Layout } from 'lucide-react';
import styles from './LandingPage.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>B</div>
          <span>BrandPost AI</span>
        </div>
        <div className={styles.navLinks}>
          <Link href="/login">Login</Link>
          <Link href="/onboarding" className={styles.cta}>Get Started Free</Link>
        </div>
      </nav>

      <main className={styles.hero}>
        <div className={styles.badge}><Sparkles size={14} /> AI-Powered Content Creation</div>
        <h1 className={styles.heroTitle}>
          Your Brand's Social Media,<br />
          <span>Automated by AI.</span>
        </h1>
        <p className={styles.heroSubtitle}>
          Create consistent, professional brand posts in seconds. Connect your brand kit, 
          let AI generate the content, and schedule everything in one click.
        </p>
        <div className={styles.heroActions}>
          <Link href="/onboarding" className={styles.mainCta}>
            Start Your Journey <ArrowRight size={20} />
          </Link>
          <button className={styles.secondaryCta}>Watch Demo</button>
        </div>

        <div className={styles.features}>
          <div className={styles.featureCard}>
            <Layout className={styles.featureIcon} />
            <h3>Brand Kit Builder</h3>
            <p>Maintain consistency with your logos, colors, and fonts.</p>
          </div>
          <div className={styles.featureCard}>
            <Sparkles className={styles.featureIcon} />
            <h3>AI Generation</h3>
            <p>Intelligent posts tailored to your brand's unique tone.</p>
          </div>
          <div className={styles.featureCard}>
            <Clock className={styles.featureIcon} />
            <h3>Smart Scheduler</h3>
            <p>Post to all your platforms at the optimal times.</p>
          </div>
          <div className={styles.featureCard}>
            <BarChart3 className={styles.featureIcon} />
            <h3>Deep Analytics</h3>
            <p>Track performance and grow your audience faster.</p>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>&copy; 2026 BrandPost AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
