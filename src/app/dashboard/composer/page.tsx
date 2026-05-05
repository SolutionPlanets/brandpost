'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  PartyPopper,
  Tag,
  BookOpen,
  Layers,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Share2,
  Check,
  Loader2,
  Eye,
  Edit3,
  ToggleLeft,
  ToggleRight,
  Download,
  CalendarClock,
  Send,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import { useBrand } from '@/contexts/BrandContext';
import styles from './Composer.module.css';

// ── Types ────────────────────────────────────────────────────────────
type ContentType = 'festive' | 'offer' | 'informational' | 'general';
type Platform = 'facebook' | 'instagram' | 'both';

interface ComposerForm {
  contentType: ContentType | null;
  templateId: string | null;
  topic: string;
  brandKit: string;
  platform: Platform;
  extraInstructions: string;
}

interface GeneratedContent {
  captions: string[];
  images: string[];
}

// ── Content Type Cards ───────────────────────────────────────────────
const CONTENT_TYPES = [
  { type: 'festive' as ContentType, label: 'Festive', icon: PartyPopper, color: '#f59e0b', desc: 'Celebrate festivals & occasions' },
  { type: 'offer' as ContentType, label: 'Offer / Sale', icon: Tag, color: '#10b981', desc: 'Promotions & discounts' },
  { type: 'informational' as ContentType, label: 'Informational', icon: BookOpen, color: '#3b82f6', desc: 'Educate & inform your audience' },
  { type: 'general' as ContentType, label: 'General', icon: Layers, color: '#8b5cf6', desc: 'Brand awareness & engagement' },
];

const TEMPLATES: Record<ContentType, { id: string; name: string; image: string }[]> = {
  festive: [
    { id: 'fest-1', name: 'Traditional Glow', image: '/templates/festive/traditional.png' },
    { id: 'fest-2', name: 'Modern Minimal', image: '/templates/festive/modern.png' },
    { id: 'fest-3', name: 'Vibrant Celebration', image: '/templates/festive/vibrant.png' },
    { id: 'fest-4', name: 'Elegant Script', image: '/templates/festive/elegant.png' },
  ],
  offer: [
    { id: 'off-1', name: 'Big Bold Sale', image: '/templates/offer/bold.png' },
    { id: 'off-2', name: 'Flash Deal', image: '/templates/offer/flash.png' },
    { id: 'off-3', name: 'Product Spotlight', image: '/templates/offer/minimal.png' },
    { id: 'off-4', name: 'Discount Badge', image: '/templates/offer/badge.png' },
  ],
  informational: [
    { id: 'info-1', name: 'Expert Tips', image: '/templates/info/tips.png' },
    { id: 'info-2', name: 'Did You Know?', image: '/templates/info/didyouknow.png' },
    { id: 'info-3', name: 'Step-by-Step', image: '/templates/info/stepbystep.png' },
    { id: 'info-4', name: 'Clean Listicle', image: '/templates/info/listicle.png' },
  ],
  general: [
    { id: 'gen-1', name: 'Daily Quote', image: '/templates/gen/quote.png' },
    { id: 'gen-2', name: 'Behind the Scenes', image: '/templates/gen/lifestyle.png' },
    { id: 'gen-3', name: 'Question/Poll', image: '/templates/gen/bts.png' },
    { id: 'gen-4', name: 'Lifestyle Focus', image: '/templates/gen/question.png' },
  ],
};

const STEP_LABELS = ['Content Type', 'Template', 'Details', 'AI Generation', 'Preview & Edit'];

// ── Component ────────────────────────────────────────────────────────
export default function ComposerPage() {
  const searchParams = useSearchParams();
  const { brandKitName, businessName } = useBrand();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationState, setGenerationState] = useState<'generating' | 'paused' | 'stopped'>('generating');
  const generationStateRef = useRef<'generating' | 'paused' | 'stopped'>('generating');
  const [selectedCaption, setSelectedCaption] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [editedCaption, setEditedCaption] = useState('');
  const [showLogoOverlay, setShowLogoOverlay] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isImmediate, setIsImmediate] = useState(false);

  const [form, setForm] = useState<ComposerForm>({
    contentType: null,
    templateId: null,
    topic: '',
    brandKit: 'main-brand',
    platform: 'both',
    extraInstructions: '',
  });

  const [generated, setGenerated] = useState<GeneratedContent | null>(null);

  // Pre-fill from calendar link
  useEffect(() => {
    const occasion = searchParams.get('occasion');
    const type = searchParams.get('type');
    if (occasion) setForm((prev) => ({ ...prev, topic: occasion }));
    if (type && ['festive', 'offer', 'informational', 'general'].includes(type)) {
      setForm((prev) => ({ ...prev, contentType: type as ContentType }));
      if (occasion) setStep(2);
    }
  }, [searchParams]);

  const canProceedStep2 = form.contentType !== null;
  const canProceedStep3 = form.templateId !== null || form.templateId === 'none';
  const canProceedStep4 = form.topic.trim().length > 0;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationState('generating');
    generationStateRef.current = 'generating';

    // Simulated AI generation with pause/stop support
    for (let i = 0; i < 30; i++) {
      if (generationStateRef.current === 'stopped') {
        setIsGenerating(false);
        return;
      }
      while (generationStateRef.current === 'paused') {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (generationStateRef.current === 'stopped') {
      setIsGenerating(false);
      return;
    }

    setGenerated({
      captions: [
        `🎉 ${form.topic} is here! Celebrate with us and make this occasion unforgettable. Our brand brings you the best in quality and style. #${form.topic.replace(/\s/g, '')} #BrandPost`,
        `✨ This ${form.topic}, let your brand shine brighter than ever. Discover our exclusive collection curated just for you. Tap the link in bio! #Celebrate #${form.topic.replace(/\s/g, '')}`,
        `🌟 Wishing everyone a wonderful ${form.topic}! At our brand, we believe in celebrating every moment with style and grace. Share your celebrations with us! #${form.topic.replace(/\s/g, '')} #Joy`,
      ],
      images: [
        '/api/placeholder/1024/1024',
        '/api/placeholder/1024/1024',
      ],
    });
    setSelectedCaption(0);
    setSelectedImage(0);
    setIsGenerating(false);
    setStep(5);
  };

  const formatDateToDDMMYY = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y.slice(-2)}`;
  };

  useEffect(() => {
    if (generated && generated.captions.length > 0) {
      setEditedCaption(generated.captions[selectedCaption]);
    }
  }, [selectedCaption, generated]);

  const renderStepIndicator = () => (
    <div className={styles.stepper}>
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const isActive = step === stepNum;
        const isDone = step > stepNum;
        return (
          <div key={i} className={styles.stepperItem}>
            <div className={`${styles.stepCircle} ${isActive ? styles.stepActive : ''} ${isDone ? styles.stepDone : ''}`}>
              {isDone ? <Check size={14} /> : stepNum}
            </div>
            <span className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ''}`}>{label}</span>
            {i < STEP_LABELS.length - 1 && <div className={`${styles.stepLine} ${isDone ? styles.stepLineDone : ''}`} />}
          </div>
        );
      })}
    </div>
  );

  // ── Step 1: Content Type Selector ──────────────────────────────────
  const renderStep1 = () => (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>What type of content?</h2>
      <p className={styles.stepDesc}>Choose the category that best fits your post.</p>
      <div className={styles.typeGrid}>
        {CONTENT_TYPES.map((ct) => {
          const Icon = ct.icon;
          const isSelected = form.contentType === ct.type;
          return (
            <button
              key={ct.type}
              className={`${styles.typeCard} ${isSelected ? styles.typeCardActive : ''}`}
              onClick={() => setForm({ ...form, contentType: ct.type })}
              style={{ '--type-color': ct.color } as React.CSSProperties}
            >
              <div className={styles.typeIconWrap}>
                <Icon size={28} />
              </div>
              <h3>{ct.label}</h3>
              <p>{ct.desc}</p>
              {isSelected && <div className={styles.typeCheck}><Check size={16} /></div>}
            </button>
          );
        })}
      </div>
    </div>
  );

  // ── Step 2: Template Selector ──────────────────────────────────────
  const renderStep2 = () => {
    if (!form.contentType) return null;
    const templates = TEMPLATES[form.contentType];
    
    return (
      <div className={styles.stepContent}>
        <h2 className={styles.stepTitle}>Choose a template</h2>
        <p className={styles.stepDesc}>Select a visual style that matches your vision.</p>
        <div className={styles.templateGrid}>
          {templates.map((tpl) => {
            const isSelected = form.templateId === tpl.id;
            return (
              <button
                key={tpl.id}
                className={`${styles.templateCard} ${isSelected ? styles.templateCardActive : ''}`}
                onClick={() => setForm({ ...form, templateId: tpl.id })}
              >
                <div className={styles.templateImage}>
                  <img src={tpl.image} alt={tpl.name} />
                  {isSelected && <div className={styles.templateCheck}><Check size={18} /></div>}
                </div>
                <span className={styles.templateName}>{tpl.name}</span>
              </button>
            );
          })}
        </div>
        <div className={styles.templateNoneWrap}>
          <button 
            className={`${styles.noneBtn} ${form.templateId === 'none' ? styles.noneBtnActive : ''}`}
            onClick={() => setForm({ ...form, templateId: 'none' })}
          >
            None of the above
            <p>AI will generate a custom layout for you</p>
          </button>
        </div>
      </div>
    );
  };

  // ── Step 3: Input Form ─────────────────────────────────────────────
  const renderStep3 = () => (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>Tell us about your post</h2>
      <p className={styles.stepDesc}>Provide details so AI can generate the perfect content.</p>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="topic">Topic / Occasion <span className={styles.required}>*</span></label>
          <input
            id="topic"
            type="text"
            placeholder="e.g. Diwali Sale, Product Launch, Tips Post..."
            maxLength={150}
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
          />
          <span className={styles.charCount}>{form.topic.length}/150</span>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="brandKit">Brand Kit</label>
            <select
              id="brandKit"
              value={form.brandKit}
              onChange={(e) => setForm({ ...form, brandKit: e.target.value })}
            >
              <option value="main-brand">{brandKitName || businessName || 'Main Brand'}</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Platform</label>
            <div className={styles.platformSelector}>
              {(['facebook', 'instagram', 'both'] as Platform[]).map((p) => (
                <button
                  key={p}
                  className={`${styles.platformBtn} ${form.platform === p ? styles.platformBtnActive : ''}`}
                  onClick={() => setForm({ ...form, platform: p })}
                >
                  {p === 'facebook' && <><MessageSquare size={16} /> Facebook</>}
                  {p === 'instagram' && <><Share2 size={16} /> Instagram</>}
                  {p === 'both' && <>Both</>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="extra">Extra Instructions (optional)</label>
          <textarea
            id="extra"
            placeholder="Any specific tone, hashtags, or details you want included..."
            rows={3}
            value={form.extraInstructions}
            onChange={(e) => setForm({ ...form, extraInstructions: e.target.value })}
          />
        </div>
      </div>
    </div>
  );

  // ── Step 4: AI Generation Loading ──────────────────────────────────
  const renderStep4 = () => (
    <div className={styles.stepContent}>
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => {
            generationStateRef.current = 'stopped';
            setGenerationState('stopped');
            setIsGenerating(false);
            setStep(3);
          }}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', 
            background: 'none', border: 'none', color: 'var(--text-muted)', 
            cursor: 'pointer', fontWeight: 500, padding: 0 
          }}
        >
          <ArrowLeft size={16} /> Back to Details
        </button>
      </div>

      <div className={styles.generatingContainer}>
        <div className={styles.generatingAnimation}>
          <div className={styles.generatingRing}>
            {generationState === 'paused' || generationState === 'stopped' ? (
              <Loader2 size={40} className={styles.generatingIcon} style={{ animation: 'none', opacity: 0.5 }} />
            ) : (
              <Sparkles size={40} className={styles.generatingIcon} />
            )}
          </div>
        </div>
        <h2 className={styles.generatingTitle}>
          {generationState === 'stopped' ? 'Generation Stopped' : 
           generationState === 'paused' ? 'Generation Paused' : 
           'Generating your content...'}
        </h2>
        <p className={styles.generatingDesc}>
          {generationState === 'stopped' ? 'You stopped the AI generation process.' : 
           'AI is crafting 3 caption variants and 2 image options based on your brand kit.'}
        </p>
        <div className={styles.generatingSteps}>
          <div className={`${styles.genStep} ${generationState !== 'stopped' ? styles.genStepActive : ''}`}>
            <Loader2 size={16} className={styles.spinner} style={{ animationPlayState: generationState === 'paused' || generationState === 'stopped' ? 'paused' : 'running' }} /> Analyzing brand tone &amp; style...
          </div>
          <div className={styles.genStep}>
            <Loader2 size={16} className={styles.spinner} style={{ animationPlayState: generationState === 'paused' || generationState === 'stopped' ? 'paused' : 'running' }} /> Generating captions via Claude AI...
          </div>
          <div className={styles.genStep}>
            <Loader2 size={16} className={styles.spinner} style={{ animationPlayState: generationState === 'paused' || generationState === 'stopped' ? 'paused' : 'running' }} /> Creating images via DALL·E 3...
          </div>
        </div>
        
        <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            onClick={() => {
              if (generationState === 'stopped') return;
              const nextState = generationState === 'paused' ? 'generating' : 'paused';
              setGenerationState(nextState);
              generationStateRef.current = nextState;
            }}
            disabled={generationState === 'stopped'}
            style={{ 
              padding: '0.75rem 2rem', borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--primary)', 
              background: generationState === 'paused' ? 'var(--primary)' : 'transparent', 
              color: generationState === 'paused' ? 'white' : 'var(--primary)', 
              fontWeight: 600, cursor: generationState === 'stopped' ? 'not-allowed' : 'pointer',
              opacity: generationState === 'stopped' ? 0.5 : 1
            }}
          >
            {generationState === 'paused' ? 'Continue' : 'Pause'}
          </button>
          <button 
            onClick={() => {
              setGenerationState('stopped');
              generationStateRef.current = 'stopped';
              setIsGenerating(false);
              setTimeout(() => {
                setStep(3);
              }, 3500); // Redirects after 3.5 seconds
            }}
            disabled={generationState === 'stopped'}
            style={{ 
              padding: '0.75rem 2rem', borderRadius: 'var(--radius-md)', 
              border: '1px solid #ef4444', background: 'transparent', 
              color: '#ef4444', fontWeight: 600, 
              cursor: generationState === 'stopped' ? 'not-allowed' : 'pointer',
              opacity: generationState === 'stopped' ? 0.5 : 1
            }}
          >
            Stop
          </button>
        </div>
      </div>
    </div>
  );

  // ── Step 5: Preview & Edit ─────────────────────────────────────────
  const renderStep5 = () => {
    if (!generated) return null;
    return (
      <div className={styles.stepContent}>
        <h2 className={styles.stepTitle}>Preview &amp; Edit</h2>
        <p className={styles.stepDesc}>Fine-tune your post before publishing.</p>

        <div className={styles.previewLayout}>
          {/* Left: Image Preview */}
          <div className={styles.previewImageSection}>
            <div className={styles.previewImageFrame}>
              <div className={styles.placeholderImage}>
                <ImageIcon size={64} />
                <span>AI Generated Image {selectedImage + 1}</span>
                <span className={styles.imageSize}>1024 × 1024</span>
              </div>
              {showLogoOverlay && (
                <div className={styles.logoOverlay}>
                  <div className={styles.overlayLogo}>B</div>
                </div>
              )}
            </div>
            <div className={styles.imageOptions}>
              <span className={styles.optionLabel}>Image Options:</span>
              {generated.images.map((_, i) => (
                <button
                  key={i}
                  className={`${styles.imageOptionBtn} ${selectedImage === i ? styles.imageOptionActive : ''}`}
                  onClick={() => setSelectedImage(i)}
                >
                  Option {i + 1}
                </button>
              ))}
            </div>
            <button
              className={styles.logoToggle}
              onClick={() => setShowLogoOverlay(!showLogoOverlay)}
            >
              {showLogoOverlay ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              Logo overlay (20% opacity)
            </button>
          </div>

          {/* Right: Caption Editor */}
          <div className={styles.previewCaptionSection}>
            <div className={styles.captionVariants}>
              <span className={styles.optionLabel}>Caption Variants:</span>
              <div className={styles.variantTabs}>
                {generated.captions.map((_, i) => (
                  <button
                    key={i}
                    className={`${styles.variantTab} ${selectedCaption === i ? styles.variantTabActive : ''}`}
                    onClick={() => setSelectedCaption(i)}
                  >
                    Variant {i + 1}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.captionEditor}>
              <div className={styles.editorHeader}>
                <Edit3 size={16} />
                <span>Edit Caption</span>
              </div>
              <textarea
                className={styles.captionTextarea}
                value={editedCaption}
                onChange={(e) => setEditedCaption(e.target.value)}
                rows={8}
              />
            </div>
            <div className={styles.previewMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Platform</span>
                <span className={styles.metaValue}>
                  {form.platform === 'facebook' && <><MessageSquare size={14} /> Facebook</>}
                  {form.platform === 'instagram' && <><Share2 size={14} /> Instagram</>}
                  {form.platform === 'both' && <><MessageSquare size={14} /> <Share2 size={14} /> Both</>}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Content Type</span>
                <span className={styles.metaValue} style={{ textTransform: 'capitalize' }}>{form.contentType}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Schedule Modal ─────────────────────────────────────────────────
  const renderScheduleModal = () => {
    if (!showScheduleModal) return null;
    return (
      <div className={styles.modalOverlay} onClick={() => setShowScheduleModal(false)}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <h3 className={styles.modalTitle}>Schedule Post</h3>
          <p className={styles.modalDesc}>Choose when to publish your post.</p>

          <div className={styles.scheduleModeToggle}>
            <button
              className={`${styles.modeBtn} ${!isImmediate ? styles.modeBtnActive : ''}`}
              onClick={() => setIsImmediate(false)}
            >
              <CalendarClock size={18} /> Schedule for Later
            </button>
            <button
              className={`${styles.modeBtn} ${isImmediate ? styles.modeBtnActive : ''}`}
              onClick={() => setIsImmediate(true)}
            >
              <Send size={18} /> Publish Now
            </button>
          </div>

          {!isImmediate && (
            <div className={styles.scheduleInputs}>
                <label htmlFor="scheduleDate">Date (DD/MM/YY)</label>
                <div className={styles.customDateWrapper}>
                  <input
                    id="scheduleDate"
                    type="text"
                    placeholder="DD/MM/YY"
                    value={formatDateToDDMMYY(scheduleDate)}
                    readOnly
                    onClick={() => {
                      const input = document.getElementById('hiddenDateInput');
                      if (input) (input as any).showPicker();
                    }}
                  />
                  <input
                    id="hiddenDateInput"
                    type="date"
                    className={styles.hiddenNativeDate}
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
              <div className={styles.formGroup}>
                <label htmlFor="scheduleTime">Time</label>
                <input
                  id="scheduleTime"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className={styles.modalActions}>
            <button className={styles.modalCancel} onClick={() => setShowScheduleModal(false)}>
              Cancel
            </button>
            <button className={styles.modalConfirm}>
              {isImmediate ? (
                <><Send size={16} /> Publish Now</>
              ) : (
                <><CalendarClock size={16} /> Schedule Post</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.composerHeader}>
        <Link href="/dashboard" className={styles.backLink}>
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>
        <h1>Post Composer</h1>
      </div>

      {renderStepIndicator()}

      <div className={styles.composerBody}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </div>

      {/* Footer Navigation */}
      <div className={styles.composerFooter}>
        {step > 1 && step !== 4 && (
          <button className={styles.backBtn} onClick={() => setStep(step === 5 ? 3 : step - 1)}>
            <ArrowLeft size={18} /> Back
          </button>
        )}
        <div className={styles.footerRight}>
          {step === 1 && (
            <button
              className={styles.nextBtn}
              disabled={!canProceedStep2}
              onClick={() => setStep(2)}
            >
              Next <ArrowRight size={18} />
            </button>
          )}
          {step === 2 && (
            <button
              className={styles.nextBtn}
              disabled={!canProceedStep3}
              onClick={() => setStep(3)}
            >
              Next <ArrowRight size={18} />
            </button>
          )}
          {step === 3 && (
            <button
              className={styles.generateBtn}
              disabled={!canProceedStep4}
              onClick={() => { setStep(4); handleGenerate(); }}
            >
              <Sparkles size={18} /> Generate with AI
            </button>
          )}
          {step === 5 && (
            <>
              <button className={styles.regenerateBtn} onClick={() => { setStep(4); handleGenerate(); }}>
                <RefreshCw size={16} /> Regenerate
              </button>
              <button className={styles.scheduleBtn} onClick={() => setShowScheduleModal(true)}>
                <CalendarClock size={18} /> Schedule / Publish
              </button>
            </>
          )}
        </div>
      </div>

      {renderScheduleModal()}
    </div>
  );
}
