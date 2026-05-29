'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBrand, BrandProvider } from '@/contexts/BrandContext';
import { ArrowLeft, CreditCard, Receipt, AlertTriangle, CheckCircle2, BadgePercent, CalendarRange, X, FileText, Download, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import styles from './MockPortal.module.css';

function MockPortalContent() {
  const router = useRouter();
  const { planId, plans, refreshBrandData, trialEndsAt } = useBrand();
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Database states
  const [invoices, setInvoices] = useState<any[]>([]);
  const [latestSub, setLatestSub] = useState<any>(null);
  const [loadingDb, setLoadingDb] = useState(true);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadInvoice = async (invoiceId: string) => {
    const node = document.getElementById('invoice-capture-box');
    if (!node) return;
    
    setIsDownloading(true);
    try {
      const { toPng } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');

      // Generate PNG image of the invoice box with high quality
      const dataUrl = await toPng(node, {
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: node.offsetWidth + 'px',
          height: node.offsetHeight + 'px'
        },
        pixelRatio: 2 // Improve quality
      });

      // Create PDF in A4 format
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 15; // 15mm margin
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (node.offsetHeight * imgWidth) / node.offsetWidth;
      
      pdf.addImage(dataUrl, 'PNG', margin, margin, imgWidth, imgHeight);
      pdf.save(`invoice_${invoiceId}.pdf`);
    } catch (err) {
      console.error('Error generating PDF invoice:', err);
      alert('Failed to download invoice. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const getTaxBreakdown = (inv: any) => {
    const total = Number(inv.amount);
    const planIdLower = inv.plan_id?.toLowerCase() || '';
    
    let gst = 0;
    let base = total;
    let roundoff = 0;
    
    if (planIdLower !== 'trial' && total > 0) {
      base = Math.ceil(total / 1.18);
      gst = Number((base * 0.18).toFixed(2));
      roundoff = Number((total - (base + gst)).toFixed(2));
    }
    
    return {
      base,
      gst,
      roundoff,
      total
    };
  };

  const plan = (plans && plans.find((p: any) => p.id === planId.toLowerCase())) || { name: planId, usd_monthly: 0, usd_yearly: 0, inr_monthly: 0, inr_yearly: 0 };
  const currentPlanLabel = plan.name || planId;
  const isPaidPlan = trialEndsAt === null;
  const currentPlanPrice = (!isPaidPlan)
    ? 'Free'
    : (plan.inr_monthly 
        ? `₹${Number(plan.inr_monthly).toLocaleString('en-IN')} / mo` 
        : `$${plan.usd_monthly} / mo`);

  // Format date helper to return dd/mm/yy
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).substring(2); // Last 2 digits e.g. 26
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (amount: number, currency: string) => {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    const symbol = currency.toUpperCase() === 'INR' ? '₹' : '$';
    const num = Number(absAmount);
    const hasDecimals = num % 1 !== 0;
    const integerPart = Math.floor(num).toLocaleString(currency.toUpperCase() === 'INR' ? 'en-IN' : 'en-US');
    let formatted = '';
    if (hasDecimals) {
      const decimalPart = num.toFixed(2).split('.')[1];
      formatted = `${symbol}${integerPart}.${decimalPart}`;
    } else {
      formatted = `${symbol}${integerPart}`;
    }
    return isNegative ? `-${formatted}` : formatted;
  };

  useEffect(() => {
    async function loadSubscriptionData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Fetch all completed payments
          const { data: subs } = await supabase
            .from('subscription')
            .select('*')
            .eq('user_id', user.id)
            .eq('payment_status', 'completed')
            .order('created_at', { ascending: false });
          
          if (subs && subs.length > 0) {
            setInvoices(subs);
            setLatestSub(subs[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching subscription history:', err);
      } finally {
        setLoadingDb(false);
      }
    }
    loadSubscriptionData();
  }, []);

  const handleUpgradeClick = () => {
    router.push('/pricing?from=dashboard');
  };

  const getDisplayPrice = () => {
    if (latestSub) {
      const isYearly = latestSub.plan_name?.toLowerCase().includes('yearly') || 
                       (latestSub.order_id && latestSub.order_id.toLowerCase().includes('yearly')) ||
                       (latestSub.receipt && latestSub.receipt.toLowerCase().includes('yearly'));
      const currency = latestSub.currency || 'INR';
      const basePrice = currency.toUpperCase() === 'INR'
        ? (isYearly ? Number(plan.inr_yearly) : Number(plan.inr_monthly))
        : (isYearly ? Number(plan.usd_yearly) : Number(plan.usd_monthly));
      return `${formatCurrency(basePrice, currency)} / ${isYearly ? 'yr' : 'mo'}`;
    }
    return currentPlanPrice;
  };

  const getNextBillingDate = () => {
    if (!latestSub) {
      return formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    }
    const createdDate = new Date(latestSub.created_at);
    const isYearly = latestSub.plan_name?.toLowerCase().includes('yearly') || 
                     (latestSub.order_id && latestSub.order_id.toLowerCase().includes('yearly')) ||
                     (latestSub.receipt && latestSub.receipt.toLowerCase().includes('yearly'));
    createdDate.setDate(createdDate.getDate() + (isYearly ? 365 : 30));
    return formatDate(createdDate);
  };

  if (loadingDb) {
    return (
      <div className={styles.container}>
        <div className={styles.portalCard} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <p style={{ color: '#64748b', fontWeight: 600 }}>Loading subscription records...</p>
        </div>
      </div>
    );
  }

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
            <h2 className={styles.sectionTitle}>
              <CreditCard size={18} style={{ color: '#4f46e5' }} /> Subscription Details
            </h2>
            <div className={styles.actionCard}>
              <div>
                <strong style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 800 }}>{currentPlanLabel}</strong>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CalendarRange size={14} style={{ flexShrink: 0 }} />
                  {!isPaidPlan ? 'Free tier access with basic features' : `Next billing date: ${getNextBillingDate()}`}
                </p>
              </div>

              {isPaidPlan && (
                <div style={{ color: '#4f46e5', fontWeight: 850, fontSize: '1.5rem', marginTop: '0.5rem' }}>
                  {getDisplayPrice()}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                {!isPaidPlan ? (
                  <button
                    onClick={handleUpgradeClick}
                    className={`${styles.actionButton} ${styles.actionBtnPrimary}`}
                  >
                    Upgrade Plan
                  </button>
                ) : (
                  <button
                    onClick={handleUpgradeClick}
                    className={`${styles.actionButton} ${styles.actionBtnGray}`}
                    disabled={isLoading}
                  >
                    Change Plan
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Invoices List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
                <Receipt size={18} style={{ color: '#4f46e5' }} /> Invoices History
              </h2>
              {invoices.length > 0 && (
                <button 
                  onClick={() => setIsHistoryModalOpen(true)} 
                  className={styles.historyBtn}
                >
                  Payment History
                </button>
              )}
            </div>
            <div className={styles.invoiceList}>
              {invoices.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.875rem', fontStyle: 'italic', padding: '1.5rem', background: '#f8fafc', borderRadius: '16px', border: '1.5px dashed #e2e8f0', textAlign: 'center' }}>
                  No past transactions found.
                </p>
              ) : (
                invoices.slice(0, 2).map((inv) => (
                  <div key={inv.id} className={styles.latestInvoiceCard}>
                    <div className={styles.latestInvoiceLeft}>
                      <div className={styles.latestInvoiceIconContainer}>
                        <Receipt size={20} style={{ color: '#4f46e5' }} />
                      </div>
                      <div>
                        <div className={styles.latestInvoiceTitle}>
                          {inv.plan_name || inv.plan_id} Plan
                        </div>
                        <div className={styles.latestInvoiceDate}>
                          Paid on {formatDate(new Date(inv.created_at))}
                        </div>
                        <div className={styles.latestInvoiceDate} style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                          Amount with GST
                        </div>
                      </div>
                    </div>
                    <div className={styles.latestInvoiceRight}>
                      <div className={styles.latestInvoiceAmount} style={{ marginRight: '8px' }}>
                        {formatCurrency(getTaxBreakdown(inv).total, inv.currency)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment History Modal */}
      {isHistoryModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsHistoryModalOpen(false)}>
          <div className={styles.modalContent} style={{ maxWidth: '650px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Payment History</h3>
              <button className={styles.modalCloseBtn} onClick={() => setIsHistoryModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.historyTable}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td>{formatDate(new Date(inv.created_at))}</td>
                        <td>
                          <span className={styles.planNameCell}>{inv.plan_name || inv.plan_id}</span>
                        </td>
                        <td>
                          <span className={styles.statusBadge}>Paid</span>
                        </td>
                        <td className={styles.amountCell}>{formatCurrency(getTaxBreakdown(inv).total, inv.currency)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            onClick={() => setSelectedInvoice(inv)} 
                            className={styles.actionInvoiceBtn}
                          >
                            <FileText size={14} />
                            <span>Invoice</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.closeModalBtn} onClick={() => setIsHistoryModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      {selectedInvoice && (() => {
        const { base, gst, roundoff, total } = getTaxBreakdown(selectedInvoice);
        const invoiceIdStr = selectedInvoice.order_id 
          ? selectedInvoice.order_id 
          : `INV-2026-${selectedInvoice.id.toString().substring(0, 8).toUpperCase()}`;
        return (
          <div className={styles.modalBackdrop} onClick={() => setSelectedInvoice(null)}>
            <div className={styles.modalContent} style={{ maxWidth: '750px', maxHeight: '95vh' }} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Tax Invoice</h3>
                <button className={styles.modalCloseBtn} onClick={() => setSelectedInvoice(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.invoiceBox} id="invoice-capture-box">
                  <div className={styles.invoiceHeader}>
                    <div className={styles.invoiceLogo}>Brandpost</div>
                    <div className={styles.invoiceMeta}>
                      <div className={styles.invoiceId}>Invoice #: {invoiceIdStr}</div>
                      <div>Date: {formatDate(new Date(selectedInvoice.created_at))}</div>
                      <div>Status: Paid</div>
                    </div>
                  </div>

                  <div className={styles.invoiceDetails}>
                    <div className={styles.detailsBlock}>
                      <h4>Billed From</h4>
                      <p><strong>Brandpost Inc.</strong></p>
                      <p>123 Tech Park, Suite 500</p>
                      <p>Bangalore, KA, India</p>
                      <p>support@brandpost.com</p>
                    </div>
                    <div className={styles.detailsBlock}>
                      <h4>Billed To</h4>
                      <p><strong>Customer</strong></p>
                      {selectedInvoice.mail && <p>Email: {selectedInvoice.mail}</p>}
                      {selectedInvoice.phone_no && <p>Phone: {selectedInvoice.phone_no}</p>}
                      {selectedInvoice.workspace_id && <p style={{ fontSize: '0.75rem', color: '#64748b', wordBreak: 'break-all' }}>Workspace: {selectedInvoice.workspace_id}</p>}
                    </div>
                  </div>

                  <table className={styles.invoiceTable}>
                    <thead>
                      <tr>
                        <th style={{ width: '60%' }}>Description</th>
                        <th style={{ textAlign: 'right' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <strong>{selectedInvoice.plan_name || selectedInvoice.plan_id} Plan Subscription</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                            Billing period: Monthly (Recurring)
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>1</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(base, selectedInvoice.currency)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <table className={styles.invoiceSummary}>
                    <tbody>
                      <tr>
                        <td style={{ width: '60%' }}></td>
                        <td style={{ color: '#64748b' }}>Subtotal</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(base, selectedInvoice.currency)}</td>
                      </tr>
                      {gst > 0 && (
                        <tr>
                          <td></td>
                          <td style={{ color: '#64748b' }}>GST (18%)</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(gst, selectedInvoice.currency)}</td>
                        </tr>
                      )}
                      {roundoff !== 0 && (
                        <tr>
                          <td></td>
                          <td style={{ color: '#64748b' }}>Roundoff</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(roundoff, selectedInvoice.currency)}</td>
                        </tr>
                      )}
                      <tr className={styles.totalRow}>
                        <td></td>
                        <td>Total Paid</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(total, selectedInvoice.currency)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button 
                  className={styles.printBtn} 
                  onClick={() => handleDownloadInvoice(invoiceIdStr)} 
                  disabled={isDownloading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {isDownloading ? (
                    <Loader2 size={16} className={styles.spinner} />
                  ) : (
                    <Download size={16} />
                  )}
                  <span>{isDownloading ? 'Downloading...' : 'Download Invoice'}</span>
                </button>
                <button className={styles.closeModalBtn} onClick={() => setSelectedInvoice(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function MockPortalPage() {
  return (
    <Suspense fallback={<div className={styles.container}>Loading billing portal...</div>}>
      <BrandProvider>
        <MockPortalContent />
      </BrandProvider>
    </Suspense>
  );
}
