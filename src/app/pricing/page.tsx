'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Check, X, ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';
import { getUSDToINRRate, formatINR, formatUSD } from '@/utils/currency';
import { createClient } from '@/utils/supabase/client';
import styles from './Pricing.module.css';

const plans = [
  {
    name: 'Solo Starter',
    target: 'Solo entrepreneur',
    usdMonthly: 29,
    usdYearly: 276,
    features: [
      '1 Brand kit',
      '30 AI posts / month',
      '1 Team member',
      '12 Festive calendar events (major only)',
      'Scheduling queue',
      '5 Post templates',
      'Standard reports'
    ]
  },
  {
    name: 'SMB Growth',
    target: 'Small business',
    usdMonthly: 59,
    usdYearly: 564,
    featured: true,
    features: [
      '3 Brand kits',
      '100 AI posts / month',
      '3 Team members',
      'All 30+ Festive calendar events',
      'Scheduling queue',
      '20 Post templates',
      'Standard reports'
    ]
  },
  {
    name: 'Agency Pro',
    target: 'Marketing agencies',
    usdMonthly: 149,
    usdYearly: 1428,
    features: [
      '15 Brand kits',
      'Unlimited AI posts',
      '10 Team members',
      'All 30+ Festive calendar events',
      'Scheduling queue + bulk',
      'Unlimited Post templates',
      'White-label reports'
    ]
  },
  {
    name: 'Franchise',
    target: 'Franchise brands',
    usdMonthly: 399,
    usdYearly: 3828,
    features: [
      'Unlimited Brand kits',
      'Unlimited AI posts',
      'Unlimited Team members',
      'All 30+ Festive calendar events',
      'Scheduling queue + bulk',
      'Unlimited Post templates',
      'White-label reports'
    ]
  }
];

const featureComparison = [
  { feature: 'Brand kits', solo: '1', smb: '3', agency: '15', franchise: 'Unlimited' },
  { feature: 'AI posts / month', solo: '30', smb: '100', agency: 'Unlimited', franchise: 'Unlimited' },
  { feature: 'Team members', solo: '1', smb: '3', agency: '10', franchise: 'Unlimited' },
  { feature: 'Festive calendar events', solo: '12 (major only)', smb: 'All 30+', agency: 'All 30+', franchise: 'All 30+' },
  { feature: 'Scheduling queue', solo: 'Yes', smb: 'Yes', agency: 'Yes + bulk', franchise: 'Yes + bulk' },
  { feature: 'Post templates', solo: '5', smb: '20', agency: 'Unlimited', franchise: 'Unlimited' },
  { feature: 'White-label reports', solo: 'No', smb: 'No', agency: 'Yes', franchise: 'Yes' },
];

function PricingPageContent() {
  const [isYearly, setIsYearly] = useState(false);
  const [inrRate, setInrRate] = useState(83.3);
  const searchParams = useSearchParams();
  const router = useRouter();
  const from = searchParams.get('from');
  const supabase = createClient();

  const handleBack = () => {
    if (from === 'home') {
      router.push('/');
    } else if (from === 'dashboard' || from === 'limit_reached') {
      router.push('/dashboard');
    } else if (from === 'brandkit') {
      router.push('/dashboard/brand-kit');
    } else {
      router.push('/dashboard');
    }
  };

  const handleUpgrade = async (planName: string) => {
    console.log('Upgrading to plan:', planName);
    const planId = planName.toLowerCase().split(' ')[0]; // 'solo', 'smb', 'agency', 'franchise'
    console.log('Target planId:', planId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, redirecting to login');
        router.push('/auth/login?from=pricing');
        return;
      }

      console.log('Updating user:', user.id, 'with plan:', planId);
      const { data, error } = await supabase
        .from('users')
        .update({ plan_id: planId })
        .eq('id', user.id)
        .select();

      if (error) {
        console.error('Update error:', error);
        alert('Error updating plan: ' + error.message);
      } else {
        console.log('Update success:', data);
        // Clear local storage to force a fresh data fetch on next dashboard load
        localStorage.removeItem('brandpost_user_data');
        alert(`Plan "${planName}" successfully applied! Redirecting back...`);
        
        // Get 'from' parameter
        const searchParams = new URLSearchParams(window.location.search);
        const fromParam = searchParams.get('from');
        
        if (fromParam === 'limit_reached' || fromParam === 'dashboard' || fromParam === 'home') {
          router.push('/dashboard');
        } else {
          router.push('/dashboard/brand-kit');
        }

        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (err) {
      console.error('Fatal upgrade error:', err);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  useEffect(() => {
    async function loadRate() {
      const rate = await getUSDToINRRate();
      setInrRate(rate);
    }
    loadRate();
  }, []);

  const calculateINR = (usd: number) => usd * inrRate;

  return (
    <div className={styles.container}>
      <button onClick={handleBack} className={styles.backLink}>
        <ArrowLeft size={20} /> Back to {from === 'home' ? 'Home' : 'Dashboard'}
      </button>

      <header className={styles.header}>
        <h1>Simple, Transparent Pricing</h1>
        <p>Choose the plan that's right for your business. All plans include our core AI engine.</p>
      </header>

      <div className={styles.billingToggle}>
        <span className={`${styles.toggleLabel} ${!isYearly ? styles.toggleLabelActive : ''}`}>Monthly</span>
        <div 
          className={`${styles.toggleSwitch} ${isYearly ? styles.toggleSwitchActive : ''}`}
          onClick={() => setIsYearly(!isYearly)}
        >
          <div className={`${styles.toggleKnob} ${isYearly ? styles.toggleKnobActive : ''}`} />
        </div>
        <span className={`${styles.toggleLabel} ${isYearly ? styles.toggleLabelActive : ''}`}>Yearly</span>
        {isYearly && <span className={styles.savings}>Save up to 20%</span>}
      </div>

      <div className={styles.pricingGrid}>
        {plans.map((plan) => {
          const usdPrice = isYearly ? plan.usdYearly : plan.usdMonthly;
          const inrPrice = calculateINR(usdPrice);
          const perMonthUSD = isYearly ? Math.floor(plan.usdYearly / 12) : plan.usdMonthly;
          const perMonthINR = calculateINR(perMonthUSD);

          return (
            <div key={plan.name} className={`${styles.planCard} ${plan.featured ? styles.featuredCard : ''}`}>
              {plan.featured && <div className={styles.badge}>Most Popular</div>}
              <div className={styles.planName}>{plan.name}</div>
              <div className={styles.targetUser}>{plan.target}</div>
              
              <div className={styles.priceContainer}>
                <div className={styles.priceMain}>
                  {isYearly ? (
                    <>
                      {formatUSD(plan.usdYearly)}
                      <span className={styles.priceBreakdown}>({formatUSD(perMonthUSD)}/mo)</span>
                    </>
                  ) : (
                    <>
                      {formatUSD(plan.usdMonthly)}
                      <span className={styles.pricePeriod}>/mo</span>
                    </>
                  )}
                </div>
                <div className={styles.priceSecondary}>
                  {isYearly ? formatINR(calculateINR(plan.usdYearly)) : `${formatINR(perMonthINR)} /mo*`}
                </div>
                {isYearly && (
                  <div className={styles.billingNote}>
                    Billed annually
                  </div>
                )}
              </div>

              <button 
                onClick={() => handleUpgrade(plan.name)}
                className={`${styles.ctaButton} ${styles.primaryCta}`}
              >
                Get Started
              </button>

              <div className={styles.featureTitle}>What's included:</div>
              <ul className={styles.featureList}>
                {plan.features.map((feature, i) => (
                  <li key={i} className={styles.featureItem}>
                    <Check size={18} className={styles.featureIcon} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <section className={styles.comparisonSection}>
        <h2 className={styles.comparisonTitle}>Compare Plan Limits</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.featureNameCol}>Feature</th>
              <th>Solo</th>
              <th>SMB</th>
              <th>Agency</th>
              <th>Franchise</th>
            </tr>
          </thead>
          <tbody>
            {featureComparison.map((row, index) => (
              <tr key={index}>
                <td className={styles.featureNameCol}>{row.feature}</td>
                <td>{row.solo === 'Yes' ? <Check className={styles.check} /> : row.solo === 'No' ? <X className={styles.cross} /> : row.solo}</td>
                <td>{row.smb === 'Yes' ? <Check className={styles.check} /> : row.smb === 'No' ? <X className={styles.cross} /> : row.smb}</td>
                <td>{row.agency === 'Yes' ? <Check className={styles.check} /> : row.agency === 'No' ? <X className={styles.cross} /> : row.agency}</td>
                <td>{row.franchise === 'Yes' ? <Check className={styles.check} /> : row.franchise === 'No' ? <X className={styles.cross} /> : row.franchise}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={styles.disclaimer}>
          *INR conversion based on live exchange rates (currently 1 USD = {inrRate.toFixed(2)} INR).
          Rate updated every 24 hours.
        </p>
      </section>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <PricingPageContent />
    </Suspense>
  );
}
