'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Check, X, ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';
import { getUSDToINRRate, formatINR, formatUSD } from '@/utils/currency';
import { createClient } from '@/utils/supabase/client';
import { useBrand } from '@/contexts/BrandContext';
import styles from './Pricing.module.css';

const STATIC_PLANS = [
  {
    id: 'solo',
    name: 'Solo Starter',
    target: 'Solo entrepreneur',
    usd_monthly: 29,
    usd_yearly: 276,
    inr_monthly: 2415,
    inr_yearly: 22984,
    post_limit: 30,
    brand_kit_limit: 1,
    team_members_limit: '1',
    festive_events: '12 (major only)',
    scheduling_queue: 'Yes',
    post_templates_limit: '5',
    white_label_reports: 'No',
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
    id: 'smb',
    name: 'SMB Growth',
    target: 'Small business',
    usd_monthly: 59,
    usd_yearly: 564,
    inr_monthly: 4912,
    inr_yearly: 46963,
    post_limit: 100,
    brand_kit_limit: 3,
    team_members_limit: '3',
    festive_events: 'All 30+',
    scheduling_queue: 'Yes',
    post_templates_limit: '20',
    white_label_reports: 'No',
    features: [
      '3 Brand kits',
      '100 AI posts / month',
      '3 Team members',
      'All 30+ Festive calendar events',
      'Scheduling queue',
      '20 Post templates',
      'Standard reports'
    ],
    is_featured: true
  },
  {
    id: 'agency',
    name: 'Agency Pro',
    target: 'Marketing agencies',
    usd_monthly: 149,
    usd_yearly: 1428,
    inr_monthly: 12404,
    inr_yearly: 118900,
    post_limit: 2147483647,
    brand_kit_limit: 15,
    team_members_limit: '10',
    festive_events: 'All 30+',
    scheduling_queue: 'Yes + bulk',
    post_templates_limit: 'Unlimited',
    white_label_reports: 'Yes',
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
    id: 'franchise',
    name: 'Franchise',
    target: 'Franchise brands',
    usd_monthly: 399,
    usd_yearly: 3828,
    inr_monthly: 33218,
    inr_yearly: 318790,
    post_limit: 2147483647,
    brand_kit_limit: 1000,
    team_members_limit: 'Unlimited',
    festive_events: 'All 30+',
    scheduling_queue: 'Yes + bulk',
    post_templates_limit: 'Unlimited',
    white_label_reports: 'Yes',
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

const comparisonFields = [
  { label: 'Brand kits', key: 'brand_kit_limit', format: (val: any) => val >= 1000 ? 'Unlimited' : String(val) },
  { label: 'AI posts / month', key: 'post_limit', format: (val: any) => val >= 10000 ? 'Unlimited' : String(val) },
  { label: 'Team members', key: 'team_members_limit' },
  { label: 'Festive calendar events', key: 'festive_events' },
  { label: 'Scheduling queue', key: 'scheduling_queue' },
  { label: 'Post templates', key: 'post_templates_limit' },
  { label: 'White-label reports', key: 'white_label_reports' },
];

function PricingPageContent() {
  const [isYearly, setIsYearly] = useState(false);
  const [inrRate, setInrRate] = useState(83.3);
  const searchParams = useSearchParams();
  const router = useRouter();
  const from = searchParams.get('from');
  const supabase = createClient();
  const { plans: dbPlans } = useBrand();

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

  const handleUpgrade = async (targetId: string) => {
    console.log('Upgrading to planId:', targetId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, redirecting to login');
        router.push(`/auth/login?from=pricing&planId=${targetId}&period=${isYearly ? 'yearly' : 'monthly'}`);
        return;
      }

      router.push(`/api/billing/checkout?planId=${targetId}&period=${isYearly ? 'yearly' : 'monthly'}`);
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

  // Filter out any trial configurations from standard card display
  const activePlans = dbPlans ? dbPlans.filter((p: any) => p.id !== 'trial') : [];
  const displayPlans = activePlans.length > 0 ? activePlans : STATIC_PLANS;

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
        {displayPlans.map((plan) => {
          const usdPrice = isYearly ? Number(plan.usd_yearly) : Number(plan.usd_monthly);
          const inrPrice = isYearly ? Number(plan.inr_yearly) : Number(plan.inr_monthly);
          const perMonthUSD = isYearly ? Math.floor(Number(plan.usd_yearly) / 12) : Number(plan.usd_monthly);
          const perMonthINR = isYearly ? Math.floor(Number(plan.inr_yearly) / 12) : Number(plan.inr_monthly);
          const planId = plan.id || plan.name.toLowerCase().split(' ')[0];

          return (
            <div key={plan.name} className={`${styles.planCard} ${plan.is_featured ? styles.featuredCard : ''}`}>
              {plan.is_featured && <div className={styles.badge}>Most Popular</div>}
              <div className={styles.planName}>{plan.name}</div>
              <div className={styles.targetUser}>{plan.target}</div>
              
              <div className={styles.priceContainer}>
                <div className={styles.priceMain}>
                  {isYearly ? (
                    <>
                      {formatUSD(usdPrice)}
                      <span className={styles.priceBreakdown}>({formatUSD(perMonthUSD)}/mo)</span>
                    </>
                  ) : (
                    <>
                      {formatUSD(usdPrice)}
                      <span className={styles.pricePeriod}>/mo</span>
                    </>
                  )}
                </div>
                <div className={styles.priceSecondary}>
                  {isYearly ? formatINR(inrPrice) : `${formatINR(inrPrice)} /mo*`}
                </div>
                {isYearly && (
                  <div className={styles.billingNote}>
                    Billed annually
                  </div>
                )}
              </div>

              <button 
                onClick={() => handleUpgrade(planId)}
                className={`${styles.ctaButton} ${styles.primaryCta}`}
              >
                Get Started
              </button>

              <div className={styles.featureTitle}>What's included:</div>
              <ul className={styles.featureList}>
                {plan.features.map((feature: string, i: number) => (
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
              {displayPlans.map((plan) => (
                <th key={plan.id || plan.name}>
                  {plan.name.replace(' Starter', '').replace(' Growth', '').replace(' Pro', '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonFields.map((field, index) => (
              <tr key={index}>
                <td className={styles.featureNameCol}>{field.label}</td>
                {displayPlans.map((plan) => {
                  const rawVal = plan[field.key];
                  const val = field.format ? field.format(rawVal) : rawVal;
                  return (
                    <td key={plan.id || plan.name}>
                      {val === 'Yes' ? (
                        <Check className={styles.check} />
                      ) : val === 'No' ? (
                        <X className={styles.cross} />
                      ) : (
                        val
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className={styles.disclaimer}>
          *Pricing is fixed in USD and INR. INR payments exclude 18% GST (calculated and added at checkout).
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

