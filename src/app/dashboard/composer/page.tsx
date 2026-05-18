'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import {
  PartyPopper,
  Bookmark,
  Tag,
  BookOpen,
  Layers,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  Loader2,
  Edit3,
  ToggleLeft,
  ToggleRight,
  CalendarClock,
  Send,
  Image as ImageIcon,
  RefreshCw,
  Download,
  Edit2,
  Facebook,
  Instagram,
} from 'lucide-react';
import { useBrand } from '@/contexts/BrandContext';
import { ImageEditor } from '@/components/ImageEditor';
import styles from './Composer.module.css';

// ── Types ────────────────────────────────────────────────────────────
type ContentType = 'festive' | 'offer' | 'informational' | 'general';
type Platform = 'facebook' | 'instagram' | 'both';
type GenerationState = 'generating' | 'paused' | 'stopped';

interface ComposerForm {
  contentType: ContentType | null;
  templateId: string | null;
  topic: string;
  brandKit: string;
  platform: Platform;
  extraInstructions: string;
}

interface GeneratedContent {
  images: string[];
  captions: string[];
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
function ComposerPageContent() {
  const searchParams = useSearchParams();
  const { 
    brandKitName, brandKits, businessName, brandTone, brandDescription, colors,
    fullName, ownerName, address, pincode, timing, logo,
    postsUsed, planId, trialEndsAt, refreshBrandData, workspaceId
  } = useBrand();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [generationState, setGenerationState] = useState<GenerationState>('generating');
  const generationStateRef = useRef<GenerationState>('generating');
  const [selectedCaption, setSelectedCaption] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [editedCaption, setEditedCaption] = useState('');
  const [showLogoOverlay, setShowLogoOverlay] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isImmediate, setIsImmediate] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const [form, setForm] = useState<ComposerForm>({
    contentType: null,
    templateId: null,
    topic: '',
    brandKit: brandKits[0]?.id || 'main-brand',
    platform: 'both',
    extraInstructions: '',
  });

  // Update form if brandKits load later
  useEffect(() => {
    if (brandKits.length > 0 && form.brandKit === 'main-brand') {
      setForm(prev => ({ ...prev, brandKit: brandKits[0].id }));
    }
  }, [brandKits]);

  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [generatedPostIds, setGeneratedPostIds] = useState<number[]>([]);

  // Daily attempts state & local storage tracking
  const [imageRegenAttempts, setImageRegenAttempts] = useState(3);
  const [captionRegenAttempts, setCaptionRegenAttempts] = useState(3);

  useEffect(() => {
    const now = Date.now();
    const storedLastReset = localStorage.getItem('brandpost_regen_last_reset');
    const storedImageRegen = localStorage.getItem('brandpost_image_regen_attempts');
    const storedCaptionRegen = localStorage.getItem('brandpost_caption_regen_attempts');

    if (!storedLastReset || now - parseInt(storedLastReset) > 24 * 60 * 60 * 1000) {
      localStorage.setItem('brandpost_regen_last_reset', now.toString());
      localStorage.setItem('brandpost_image_regen_attempts', '3');
      localStorage.setItem('brandpost_caption_regen_attempts', '3');
      setImageRegenAttempts(3);
      setCaptionRegenAttempts(3);
    } else {
      setImageRegenAttempts(storedImageRegen ? parseInt(storedImageRegen) : 3);
      setCaptionRegenAttempts(storedCaptionRegen ? parseInt(storedCaptionRegen) : 3);
    }
  }, []);

  const decrementImageRegen = () => {
    const newVal = Math.max(0, imageRegenAttempts - 1);
    setImageRegenAttempts(newVal);
    localStorage.setItem('brandpost_image_regen_attempts', newVal.toString());
  };

  const decrementCaptionRegen = () => {
    const newVal = Math.max(0, captionRegenAttempts - 1);
    setCaptionRegenAttempts(newVal);
    localStorage.setItem('brandpost_caption_regen_attempts', newVal.toString());
  };

  // Pre-fill from calendar link or Edit/Duplicate
  useEffect(() => {
    const editId = searchParams.get('editId');
    const duplicateId = searchParams.get('duplicateId');
    const occasion = searchParams.get('occasion');
    const type = searchParams.get('type');

    async function fetchPost(id: string, isEdit: boolean) {
      const supabase = createClient();
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (data) {
          setForm({
            contentType: data.content_type || 'general',
            templateId: 'none',
            topic: data.title || data.caption?.substring(0, 30) || 'Previous Post',
            brandKit: 'main-brand',
            platform: data.platform || 'both',
            extraInstructions: '',
          });

          if (isEdit) {
            setGenerated({
              captions: [data.caption || ''],
              images: [data.image_url || '']
            });
            setEditedCaption(data.caption || '');
            setStep(5);
          } else {
            // Duplicate: Just pre-fill and go to details step
            setStep(3);
          }
        }
      } catch (err) {
        console.error('Error fetching post for pre-fill:', err);
      }
    }

    if (editId) {
      fetchPost(editId, true);
    } else if (duplicateId) {
      fetchPost(duplicateId, false);
    } else if (occasion) {
      setForm((prev) => ({ ...prev, topic: occasion }));
      if (type && ['festive', 'offer', 'informational', 'general'].includes(type)) {
        setForm((prev) => ({ ...prev, contentType: type as ContentType }));
        setStep(2);
      } else {
        setStep(1);
      }
    }
  }, [searchParams]);

  const canProceedStep2 = form.contentType !== null;
  const canProceedStep3 = form.templateId !== null || form.templateId === 'none';
  const canProceedStep4 = form.topic.trim().length > 0;

  const handleGenerateFull = async () => {
    // Credit check
    const isTrial = planId === 'solo' && trialEndsAt && new Date(trialEndsAt) > new Date();
    const currentLimit = isTrial ? 100 : 50;
    if (postsUsed >= currentLimit) {
      alert("Please upgrade your plan. You have reached your AI generation limit.");
      return;
    }

    setIsGenerating(true);
    setStep(4);
    try {
      const [captionsData, imagesData] = await Promise.all([
        generateCaptions(),
        generateImages()
      ]);

      if (captionsData.error) throw new Error(`Captions: ${captionsData.error}`);
      if (imagesData.error) throw new Error(`Images: ${imagesData.error}`);

      setGenerated({
        captions: captionsData.captions || [],
        images: imagesData.images || []
      });
      setGeneratedPostIds(imagesData.postIds || []);
      setSelectedCaption(0);
      setSelectedImage(0);
      setStep(5);
      refreshBrandData(); // Update credits and history
    } catch (error: any) {
      console.error('Generation failed:', error);
      alert(error.message || 'Generation failed. Please try again.');
      setStep(3);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCaptions = async () => {
    setIsGeneratingCaptions(true);
    try {
      const selectedKit = brandKits.find(k => k.id === form.brandKit) || brandKits[0];
      const res = await fetch('/api/generate/captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: form.topic,
          contentType: form.contentType,
          platform: form.platform,
          extraInstructions: form.extraInstructions,
          brandDetails: { 
            businessName: selectedKit?.brand_kit_name || businessName, 
            brandTone: selectedKit?.tone || brandTone, 
            brandDescription: selectedKit?.brand_description || brandDescription, 
            colors: selectedKit ? {
              primary: selectedKit.primary_color,
              secondary: selectedKit.secondary_color,
              accent: selectedKit.accent_color
            } : colors 
          }
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate captions');
      return data;
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  const generateImages = async (single = false) => {
    setIsGeneratingImages(true);
    try {
      const selectedKit = brandKits.find(k => k.id === form.brandKit) || brandKits[0];
      const res = await fetch('/api/generate/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: form.topic,
          contentType: form.contentType,
          platform: form.platform,
          extraInstructions: form.extraInstructions,
          workspaceId: workspaceId,
          single,
          brandDetails: { 
            businessName: selectedKit?.brand_kit_name || businessName, 
            brandDescription: selectedKit?.brand_description || brandDescription, 
            colors: selectedKit ? {
              primary: selectedKit.primary_color,
              secondary: selectedKit.secondary_color,
              accent: selectedKit.accent_color
            } : colors,
            fullName: fullName || ownerName,
            brandTone: selectedKit?.tone || brandTone,
            address,
            pincode,
            timing,
            logo: selectedKit?.logo_url || logo
          }
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate images');
      return data;
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleRegenerateCaptions = async () => {
    if (captionRegenAttempts <= 0) {
      alert("You have exceeded today's regeneration limit.");
      return;
    }
    try {
      const data = await generateCaptions();
      if (data.captions) {
        setGenerated(prev => prev ? { ...prev, captions: data.captions } : null);
        setSelectedCaption(0);
        decrementCaptionRegen();
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleRegenerateImages = async () => {
    if (imageRegenAttempts <= 0) {
      alert("You have exceeded today's regeneration limit.");
      return;
    }
    try {
      const data = await generateImages(true);
      if (data.images && data.images.length > 0) {
        setGenerated(prev => {
          if (!prev) return null;
          const newImages = [...prev.images, data.images[0]];
          setSelectedImage(newImages.length - 1);
          return { ...prev, images: newImages };
        });
        if (data.postIds && data.postIds.length > 0) {
          setGeneratedPostIds(prev => [...prev, data.postIds[0]]);
        }
        decrementImageRegen();
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const [isSavingImage, setIsSavingImage] = useState(false);

  const handleSaveImage = async () => {
    if (!generated || generated.images.length === 0) return;
    const currentImageUrl = generated.images[selectedImage];
    const generatedPostId = generatedPostIds[selectedImage];
    
    setIsSavingImage(true);
    try {
      const supabase = createClient();
      
      // If we have an existing post ID (from the generated draft), update it to be 'saved'
      if (generatedPostId) {
        const { error } = await supabase
          .from('posts')
          .update({ is_saved: true })
          .eq('id', generatedPostId);
          
        if (error) throw error;
      } else {
        // If no post ID exists yet (unlikely, but just in case), create a new draft flagged as 'saved'
        const postData = {
          title: form.topic,
          caption: editedCaption,
          platform: form.platform,
          content_type: form.contentType,
          image_url: currentImageUrl,
          brand_kit_id: form.brandKit === 'main-brand' ? null : form.brandKit,
          status: 'draft',
          is_saved: true,
          workspace_id: workspaceId,
        };
        
        const { data, error } = await supabase
          .from('posts')
          .insert([postData])
          .select();
          
        if (error) throw error;
        if (data && data[0]) {
          setGeneratedPostIds(prev => {
            const copy = [...prev];
            copy[selectedImage] = data[0].id;
            return copy;
          });
        }
      }
      
      alert('Image saved to library successfully!');
    } catch (error: any) {
      console.error('Error saving image:', error);
      alert('Failed to save image: ' + error.message);
    } finally {
      setIsSavingImage(false);
    }
  };

  const handleSaveEditedImage = (editedImageUrl: string) => {
    if (!generated) return;
    const newImages = [...generated.images];
    newImages[selectedImage] = editedImageUrl;
    setGenerated({ ...generated, images: newImages });
    setShowEditor(false);
  };

  const downloadImage = async () => {
    if (!generated?.images[selectedImage]) return;
    try {
      const response = await fetch(generated.images[selectedImage]);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `brandpost-${form.topic.replace(/\s+/g, '-')}-${selectedImage + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleConfirmSchedule = async () => {
    const supabase = createClient();
    const editId = searchParams.get('editId');
    
    setIsGenerating(true); // Reuse loading state for saving
    try {
      const postData = {
        title: form.topic,
        caption: editedCaption,
        platform: form.platform,
        content_type: form.contentType,
        image_url: generated?.images[selectedImage],
        brand_kit_id: form.brandKit === 'main-brand' ? null : form.brandKit,
        status: 'scheduled',
        scheduled_at: isImmediate ? new Date().toISOString() : `${scheduleDate}T${scheduleTime}:00`,
        workspace_id: workspaceId,
      };

      const generatedPostId = generatedPostIds[selectedImage];
      let savedPostId = editId || (generatedPostId ? String(generatedPostId) : null);

      if (savedPostId) {
        const { error } = await supabase
          .from('posts')
          .update(postData)
          .eq('id', savedPostId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('posts')
          .insert([postData])
          .select();
        if (error) throw error;
        if (data && data[0]) {
          savedPostId = data[0].id;
        }
      }

      if (isImmediate && savedPostId) {
        console.log('Publishing post immediately via API...');
        const pubRes = await fetch('/api/social/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: savedPostId })
        });
        
        const pubData = await pubRes.json();
        if (!pubRes.ok || !pubData.success) {
          const errMsg = pubData.errors ? pubData.errors.join(', ') : (pubData.error || 'Unknown error');
          throw new Error(`Post saved, but publishing to social media failed: ${errMsg}`);
        }
        
        alert('Post published successfully to social media!');
      } else {
        alert(isImmediate ? 'Post published successfully!' : 'Post scheduled successfully!');
      }
      
      setShowScheduleModal(false);
      router.push('/dashboard/posts');
    } catch (err: any) {
      console.error('Error saving/publishing post:', err);
      alert(err.message || 'Failed to save or publish post.');
    } finally {
      setIsGenerating(false);
    }
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
              {brandKits.length > 0 ? (
                brandKits.map(kit => (
                  <option key={kit.id} value={kit.id}>{kit.brand_kit_name}</option>
                ))
              ) : (
                <option value="main-brand">{brandKitName || businessName || 'Main Brand'}</option>
              )}
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
                  {p === 'facebook' && <><Facebook size={16} /> Facebook</>}
                  {p === 'instagram' && <><Instagram size={16} /> Instagram</>}
                  {p === 'both' && <>Both</>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="extra">Extra Instructions</label>
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
            <Loader2 size={16} className={styles.spinner} style={{ animationPlayState: (isGenerating || isGeneratingCaptions) ? 'running' : 'paused' }} /> Generating captions via OpenAI...
          </div>
          <div className={styles.genStep}>
            <Loader2 size={16} className={styles.spinner} style={{ animationPlayState: (isGenerating || isGeneratingImages) ? 'running' : 'paused' }} /> Creating images via DALL·E 3...
          </div>
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
              {generated.images[selectedImage] ? (
                <>
                  <img 
                    src={generated.images[selectedImage]} 
                    alt={`AI Generated ${selectedImage + 1}`} 
                    className={styles.previewImage}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div className={styles.imageActionButtons}>
                    <button 
                      className={styles.editBtn}
                      onClick={() => setShowEditor(true)}
                      title="Edit Image"
                    >
                      <Edit2 size={18} />
                      <span>Edit</span>
                    </button>
                    <button 
                      className={styles.downloadBtn}
                      onClick={downloadImage}
                      title="Download Image"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.placeholderImage}>
                  <ImageIcon size={64} />
                  <span>AI Generated Image {selectedImage + 1}</span>
                  <span className={styles.imageSize}>1024 × 1024</span>
                </div>
              )}
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', marginLeft: 'auto' }}>
                <button 
                  className={styles.regenerateBtn} 
                  onClick={handleRegenerateImages}
                  disabled={isGeneratingImages || imageRegenAttempts <= 0}
                  style={{ width: 'fit-content' }}
                >
                  {isGeneratingImages ? <Loader2 size={14} className={styles.spinner} /> : <RefreshCw size={14} />}
                  Regen Image
                </button>
                <span className={styles.regenAttemptsLabel}>
                  {imageRegenAttempts > 0 
                    ? `${imageRegenAttempts} ${imageRegenAttempts === 1 ? 'attempt' : 'attempts'} remaining today` 
                    : "Today's limit has been exceeded"}
                </span>
              </div>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className={styles.optionLabel}>Caption Variants:</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <button 
                    onClick={handleSaveImage}
                    disabled={isSavingImage}
                    style={{ 
                      backgroundColor: '#10b981', 
                      color: 'white', 
                      border: 'none', 
                      padding: '6px 12px', 
                      borderRadius: '6px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      marginBottom: '4px'
                    }}
                  >
                    {isSavingImage ? <Loader2 size={14} className={styles.spinner} /> : <Bookmark size={14} fill="none" />}
                    Save Image
                  </button>
                  <button 
                    className={styles.regenerateBtn} 
                    onClick={handleRegenerateCaptions}
                    disabled={isGeneratingCaptions || captionRegenAttempts <= 0}
                  >
                    {isGeneratingCaptions ? <Loader2 size={14} className={styles.spinner} /> : <RefreshCw size={14} />}
                    Regen Captions
                  </button>
                  <span className={styles.regenAttemptsLabel}>
                    {captionRegenAttempts > 0 
                      ? `${captionRegenAttempts} ${captionRegenAttempts === 1 ? 'attempt' : 'attempts'} remaining today` 
                      : "Today's limit has been exceeded"}
                  </span>
                </div>
              </div>
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
                  {form.platform === 'facebook' && <><Facebook size={14} /> Facebook</>}
                  {form.platform === 'instagram' && <><Instagram size={14} /> Instagram</>}
                  {form.platform === 'both' && <><Facebook size={14} /> <Instagram size={14} /> Both</>}
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
            <button 
              className={styles.modalConfirm} 
              onClick={handleConfirmSchedule}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 size={16} className={styles.spinner} /> : (
                isImmediate ? (
                  <><Send size={16} /> Publish Now</>
                ) : (
                  <><CalendarClock size={16} /> Schedule Post</>
                )
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
              onClick={handleGenerateFull}
            >
              <Sparkles size={18} /> Generate with AI
            </button>
          )}
          {step === 5 && (
            <>
              <button className={styles.scheduleBtn} onClick={() => setShowScheduleModal(true)}>
                <CalendarClock size={18} /> Schedule / Publish
              </button>
            </>
          )}
        </div>
      </div>

      {renderScheduleModal()}

      {showEditor && generated && (
        <ImageEditor
          key={`editor-${selectedImage}-${generated.images[selectedImage]}`}
          imageUrl={generated.images[selectedImage]}
          logoUrl={logo || undefined}
          onSave={handleSaveEditedImage}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}

export default function ComposerPage() {
  return (
    <Suspense fallback={null}>
      <ComposerPageContent />
    </Suspense>
  );
}
