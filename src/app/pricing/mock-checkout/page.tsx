'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldCheck, CreditCard, ArrowLeft, Check, HelpCircle } from 'lucide-react';
import { useBrand, BrandProvider } from '@/contexts/BrandContext';
import styles from './MockBilling.module.css';

const STATIC_PLANS = [
  {
    id: 'solo',
    name: 'Solo Starter',
    usd_monthly: 29,
    usd_yearly: 276,
    inr_monthly: 2415,
    inr_yearly: 22984,
    features: [
      '1 Brand kit',
      '30 AI posts / month',
      '1 Team member',
      '12 Festive calendar events (major only)',
      'Scheduling queue',
      '5 Post templates'
    ]
  },
  {
    id: 'smb',
    name: 'SMB Growth',
    usd_monthly: 59,
    usd_yearly: 564,
    inr_monthly: 4912,
    inr_yearly: 46963,
    features: [
      '3 Brand kits',
      '100 AI posts / month',
      '3 Team members',
      'All 30+ Festive calendar events',
      'Scheduling queue',
      '20 Post templates'
    ]
  },
  {
    id: 'agency',
    name: 'Agency Pro',
    usd_monthly: 149,
    usd_yearly: 1428,
    inr_monthly: 12404,
    inr_yearly: 118900,
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
    usd_monthly: 399,
    usd_yearly: 3828,
    inr_monthly: 33218,
    inr_yearly: 318790,
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

function MockCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawPlanId = searchParams.get('planId') || 'solo';
  const period = searchParams.get('period') || 'monthly';
  const errorParam = searchParams.get('error');
  const { plans: dbPlans } = useBrand();

  const plan = (dbPlans && dbPlans.find((p: any) => p.id === rawPlanId.toLowerCase())) || STATIC_PLANS.find((p: any) => p.id === rawPlanId.toLowerCase()) || STATIC_PLANS[0];
  const planId = plan.id;
  const isYearly = period === 'yearly';

  const usdPrice = isYearly ? Number(plan.usd_yearly) : Number(plan.usd_monthly);
  const inrPrice = isYearly ? Number(plan.inr_yearly) : Number(plan.inr_monthly);

  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardType, setCardType] = useState<'generic' | 'visa' | 'mastercard' | 'amex'>('generic');
  const [isLoading, setIsLoading] = useState(false);

  // Format card number with spaces
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let formattedValue = '';
    
    // Determine card brand
    if (value.startsWith('4')) {
      setCardType('visa');
    } else if (value.startsWith('5')) {
      setCardType('mastercard');
    } else if (value.startsWith('34') || value.startsWith('37')) {
      setCardType('amex');
    } else {
      setCardType('generic');
    }

    // Limit length based on brand
    const maxLength = cardType === 'amex' ? 15 : 16;
    value = value.substring(0, maxLength);

    for (let i = 0; i < value.length; i++) {
      if (i > 0 && i % 4 === 0 && cardType !== 'amex') {
        formattedValue += ' ';
      } else if (cardType === 'amex' && (i === 4 || i === 10)) {
        formattedValue += ' ';
      }
      formattedValue += value[i];
    }
    setCardNumber(formattedValue);
  };

  // Format Expiry MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length > 4) value = value.substring(0, 4);
    
    if (value.length >= 2) {
      const month = parseInt(value.substring(0, 2), 10);
      if (month < 1) value = '01' + value.substring(2);
      if (month > 12) value = '12' + value.substring(2);
      value = value.substring(0, 2) + '/' + value.substring(2);
    }
    setExpiry(value);
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').substring(0, 4);
    setCvc(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName.trim() || cardNumber.length < 15 || expiry.length < 5 || cvc.length < 3) {
      alert('Please fill in all card details correctly.');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate network request delay (2s) to feel like real Stripe checkout
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const res = await fetch('/api/billing/mock-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: planId,
          billingPeriod: period,
          amount: usdPrice,
          currency: 'USD',
          phone_no: '',
          payment_source: 'stripe_mock_card'
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update plan.');
      }

      // Success! Clear local storage to force dynamic context updates
      localStorage.removeItem('brandpost_user_data');
      
      // Redirect to dashboard with success query param
      window.location.href = '/dashboard?payment_success=true';
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Payment confirmation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <button onClick={() => router.push('/pricing')} className={styles.backLink}>
        <ArrowLeft size={20} /> Back to Pricing
      </button>

      {errorParam && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fca5a5',
          color: '#b91c1c',
          padding: '1rem',
          borderRadius: '12px',
          marginBottom: '1rem',
          maxWidth: '900px',
          width: '100%',
          fontSize: '0.875rem',
          textAlign: 'center',
          fontWeight: 600
        }}>
          Real Stripe connection failed or keys are not configured. Switched to secure sandbox environment.
        </div>
      )}

      <div className={styles.checkoutCard}>
        {/* Left column: Summary */}
        <div className={styles.summarySection}>
          <div>
            <div className={styles.summaryTitle}>Order Summary</div>
            <div className={styles.planDetails}>
              <span className={styles.planName}>{plan.name}</span>
              <div className={styles.planPrice}>
                ${usdPrice}
                <span className={styles.priceSub}>
                  {isYearly ? ' / year' : ' / month'}
                </span>
              </div>
              <div style={{ color: '#059669', fontWeight: 600, fontSize: '1rem' }}>
                ₹{inrPrice.toLocaleString('en-IN')}{isYearly ? ' billed annually' : ' / month*'}
              </div>
            </div>
            
            <ul className={styles.featureList}>
              {plan.features.map((feature: any, i: number) => (
                <li key={i} className={styles.featureItem}>
                  <Check size={16} className={styles.featureIcon} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.securityBadge}>
            <ShieldCheck size={18} style={{ color: '#059669' }} />
            <span>Secure 256-bit SSL transaction</span>
          </div>
        </div>

        {/* Right column: Form */}
        <div className={styles.formSection}>
          <div>
            <div className={styles.formTitle}>Payment Details</div>
            
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Cardholder Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  className={styles.input}
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Card Number</label>
                <div className={styles.inputWrapper}>
                  <input
                    type="text"
                    required
                    placeholder="4242 4242 4242 4242"
                    className={styles.input}
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    disabled={isLoading}
                  />
                  <span className={styles.cardIcon}>
                    {cardType === 'visa' && <span style={{ color: '#1a1f71', fontWeight: 800 }}>VISA</span>}
                    {cardType === 'mastercard' && <span style={{ color: '#eb001b', fontWeight: 800 }}>MC</span>}
                    {cardType === 'amex' && <span style={{ color: '#007bc1', fontWeight: 800 }}>AMEX</span>}
                    {cardType === 'generic' && <CreditCard size={20} />}
                  </span>
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Expiration</label>
                  <input
                    type="text"
                    required
                    placeholder="MM/YY"
                    className={styles.input}
                    value={expiry}
                    onChange={handleExpiryChange}
                    disabled={isLoading}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>CVC</label>
                  <input
                    type="text"
                    required
                    placeholder="123"
                    className={styles.input}
                    value={cvc}
                    onChange={handleCvcChange}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={styles.payButton}
              >
                {isLoading ? (
                  <>
                    <div className={styles.spinner} />
                    Processing...
                  </>
                ) : (
                  `Pay & Upgrade`
                )}
              </button>
            </form>
          </div>

          <div className={styles.testCardInfo}>
            💡 <strong>Sandbox Testing Mode:</strong> Use any dummy inputs. E.g. card number <code>4242 4242 4242 4242</code>, expiry <code>12/28</code>, CVC <code>123</code> to complete payment.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MockCheckoutPage() {
  return (
    <Suspense fallback={<div className={styles.container}>Loading Checkout details...</div>}>
      <BrandProvider>
        <MockCheckoutContent />
      </BrandProvider>
    </Suspense>
  );
}
