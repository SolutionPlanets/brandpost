'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBrand } from '@/contexts/BrandContext';
import { ArrowLeft, CreditCard, Receipt, AlertTriangle, CheckCircle2 } from 'lucide-react';
import styles from '../mock-checkout/MockBilling.module.css';

const planLabelMap: Record<string, string> = {
  solo: 'Solo Starter',
  smb: 'SMB Growth',
  agency: 'Agency Pro',
  franchise: 'Franchise'
};

const planPriceMap: Record<string, string> = {
  solo: '$29 / mo',
  smb: '$59 / mo',
  agency: '$149 / mo',
  franchise: '$399 / mo'
};

function MockPortalContent() {
  const router = useRouter();
  const { planId, refreshBrandData } = useBrand();
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const currentPlanLabel = planLabelMap[planId.toLowerCase()] || planId;
  const currentPlanPrice = planPriceMap[planId.toLowerCase()] || '';

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your current subscription? Your account will be downgraded to the Solo plan.')) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/billing/mock-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId: 'solo' })
      });

      if (!res.ok) {
        throw new Error('Failed to cancel subscription.');
      }

      localStorage.removeItem('brandpost_user_data');
      await refreshBrandData();

      setSuccessMsg('Subscription successfully cancelled! Your plan has been reset to Solo Starter.');
      setTimeout(() => {
        router.push('/dashboard/settings');
      }, 2500);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to cancel subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgradeClick = () => {
    router.push('/pricing?from=dashboard');
  };

  return (
    <div className={styles.container}>
      <button onClick={() => router.push('/dashboard/settings')} className={styles.backLink}>
        <ArrowLeft size={20} /> Back to Settings
      </button>

      <div className={styles.portalCard}>
        <div className={styles.portalHeader}>
          <div>
            <h1 className={styles.portalTitle}>Billing & Subscription</h1>
            <p className={styles.portalSubtitle}>Manage your invoices, plans, and payments</p>
          </div>
          <span className={styles.currentPlanBadge}>
            Current Plan: {currentPlanLabel}
          </span>
        </div>

        {successMsg && (
          <div style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#047857',
            padding: '1rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.9rem',
            fontWeight: 600
          }}>
            <CheckCircle2 size={20} />
            <span>{successMsg}</span>
          </div>
        )}

        <div className={styles.portalGrid}>
          {/* Active Plan details & actions */}
          <div>
            <h2 className={styles.sectionTitle}>Subscription Details</h2>
            <div className={styles.actionCard}>
              <div>
                <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{currentPlanLabel}</strong>
                <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {planId === 'solo' ? 'Free tier access with basic features' : `Next billing date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`}
                </p>
              </div>

              {planId !== 'solo' && (
                <div style={{ color: '#0f172a', fontWeight: 700, fontSize: '1.25rem' }}>
                  {currentPlanPrice}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                {planId === 'solo' ? (
                  <button
                    onClick={handleUpgradeClick}
                    className={`${styles.actionButton} ${styles.actionBtnPrimary}`}
                  >
                    Upgrade Plan
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleUpgradeClick}
                      className={`${styles.actionButton} ${styles.actionBtnGray}`}
                      disabled={isLoading}
                    >
                      Change Plan
                    </button>
                    <button
                      onClick={handleCancelSubscription}
                      className={`${styles.actionButton} ${styles.actionBtnSecondary}`}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Cancel Subscription'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Invoices List */}
          <div>
            <h2 className={styles.sectionTitle}>Invoices History</h2>
            <div className={styles.invoiceList}>
              {planId === 'solo' ? (
                <p style={{ color: '#64748b', fontSize: '0.875rem', fontStyle: 'italic' }}>
                  No past transactions on the Solo Starter tier.
                </p>
              ) : (
                <>
                  <div className={styles.invoiceItem}>
                    <div>
                      <div className={styles.invoiceDate}>{new Date().toLocaleDateString()}</div>
                      <span className={styles.invoiceStatus}>Paid</span>
                    </div>
                    <div className={styles.invoiceAmount}>{currentPlanPrice}</div>
                  </div>
                  <div className={styles.invoiceItem}>
                    <div>
                      <div className={styles.invoiceDate}>{new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
                      <span className={styles.invoiceStatus}>Paid</span>
                    </div>
                    <div className={styles.invoiceAmount}>{currentPlanPrice}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MockPortalPage() {
  return (
    <Suspense fallback={<div className={styles.container}>Loading billing portal...</div>}>
      <MockPortalContent />
    </Suspense>
  );
}
