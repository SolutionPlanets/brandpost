'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useBrand } from '@/contexts/BrandContext';
import { createClient } from '@/utils/supabase/client';
import { 
  QrCode, 
  CreditCard, 
  Building, 
  Wallet as WalletIcon, 
  HelpCircle, 
  X, 
  ChevronRight, 
  Smartphone, 
  Info,
  CheckCircle,
  Percent,
  Loader2,
  Mail
} from 'lucide-react';
import styles from './Razorpay.module.css';

const planMetadata: Record<string, {
  name: string;
  monthlyINR: number;
  yearlyINR: number;
}> = {
  solo: { name: 'Solo Starter', monthlyINR: 2415, yearlyINR: 22984 },
  smb: { name: 'SMB Growth', monthlyINR: 4912, yearlyINR: 46963 },
  agency: { name: 'Agency Pro', monthlyINR: 12404, yearlyINR: 118900 },
  franchise: { name: 'Franchise', monthlyINR: 33218, yearlyINR: 318790 }
};

type PaymentMethod = 'upi' | 'cards' | 'netbanking' | 'wallet';

function RazorpayCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { businessName } = useBrand();
  const supabase = createClient();

  const rawPlanId = searchParams.get('planId') || 'solo';
  const period = searchParams.get('period') || 'monthly';
  const planId = planMetadata[rawPlanId.toLowerCase()] ? rawPlanId.toLowerCase() : 'solo';
  const plan = planMetadata[planId];
  const isYearly = period === 'yearly';
  const inrPrice = isYearly ? plan.yearlyINR : plan.monthlyINR;

  const [isCheckingGateway, setIsCheckingGateway] = useState(true);
  const [useMockModal, setUseMockModal] = useState(true);
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>('upi');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // UPI Input states
  const [upiId, setUpiId] = useState('');
  const [upiError, setUpiError] = useState('');

  // User input contact states
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  
  // Card Inputs
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');



  // Dynamically load Razorpay standard script
  useEffect(() => {
    setIsCheckingGateway(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    // Fetch order to see if keys are active
    async function checkGateway() {
      try {
        const res = await fetch('/api/billing/razorpay/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId, period })
        });

        if (!res.ok) {
          throw new Error('Order creation api failed');
        }

        const data = await res.json();
        
        if (data.mock) {
          // If keys are missing, stay on the custom mock modal
          setUseMockModal(true);
          setIsCheckingGateway(false);
        } else {
          // Keys are present! Open real Razorpay script overlay
          setUseMockModal(false);
          setIsCheckingGateway(false);

          const { data: { user } } = await supabase.auth.getUser();

          const options = {
            key: data.key,
            amount: data.amount,
            currency: data.currency,
            name: 'BrandPost AI',
            description: `Upgrade to ${plan.name} (${period})`,
            order_id: data.id,
            handler: async function (response: any) {
              setLoading(true);
              try {
                const verifyRes = await fetch('/api/billing/razorpay/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                    planId: planId,
                    amount: inrPrice,
                    currency: 'INR',
                    phone_no: contactPhone,
                    payment_source: 'razorpay'
                  })
                });

                if (verifyRes.ok) {
                  localStorage.removeItem('brandpost_user_data');
                  window.location.href = '/dashboard?payment_success=true';
                } else {
                  throw new Error('Payment verification failed');
                }
              } catch (err) {
                alert('Verification failed. Contact support.');
                setLoading(false);
              }
            },
            prefill: {
              name: user?.user_metadata?.full_name || '',
              email: contactEmail || '',
              contact: contactPhone || ''
            },
            theme: {
              color: '#4f46e5'
            },
            modal: {
              ondismiss: function() {
                router.push('/pricing');
              }
            }
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        }
      } catch (err) {
        console.error('Razorpay init error:', err);
        // Fallback to beautiful mock modal in case of script load failures
        setUseMockModal(true);
        setIsCheckingGateway(false);
      }
    }

    // Short timeout to let script append finish
    setTimeout(checkGateway, 800);

    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) {}
    };
  }, [planId, period]);

  // Auto-format card number
  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').substring(0, 16);
    const matches = val.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNumber(parts.join(' '));
    } else {
      setCardNumber(val);
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 2) {
      val = val.substring(0, 2) + '/' + val.substring(2);
    }
    setExpiry(val);
  };



  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate Razorpay network processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update the plan in db
      const res = await fetch('/api/billing/mock-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId,
          billingPeriod: period,
          amount: inrPrice,
          currency: 'INR',
          phone_no: contactPhone,
          payment_source: 'razorpay_mock_card'
        })
      });

      if (!res.ok) {
        throw new Error('Database update failed');
      }

      localStorage.removeItem('brandpost_user_data');
      setSuccess(true);

      // Redirect to dashboard with success parameter
      setTimeout(() => {
        window.location.href = '/dashboard?payment_success=true';
      }, 2500);

    } catch (err) {
      console.error(err);
      alert('Payment processing failed. Please try again.');
      setLoading(false);
    }
  };

  const handleUPIPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiId.trim()) {
      setUpiError('Please enter a UPI ID');
      return;
    }
    
    // Check if the input is a valid UPI ID (e.g. username@bank)
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(upiId.trim())) {
      setUpiError('Please enter a valid UPI ID (e.g. username@upi)');
      return;
    }

    setUpiError('');
    setLoading(true);

    try {
      // Simulate verification & network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update the plan in database
      const res = await fetch('/api/billing/mock-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId,
          billingPeriod: period,
          amount: inrPrice,
          currency: 'INR',
          phone_no: contactPhone,
          payment_source: `razorpay_mock_upi (${upiId})`
        })
      });

      if (!res.ok) {
        throw new Error('Database update failed');
      }

      localStorage.removeItem('brandpost_user_data');
      setSuccess(true);

      // Redirect to dashboard with success parameter
      setTimeout(() => {
        window.location.href = '/dashboard?payment_success=true';
      }, 2500);

    } catch (err) {
      console.error(err);
      alert('Payment verification failed. Please try again.');
      setLoading(false);
    }
  };



  // Step 2: Checking Gateway / SDK loader state
  if (isCheckingGateway) {
    return (
      <div className={styles.loadingScreen}>
        <Loader2 className={styles.spinner} size={48} style={{ animation: 'spin 1s linear infinite', color: '#4f46e5' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155' }}>Initializing Razorpay Secure Checkout...</h3>
      </div>
    );
  }

  // Step 3: Waiting frame for real SDK overlay
  if (!useMockModal) {
    return (
      <div className={styles.loadingScreen}>
        <Loader2 className={styles.spinner} size={48} style={{ animation: 'spin 1s linear infinite', color: '#4f46e5' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155' }}>Payment Gateway Overlay Active</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Please complete the payment in the Razorpay secure popup window.</p>
        <button 
          onClick={() => router.push('/pricing')}
          style={{ marginTop: '1rem', padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.85rem', color: '#475569' }}
        >
          Cancel and Go Back
        </button>
      </div>
    );
  }

  // Step 4: Mock Modal Sandbox
  return (
    <div className={styles.container}>
      <div className={styles.modalOverlay}>
        {success ? (
          <div className={styles.successOverlay}>
            <div className={styles.successCircle}>
              <CheckCircle size={48} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>Payment Successful</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Transaction ID: <span style={{ fontWeight: 700 }}>pay_Mock{Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
            </p>
            <p style={{ color: '#4f46e5', fontSize: '0.85rem', fontWeight: 600 }}>Upgrading your workspace. Please wait...</p>
          </div>
        ) : (
          <>
            {/* Left Sidebar */}
            <div className={styles.leftSidebar}>
              <div>
                <div className={styles.brandHeader}>
                  <div className={styles.brandLogo}>
                    {businessName ? businessName.charAt(0).toUpperCase() : 'B'}
                  </div>
                  <span className={styles.brandName}>{businessName || 'BrandPost AI'}</span>
                </div>

                <div className={styles.priceCard}>
                  <span className={styles.priceLabel}>Price Summary</span>
                  <div className={styles.priceValue}>
                    ₹{inrPrice.toLocaleString('en-IN')}.00
                  </div>
                </div>

                <div className={styles.infoRow}>
                  <div className={styles.infoRowText}>
                    <Smartphone size={14} />
                    <span>Using as {contactPhone || contactEmail || 'Enter contact details...'}</span>
                  </div>
                  <ChevronRight size={14} />
                </div>

                <div className={styles.infoRow}>
                  <div className={styles.infoRowText}>
                    <Percent size={14} />
                    <span>Offers on UPI, SBI and Cards</span>
                  </div>
                  <ChevronRight size={14} />
                </div>
              </div>

              {/* Handcrafted Cricket SVG Graphic matching the screenshot */}
              <div className={styles.illustrationContainer}>
                <svg width="140" height="100" viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.cricketGraphic}>
                  {/* Grass / Ground */}
                  <ellipse cx="70" cy="85" rx="60" ry="12" fill="#7c3aed" opacity="0.3" />
                  <ellipse cx="70" cy="85" rx="48" ry="8" fill="#7c3aed" opacity="0.5" />
                  
                  {/* Shopping Bags */}
                  <g transform="translate(15, 38)">
                    {/* White Bag */}
                    <rect x="5" y="10" width="20" height="25" rx="2.5" fill="white" />
                    <path d="M9 10C9 6 12 4 15 4C18 4 21 6 21 10" stroke="white" strokeWidth="2" fill="none" />
                    {/* Teal Accent bag in front */}
                    <rect x="15" y="15" width="18" height="20" rx="2.5" fill="#7c3aed" />
                    <path d="M19 15C19 12 21 10 24 10C27 10 29 12 29 15" stroke="#7c3aed" strokeWidth="2" fill="none" />
                  </g>

                  {/* Wickets */}
                  <rect x="70" y="25" width="2.5" height="52" rx="1" fill="white" />
                  <rect x="77" y="25" width="2.5" height="52" rx="1" fill="white" />
                  <rect x="84" y="25" width="2.5" height="52" rx="1" fill="white" />
                  {/* Bails */}
                  <rect x="68" y="23" width="20.5" height="2" rx="0.8" fill="white" />

                  {/* Cricket Bat resting */}
                  <rect x="89" y="28" width="5" height="45" rx="1" transform="rotate(-15 89 28)" fill="white" />
                  <rect x="90" y="15" width="1.8" height="15" rx="0.5" transform="rotate(-15 90 15)" fill="#e2e8f0" />

                  {/* Cricket Ball */}
                  <circle cx="58" cy="80" r="4.5" fill="#f43f5e" />
                  <path d="M55.5 80C56.5 79.2 59.5 79.2 60.5 80" stroke="white" strokeWidth="0.8" fill="none" />
                </svg>
              </div>

              <div className={styles.securedLabel}>
                <span>Secured by</span>
                <span style={{ fontWeight: 800, letterSpacing: '-0.5px' }}>Razorpay</span>
              </div>
            </div>

            {/* Right Panel (Content area) */}
            <div className={styles.rightContent}>
              <div className={styles.rightHeader}>
                <span className={styles.rightHeaderTitle}>Payment Options</span>
                <div className={styles.headerIcons}>
                  <HelpCircle size={18} />
                  <X size={18} style={{ cursor: 'pointer' }} onClick={() => router.push('/pricing')} />
                </div>
              </div>

              {/* Contact Information Fields (User can type custom Phone & Email) */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '16px', backgroundColor: '#f8fafc' }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.formLabel}>Phone Number</label>
                  <input 
                    type="text" 
                    placeholder="Enter phone number"
                    className={styles.formInput}
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    style={{ height: '38px', boxSizing: 'border-box' }}
                  />
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.formLabel}>Email Address</label>
                  <input 
                    type="email" 
                    placeholder="Enter email address"
                    className={styles.formInput}
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    style={{ height: '38px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div className={styles.mainBody}>
                {/* Method selector list */}
                <div className={styles.methodsList}>
                  <div 
                    className={`${styles.methodItem} ${activeMethod === 'upi' ? styles.methodItemActive : ''}`}
                    onClick={() => setActiveMethod('upi')}
                  >
                    <span className={styles.methodTitle}>UPI</span>
                    <span className={styles.methodSubtitle}>
                      <span style={{ color: '#4f46e5', fontWeight: 700 }}>Upto ₹50 cashback</span>
                    </span>
                  </div>

                  <div 
                    className={`${styles.methodItem} ${activeMethod === 'cards' ? styles.methodItemActive : ''}`}
                    onClick={() => setActiveMethod('cards')}
                  >
                    <span className={styles.methodTitle}>Cards</span>
                    <span className={styles.methodSubtitle}>Get 5%* Reward Points</span>
                  </div>

                  <div 
                    className={`${styles.methodItem} ${activeMethod === 'netbanking' ? styles.methodItemActive : ''}`}
                    onClick={() => setActiveMethod('netbanking')}
                  >
                    <span className={styles.methodTitle}>Netbanking</span>
                    <span className={styles.methodSubtitle}>SBI, HDFC, ICICI, Axis</span>
                  </div>

                  <div 
                    className={`${styles.methodItem} ${activeMethod === 'wallet' ? styles.methodItemActive : ''}`}
                    onClick={() => setActiveMethod('wallet')}
                  >
                    <span className={styles.methodTitle}>Wallet</span>
                    <span className={styles.methodSubtitle}>Mobikwik, Freecharge</span>
                  </div>
                </div>

                {/* Selected Method Panel */}
                <div className={styles.detailsPanel}>
                  {activeMethod === 'upi' && (
                    <>
                      <div className={styles.sectionHeading}>UPI QR</div>
                      <div className={styles.offerBanner}>
                        <Info size={14} />
                        <span>Upto ₹50 cashback via CRED Pay</span>
                      </div>
                      
                      <div className={styles.qrContainer}>
                        <div className={styles.qrCodeWrapper}>
                          {/* SVG representation of a QR Code for premium details */}
                          <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="100" height="100" fill="white" />
                            {/* Top Left Finder Pattern */}
                            <rect x="10" y="10" width="30" height="30" fill="black" />
                            <rect x="15" y="15" width="20" height="20" fill="white" />
                            <rect x="20" y="20" width="10" height="10" fill="black" />
                            {/* Top Right Finder Pattern */}
                            <rect x="60" y="10" width="30" height="30" fill="black" />
                            <rect x="65" y="15" width="20" height="20" fill="white" />
                            <rect x="70" y="20" width="10" height="10" fill="black" />
                            {/* Bottom Left Finder Pattern */}
                            <rect x="10" y="60" width="30" height="30" fill="black" />
                            <rect x="15" y="65" width="20" height="20" fill="white" />
                            <rect x="20" y="70" width="10" height="10" fill="black" />
                            {/* Alignment pattern */}
                            <rect x="70" y="70" width="15" height="15" fill="black" />
                            <rect x="75" y="75" width="5" height="5" fill="white" />
                            {/* Random dummy modules */}
                            <rect x="45" y="15" width="5" height="15" fill="black" />
                            <rect x="45" y="35" width="10" height="5" fill="black" />
                            <rect x="15" y="45" width="15" height="5" fill="black" />
                            <rect x="35" y="45" width="5" height="15" fill="black" />
                            <rect x="45" y="45" width="25" height="5" fill="black" />
                            <rect x="45" y="55" width="5" height="10" fill="black" />
                            <rect x="55" y="60" width="10" height="5" fill="black" />
                            <rect x="60" y="45" width="5" height="15" fill="black" />
                            <rect x="80" y="45" width="10" height="15" fill="black" />
                            <rect x="15" y="80" width="20" height="5" fill="black" />
                            <rect x="45" y="75" width="15" height="15" fill="black" />
                          </svg>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Scan QR using any UPI App</span>
                        
                        <div className={styles.appIconsRow}>
                          <div className={styles.appIcon} style={{ background: '#e0f2fe', color: '#0284c7' }}>GPay</div>
                          <div className={styles.appIcon} style={{ background: '#f5f3ff', color: '#7c3aed' }}>PPe</div>
                          <div className={styles.appIcon} style={{ background: '#e0f2fe', color: '#0369a1' }}>Paytm</div>
                          <div className={styles.appIcon} style={{ background: '#ecfdf5', color: '#059669' }}>BHIM</div>
                        </div>
                      </div>

                      {/* Pay via UPI ID Input Section */}
                      <div className={styles.upiIdSection}>
                        <div className={styles.upiIdDivider}>
                          <span>OR PAY VIA UPI ID</span>
                        </div>
                        
                        <div className={styles.upiInputWrapper}>
                          <input 
                            type="text" 
                            className={styles.upiInput}
                            placeholder="Enter UPI ID (e.g. 9876543210@ybl)"
                            value={upiId}
                            onChange={(e) => {
                              setUpiId(e.target.value);
                              if (upiError) setUpiError('');
                            }}
                            disabled={loading}
                          />
                          <button 
                            className={styles.upiSubmitBtn}
                            onClick={handleUPIPay}
                            disabled={loading}
                          >
                            {loading ? 'Checking...' : 'Pay Now'}
                          </button>
                        </div>
                        {upiError && (
                          <div className={styles.upiErrorLabel}>{upiError}</div>
                        )}
                      </div>
                    </>
                  )}

                  {activeMethod === 'cards' && (
                    <form onSubmit={handlePay} className={styles.cardForm}>
                      <div className={styles.sectionHeading}>Pay with Cards</div>
                      
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Card Number</label>
                        <input 
                          type="text" 
                          placeholder="4242 4242 4242 4242"
                          className={styles.formInput}
                          value={cardNumber}
                          onChange={handleCardChange}
                          required
                          disabled={loading}
                        />
                      </div>

                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>Expiry (MM/YY)</label>
                          <input 
                            type="text" 
                            placeholder="12/28"
                            className={styles.formInput}
                            value={expiry}
                            onChange={handleExpiryChange}
                            required
                            disabled={loading}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>CVV</label>
                          <input 
                            type="password" 
                            placeholder="123"
                            className={styles.formInput}
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                            required
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Cardholder Name</label>
                        <input 
                          type="text" 
                          placeholder="Name on card"
                          className={styles.formInput}
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          required
                          disabled={loading}
                        />
                      </div>
                    </form>
                  )}

                  {activeMethod === 'netbanking' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className={styles.sectionHeading}>Popular Banks</div>
                      {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank'].map((bank, idx) => (
                        <label key={idx} className={styles.radioLabel}>
                          <input type="radio" name="bank" defaultChecked={idx === 0} />
                          <span>{bank}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {activeMethod === 'wallet' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className={styles.sectionHeading}>Select Wallet</div>
                      {['Mobikwik', 'Freecharge', 'JioMoney', 'PhonePe Wallet'].map((wallet, idx) => (
                        <label key={idx} className={styles.radioLabel}>
                          <input type="radio" name="wallet" defaultChecked={idx === 0} />
                          <span>{wallet}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment execution footer */}
              <div className={styles.footerArea}>
                <button 
                  className={styles.payButton}
                  onClick={handlePay}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className={styles.spinner} />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay ₹{inrPrice.toLocaleString('en-IN')}.00</span>
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function RazorpayCheckoutPage() {
  return (
    <Suspense fallback={<div className={styles.loadingScreen}>Loading Razorpay Secure Checkout...</div>}>
      <RazorpayCheckoutContent />
    </Suspense>
  );
}
