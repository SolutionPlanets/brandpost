'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
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
  Globe,
  Heart,
  MessageCircle,
  Share2,
  Upload,
  X,
  AlertTriangle,
  Minimize2,
  Columns,
} from 'lucide-react';
import { useBrand } from '@/contexts/BrandContext';
import { ImageEditor } from '@/components/ImageEditor';
import styles from './Composer.module.css';

// ── Types ────────────────────────────────────────────────────────────
interface SocialConnection {
  id: string;
  workspace_id: string;
  platform: 'facebook' | 'instagram';
  page_id: string;
  page_name: string;
  picture_url: string | null;
  access_token: string;
  token_expires_at?: string;
}

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
  graphicHeadline: string;
  heroObjects: string;
  campaignExpiry: string;
  wordCount: number;
  hashtagCount: number;
  mentionBrandLogo: boolean;
  brandLogoPosition: string;
  mentionWebsiteInPost: boolean;
  brandLinkPosition: string;
  mentionWebsiteInCaption: boolean;
  ctaText: string;
  ctaPosition: string;
  brandTitle: string;
  heroMessage: string;
  selectedProductIds: string[];
  placementCategory: 'physical' | 'digital' | 'institutional' | null;
  layoutStyle: 'commercial' | 'minimalist' | 'editorial' | null;
}

interface GeneratedContent {
  images: { url: string; id: any }[];
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

const STEP_LABELS = ['Content Type', 'Template', 'Details', 'AI Generation', 'Preview & Edit', 'Social Distribution'];

// ── Component ────────────────────────────────────────────────────────
function ComposerPageContent() {
  const searchParams = useSearchParams();
  const { 
    brandKitName, brandKits, businessName, brandTone, brandDescription, colors,
    fullName, ownerName, address, pincode, timing, logo, logoDark,
    industry, brandAudience, websiteUrl, phrasesToInclude, phrasesToAvoid,
    postsUsed, planId, trialEndsAt, refreshBrandData, workspaceId,
    checkLimitAndRedirect
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
  const [showEditor, setShowEditor] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isImmediate, setIsImmediate] = useState(false);

  // ── Step 6 Social Connections State ────────────────────────────────
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [connectionMappings, setConnectionMappings] = useState<Record<string, { imageIndex: number; captionIndex: number }>>({});
  const [activePreviewPlatform, setActivePreviewPlatform] = useState<'facebook' | 'instagram'>('facebook');

  const [form, setForm] = useState<ComposerForm>({
    contentType: null,
    templateId: null,
    topic: '',
    brandKit: brandKits[0]?.id || 'main-brand',
    platform: 'both',
    extraInstructions: '',
    graphicHeadline: '',
    heroObjects: '',
    campaignExpiry: '',
    wordCount: 100,
    hashtagCount: 6,
    mentionBrandLogo: true,
    brandLogoPosition: 'Bottom Right',
    mentionWebsiteInPost: true,
    brandLinkPosition: 'Bottom Left',
    mentionWebsiteInCaption: true,
    ctaText: '',
    ctaPosition: 'Bottom Center',
    brandTitle: '',
    heroMessage: '',
    selectedProductIds: [],
    placementCategory: 'physical',
    layoutStyle: null,
  });

  // ── Product Image Selection State ─────────────────────────────────────
  const [useProductAsHero, setUseProductAsHero] = useState(true);

  // Cache resolved product data at generation time so regeneration always has context
  const cachedProductDataRef = useRef<{
    productImages: string[];
    productNames: string[];
    selectedProductIds: string[];
  } | null>(null);

  // Update form if brandKits load later
  useEffect(() => {
    if (brandKits.length > 0 && form.brandKit === 'main-brand') {
      setForm(prev => ({ ...prev, brandKit: brandKits[0].id }));
    }
  }, [brandKits]);

  // Handle brand kit change - reset product selection
  const handleBrandKitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm(prev => ({ 
      ...prev, 
      brandKit: e.target.value,
      selectedProductIds: [] // Reset selection on kit change
    }));
  };

  // Get products for currently selected brand kit
  const selectedKitObj = brandKits.find(k => k.id === form.brandKit);
  const availableProducts = selectedKitObj?.products || [];

  const handleProductToggle = (productId: string) => {
    setForm(prev => {
      const current = prev.selectedProductIds;
      if (current.includes(productId)) {
        return { ...prev, selectedProductIds: current.filter(id => id !== productId) };
      } else {
        return { ...prev, selectedProductIds: [...current, productId] };
      }
    });
  };


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

  // ── Auto-Save Draft State ──────────────────────────────────────────
  const [draftId, setDraftId] = useState<string | null>(null);
  const formRef = useRef(form);
  const generatedRef = useRef(generated);
  const editedCaptionRef = useRef(editedCaption);
  const stepRef = useRef(step);
  const draftIdRef = useRef(draftId);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const hasCompletedDistributionRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { formRef.current = form; }, [form]);
  useEffect(() => { generatedRef.current = generated; }, [generated]);
  useEffect(() => { editedCaptionRef.current = editedCaption; }, [editedCaption]);
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { draftIdRef.current = draftId; }, [draftId]);

  // Autofetch Brand Title based on user selected brand kit and businessName context
  useEffect(() => {
    if (form.brandKit === 'main-brand') {
      if (!form.brandTitle) {
        setForm(prev => ({ ...prev, brandTitle: businessName || '' }));
      }
    } else if (form.brandKit === 'none') {
      if (form.brandTitle === businessName) {
        setForm(prev => ({ ...prev, brandTitle: '' }));
      }
    }
  }, [form.brandKit, businessName]);

  // ── Save Draft to Database ─────────────────────────────────────────
  const saveDraftToDb = useCallback(async (isBeacon = false) => {
    if (hasCompletedDistributionRef.current) return;
    const currentForm = formRef.current;
    const currentGenerated = generatedRef.current;
    const currentEditedCaption = editedCaptionRef.current;
    const currentStep = stepRef.current;
    const currentDraftId = draftIdRef.current;

    // Only save if user has made meaningful progress (at least a topic on step ≥ 3)
    if (currentStep < 3 || !currentForm.topic.trim()) return;
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    try {
      const supabase = createClient();
      const caption = currentEditedCaption || currentGenerated?.captions?.[0] || `Draft: ${currentForm.topic}`;
      const imageUrl = currentGenerated?.images?.[0]?.url || null;

      const payload: any = {
        title: currentForm.topic,
        content_type: currentForm.contentType || 'general',
        platform: currentForm.platform || 'both',
        status: 'draft',
        extra_instructions: currentForm.extraInstructions || null,
        caption,
        image_url: imageUrl,
        mention_brand_logo: currentForm.mentionBrandLogo,
        brand_logo_position: currentForm.brandLogoPosition,
        mention_website_in_post: currentForm.mentionWebsiteInPost,
        brand_link_position: currentForm.brandLinkPosition,
        mention_website_in_caption: currentForm.mentionWebsiteInCaption,
        cta_text: currentForm.ctaText || null,
        cta_position: currentForm.ctaPosition || null,
        graphic_headline: currentForm.graphicHeadline || null,
        hero_objects: currentForm.heroObjects || null,
        campaign_expiry: currentForm.campaignExpiry || null,
        word_count: currentForm.wordCount,
        hashtag_count: currentForm.hashtagCount,
        brand_title: currentForm.brandTitle || null,
        hero_message: currentForm.heroMessage || null,
        product_image_url: currentForm.selectedProductIds.length > 0 
          ? JSON.stringify(currentForm.selectedProductIds) 
          : (cachedProductDataRef.current?.selectedProductIds?.length 
            ? JSON.stringify(cachedProductDataRef.current.selectedProductIds) 
            : null),
        placement_category: currentForm.placementCategory || 'physical',
        layout_style: currentForm.layoutStyle || null,
      };

      if (currentDraftId) {
        // Update existing draft
        await supabase.from('posts').update(payload).eq('id', currentDraftId);
      } else if (workspaceId) {
        // Create new draft
        payload.workspace_id = workspaceId;
        const { data } = await supabase.from('posts').insert([payload]).select('id').single();
        if (data?.id) {
          setDraftId(data.id);
          draftIdRef.current = data.id;
        }
      }
    } catch (err) {
      console.error('Auto-save draft error:', err);
    } finally {
      isSavingRef.current = false;
    }
  }, [workspaceId]);

  // ── Auto-Save: beforeunload + periodic save ────────────────────────
  useEffect(() => {
    // Browser close / tab close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const currentStep = stepRef.current;
      const currentForm = formRef.current;
      if (currentStep >= 3 && currentForm.topic.trim()) {
        // Fire and forget — use sendBeacon for reliability
        saveDraftToDb(true);
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Periodic auto-save every 30 seconds
    autoSaveTimerRef.current = setInterval(() => {
      saveDraftToDb();
    }, 30000);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [saveDraftToDb]);

  // Save draft when user navigates away via Next.js router (sidebar clicks)
  useEffect(() => {
    const handleRouteChange = () => {
      saveDraftToDb();
    };

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      // Final save on component unmount (sidebar navigation)
      saveDraftToDb();
    };
  }, [saveDraftToDb]);

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
            brandKit: data.brand_kit_id || 'main-brand',
            platform: data.platform || 'both',
            extraInstructions: data.extra_instructions || '',
            graphicHeadline: data.graphic_headline || '',
            heroObjects: data.hero_objects || '',
            campaignExpiry: data.campaign_expiry || '',
            wordCount: data.word_count || 100,
            hashtagCount: data.hashtag_count !== undefined ? data.hashtag_count : 6,
            mentionBrandLogo: data.mention_brand_logo !== undefined ? data.mention_brand_logo : true,
            brandLogoPosition: data.brand_logo_position || 'Bottom Right',
            mentionWebsiteInPost: data.mention_website_in_post !== undefined ? data.mention_website_in_post : true,
            brandLinkPosition: data.brand_link_position || 'Bottom Left',
            mentionWebsiteInCaption: data.mention_website_in_caption !== undefined ? data.mention_website_in_caption : true,
            ctaText: data.cta_text || '',
            ctaPosition: data.cta_position || 'Bottom Center',
            brandTitle: data.brand_title || '',
            heroMessage: data.hero_message || '',
            selectedProductIds: (() => {
              if (!data.product_image_url) return [];
              try {
                // New format: JSON array of product IDs
                const parsed = JSON.parse(data.product_image_url);
                return Array.isArray(parsed) ? parsed : [data.product_image_url];
              } catch {
                // Legacy format: single product ID string
                return [data.product_image_url];
              }
            })(),
            placementCategory: data.placement_category || 'physical',
            layoutStyle: data.layout_style || null,
          });

          if (isEdit) {
            setDraftId(data.id);
            draftIdRef.current = data.id;
            if (!data.image_url) {
              // Redirect empty drafts directly to the renderStep3 details form
              setStep(3);
            } else {
              setGenerated({
                captions: [data.caption || ''],
                images: [{ url: data.image_url || '', id: data.id }]
              });
              setEditedCaption(data.caption || '');
              setStep(5);
            }
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

  // Fetch social connections
  useEffect(() => {
    if (!workspaceId) return;
    async function fetchConnections() {
      setLoadingConnections(true);
      const supabase = createClient();
      try {
        const { data, error } = await supabase
          .from('social_connections')
          .select('*')
          .eq('workspace_id', workspaceId);
        if (error) throw error;
        const fetchedConns = (data || []) as SocialConnection[];
        setConnections(fetchedConns);
        setSelectedConnectionIds(fetchedConns.map(c => c.id));
        const initialMappings: Record<string, { imageIndex: number; captionIndex: number }> = {};
        fetchedConns.forEach(c => {
          initialMappings[c.id] = { imageIndex: 0, captionIndex: 0 };
        });
        setConnectionMappings(initialMappings);
        if (fetchedConns.length > 0) {
          const firstPlatform = fetchedConns[0].platform;
          setActivePreviewPlatform(firstPlatform);
        }
      } catch (err) {
        console.error('Error fetching social connections:', err);
      } finally {
        setLoadingConnections(false);
      }
    }
    fetchConnections();
  }, [workspaceId]);

  const canProceedStep2 = form.contentType !== null;
  const canProceedStep3 = form.layoutStyle !== null;
  const canProceedStep4 = form.topic.trim().length > 0;

  // ── Get the current post ID (for regen calls) ─────────────────────
  const getCurrentPostId = (): string | undefined => {
    if (!generated?.images?.length) return undefined;
    // Use the first image's ID as the canonical post ID
    return generated.images[0]?.id || undefined;
  };

  const handleGenerateFull = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    // Credit check
    if (checkLimitAndRedirect && checkLimitAndRedirect()) {
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
      if (captionsData.captions && captionsData.captions.length > 0) {
        setEditedCaption(captionsData.captions[0]);
      }

      // Wire up the draftId from the generated post so subsequent saves update the same row
      const firstImageId = imagesData.images?.[0]?.id;
      const firstCaption = captionsData.captions?.[0];
      if (firstImageId) {
        setDraftId(firstImageId);
        draftIdRef.current = firstImageId;
        // Update the draft's caption in the database with the AI generated one
        if (firstCaption) {
          const supabase = createClient();
          await supabase.from('posts').update({ caption: firstCaption }).eq('id', firstImageId);
        }
      }

      // Sync local storage limit (don't override with backend per-post limit)
      // The backend returns per-post limits, but we want a global daily limit for the user

      setStep(5);
      refreshBrandData(true); // Silently update credits and history
    } catch (error: any) {
      console.error('Generation failed:', error);
      alert(error.message || 'Generation failed. Please try again.');
      setStep(3);
    } finally {
      setIsGenerating(false);
    }
  };

    const generateCaptions = async (postId?: string) => {
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
          graphicHeadline: form.graphicHeadline,
          heroObjects: form.heroObjects,
          campaignExpiry: form.campaignExpiry,
          wordCount: typeof form.wordCount === 'number' && !isNaN(form.wordCount) ? Math.min(100, Math.max(10, form.wordCount)) : 100,
          hashtagCount: typeof form.hashtagCount === 'number' && !isNaN(form.hashtagCount) ? Math.min(30, Math.max(0, form.hashtagCount)) : 6,
          brandDetails: form.brandKit === 'none' ? null : { 
            businessName: selectedKit?.brand_kit_name || businessName, 
            brandTone: selectedKit?.tone || brandTone, 
            brandDescription: selectedKit?.brand_description || brandDescription, 
            colors: selectedKit ? {
              primary: selectedKit.primary_color,
              secondary: selectedKit.secondary_color,
              accent: selectedKit.accent_color
            } : colors,
            industry: selectedKit?.industry || industry,
            brandAudience: selectedKit?.target_audience || brandAudience,
            websiteUrl: selectedKit?.website_url || websiteUrl,
            phrasesToInclude: selectedKit?.phrases_to_include || phrasesToInclude,
            phrasesToAvoid: selectedKit?.phrases_to_avoid || phrasesToAvoid,
          },
          mentionWebsiteInCaption: form.brandKit !== 'none' ? form.mentionWebsiteInCaption : false,
          productImages: form.selectedProductIds.length > 0 && availableProducts.length > 0
            ? availableProducts.filter(p => form.selectedProductIds.includes(p.id)).map(p => p.image_url) 
            : (postId && cachedProductDataRef.current ? cachedProductDataRef.current.productImages : []),
          productNames: form.selectedProductIds.length > 0 && availableProducts.length > 0
            ? availableProducts.filter(p => form.selectedProductIds.includes(p.id)).map(p => p.product_name || 'Product')
            : (postId && cachedProductDataRef.current ? cachedProductDataRef.current.productNames : []),
          ...(postId ? { postId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.code === 'REGEN_LIMIT_REACHED'
          ? data.error
          : data.code ? `[Error ${data.code}] ${data.error}` : data.error;
        throw new Error(errMsg || 'Failed to generate captions');
      }
      return data;
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  const generateImages = async (postId?: string) => {
    setIsGeneratingImages(true);
    try {
      const selectedKit = brandKits.find(k => k.id === form.brandKit) || brandKits[0];

      // ── Resolve product data: form state first, fall back to cached data ──
      // During regeneration, form.selectedProductIds might have been cleared
      // (e.g. by a re-render cycle or brand kit refresh). Use cached data as fallback.
      let resolvedProductImages: string[] = [];
      let resolvedProductNames: string[] = [];

      if (form.selectedProductIds.length > 0 && availableProducts.length > 0) {
        // Primary path: resolve from current form state + available products
        const matchedProducts = availableProducts.filter(p => form.selectedProductIds.includes(p.id));
        resolvedProductImages = matchedProducts.map(p => p.image_url);
        resolvedProductNames = matchedProducts.map(p => p.product_name || 'Product');
      } else if (postId && cachedProductDataRef.current && cachedProductDataRef.current.productImages.length > 0) {
        // Fallback for regeneration: use cached product data from initial generation
        console.log('⚡ Using cached product data for regeneration:', cachedProductDataRef.current);
        resolvedProductImages = cachedProductDataRef.current.productImages;
        resolvedProductNames = cachedProductDataRef.current.productNames;
        // Also restore the form's selectedProductIds so UI stays in sync
        if (cachedProductDataRef.current.selectedProductIds.length > 0) {
          setForm(prev => ({
            ...prev,
            selectedProductIds: cachedProductDataRef.current!.selectedProductIds,
          }));
        }
      }

      // Cache the resolved product data for future regenerations
      if (resolvedProductImages.length > 0) {
        cachedProductDataRef.current = {
          productImages: resolvedProductImages,
          productNames: resolvedProductNames,
          selectedProductIds: form.selectedProductIds.length > 0
            ? [...form.selectedProductIds]
            : (cachedProductDataRef.current?.selectedProductIds || []),
        };
      }

      const res = await fetch('/api/generate/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: form.topic,
          contentType: form.contentType,
          platform: form.platform,
          extraInstructions: form.extraInstructions,
          graphicHeadline: form.graphicHeadline,
          heroObjects: form.heroObjects,
          campaignExpiry: form.campaignExpiry,
          wordCount: form.wordCount,
          hashtagCount: form.hashtagCount,
          workspaceId: workspaceId,
          brandKitId: form.brandKit === 'none' ? null : form.brandKit,
          brandDetails: form.brandKit === 'none' ? null : {
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
            logo: selectedKit?.logo_url || logo,
            logoDark,
            industry: selectedKit?.industry || industry,
            brandAudience: selectedKit?.target_audience || brandAudience,
            websiteUrl: selectedKit?.website_url || websiteUrl,
            phrasesToInclude: selectedKit?.phrases_to_include || phrasesToInclude,
            phrasesToAvoid: selectedKit?.phrases_to_avoid || phrasesToAvoid,
          },
          mentionBrandLogo: form.brandKit !== 'none' ? form.mentionBrandLogo : false,
          brandLogoPosition: form.brandLogoPosition,
          mentionWebsiteInPost: form.brandKit !== 'none' ? form.mentionWebsiteInPost : false,
          brandLinkPosition: form.brandLinkPosition,
          ctaPosition: form.ctaPosition,
          brandTitle: form.brandTitle,
          heroMessage: form.heroMessage,
          productImages: resolvedProductImages,
          productNames: resolvedProductNames,
          placementCategory: form.placementCategory || 'physical',
          layoutStyle: form.layoutStyle || null,
          ...(postId ? { postId, currentCaption: editedCaption || generated?.captions[selectedCaption] } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.code === 'REGEN_LIMIT_REACHED'
          ? data.error
          : data.code ? `[Error ${data.code}] ${data.error}` : data.error;
        throw new Error(errMsg || 'Failed to generate images');
      }
      return data;
    } finally {
      setIsGeneratingImages(false);
    }
  };

    const handleRegenerateCaptions = async () => {
    // Credit check
    if (checkLimitAndRedirect && checkLimitAndRedirect()) {
      return;
    }
    const postId = getCurrentPostId();
    try {
      const data = await generateCaptions(postId);
      if (data.captions) {
        // Append new captions to existing array (carousel behaviour)
        setGenerated(prev => {
          if (!prev) return null;
          const newCaptions = [...prev.captions, ...data.captions];
          return { ...prev, captions: newCaptions };
        });
        // Auto-select the newly generated caption
        setSelectedCaption(prev => {
          const currentLen = generated?.captions?.length || 0;
          return currentLen; // Index of the first new caption
        });

        // Insert new captions as drafts so they appear in Post History
        const supabase = createClient();
        const currentImageUrl = generated?.images[selectedImage]?.url || '';
        const draftsToInsert = data.captions.map((cap: string) => ({
          workspace_id: workspaceId,
          brand_kit_id: form.brandKit === 'none' ? null : form.brandKit,
          title: form.topic,
          platform: form.platform,
          content_type: form.contentType,
          status: 'draft',
          extra_instructions: form.extraInstructions,
          caption: cap,
          image_url: currentImageUrl,
          mention_brand_logo: form.mentionBrandLogo,
          brand_logo_position: form.brandLogoPosition,
          mention_website_in_post: form.mentionWebsiteInPost,
          brand_link_position: form.brandLinkPosition,
          mention_website_in_caption: form.mentionWebsiteInCaption,
          cta_text: form.ctaText || null,
          cta_position: form.ctaPosition || null,
          graphic_headline: form.graphicHeadline || null,
          hero_objects: form.heroObjects || null,
          campaign_expiry: form.campaignExpiry || null,
          word_count: form.wordCount,
          hashtag_count: form.hashtagCount,
          brand_title: form.brandTitle || null,
          hero_message: form.heroMessage || null,
          product_image_url: form.selectedProductIds.length > 0 
            ? JSON.stringify(form.selectedProductIds) 
            : (cachedProductDataRef.current?.selectedProductIds?.length 
              ? JSON.stringify(cachedProductDataRef.current.selectedProductIds) 
              : null),
        }));
        await supabase.from('posts').insert(draftsToInsert);
        refreshBrandData(true); // Reflect credits immediately on dashboard
      }
      // Deduct from local daily limit
      decrementCaptionRegen();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleRegenerateImages = async () => {
    // Credit check
    if (checkLimitAndRedirect && checkLimitAndRedirect()) {
      return;
    }
    const postId = getCurrentPostId();
    try {
      const data = await generateImages(postId);
      if (data.images) {
        // Append new images to existing array (carousel behaviour)
        setGenerated(prev => {
          if (!prev) return null;
          const newImages = [...prev.images, ...data.images];
          return { ...prev, images: newImages };
        });
        // Auto-select the newly generated image
        setSelectedImage(prev => {
          const currentLen = generated?.images?.length || 0;
          return currentLen; // Index of the first new image
        });
        refreshBrandData(true); // Reflect credits immediately on dashboard
      }
      // Deduct from local daily limit
      decrementImageRegen();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const [isSavingImage, setIsSavingImage] = useState(false);

  const handleSaveImage = async () => {
    if (!generated || generated.images.length === 0) return;
    const currentImageUrl = generated.images[selectedImage]?.url;
    const generatedPostId = generatedPostIds[selectedImage] || generated.images[selectedImage]?.id;
    
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
    newImages[selectedImage] = {
      ...newImages[selectedImage],
      url: editedImageUrl
    };
    setGenerated({ ...generated, images: newImages });
    setShowEditor(false);
  };

  const downloadImage = async () => {
    if (!generated?.images[selectedImage]?.url) return;
    try {
      const response = await fetch(generated.images[selectedImage].url);
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
    const selectedPost = generated?.images[selectedImage];
    
    if (!editId && !draftId && !selectedPost?.id) {
      alert('Error: No post ID found to update. Please regenerate images.');
      return;
    }

    if (selectedConnectionIds.length === 0) {
      alert('Please select at least one social connection to publish/schedule.');
      return;
    }

    setIsGenerating(true);
    hasCompletedDistributionRef.current = true;
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    try {
      const targetId = (editId || draftId || selectedPost?.id);
      const publishPostIds = [];

      // Load original brand kit ID from the draft
      const { data: existingDraft } = await supabase
        .from('posts')
        .select('brand_kit_id')
        .eq('id', targetId)
        .single();
      const brandKitId = existingDraft?.brand_kit_id || null;

      // Filter to selected connections
      const selectedConns = connections.filter(c => selectedConnectionIds.includes(c.id));

      // Resolve scheduled timestamp
      const scheduledAtISO = isImmediate
        ? null
        : new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();

      for (let i = 0; i < selectedConns.length; i++) {
        const conn = selectedConns[i];
        const mapping = connectionMappings[conn.id] || { imageIndex: 0, captionIndex: 0 };
        
        const mappedImage = generated?.images[mapping.imageIndex]?.url || selectedPost?.url || '';
        const mappedCaption = (mapping.captionIndex === selectedCaption && editedCaption)
          ? editedCaption
          : (generated?.captions[mapping.captionIndex] || editedCaption);

        const postData = {
          title: form.topic,
          caption: mappedCaption,
          platform: conn.platform,
          content_type: form.contentType,
          image_url: mappedImage,
          status: isImmediate ? 'published' : 'scheduled',
          scheduled_at: scheduledAtISO,
          workspace_id: workspaceId,
          extra_instructions: form.extraInstructions,
          mention_brand_logo: form.mentionBrandLogo,
          brand_logo_position: form.brandLogoPosition,
          mention_website_in_post: form.mentionWebsiteInPost,
          brand_link_position: form.brandLinkPosition,
          mention_website_in_caption: form.mentionWebsiteInCaption,
          cta_text: form.ctaText || null,
          cta_position: form.ctaPosition || null,
          graphic_headline: form.graphicHeadline || null,
          hero_objects: form.heroObjects || null,
          campaign_expiry: form.campaignExpiry || null,
          word_count: form.wordCount,
          hashtag_count: form.hashtagCount,
          brand_title: form.brandTitle || null,
          hero_message: form.heroMessage || null,
          placement_category: form.placementCategory || 'physical',
          layout_style: form.layoutStyle || null,
        };

        if (i === 0) {
          // Update the first post (which is our existing draft)
          const { error } = await supabase
            .from('posts')
            .update({
              ...postData,
              brand_kit_id: brandKitId
            })
            .eq('id', targetId);
          if (error) throw error;
          publishPostIds.push(targetId);
        } else {
          // Insert a new post row for other connections
          const { data: newPost, error } = await supabase
            .from('posts')
            .insert([{
              ...postData,
              brand_kit_id: brandKitId
            }])
            .select('id')
            .single();
          if (error) throw error;
          if (newPost?.id) {
            publishPostIds.push(newPost.id);
          } 
        }
      }

      // If immediate, trigger the actual social media publish for each post
      if (isImmediate) {
        const publishPromises = publishPostIds.map(async (id) => {
          try {
            const pubRes = await fetch('/api/social/publish', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ postId: id })
            });
            const pubData = await pubRes.json();
            if (!pubRes.ok) {
              console.warn(`Social publish failed for post ID ${id}:`, pubData.error);
              return { id, success: false, error: pubData.error };
            }
            return { id, success: true };
          } catch (pubErr: any) {
            console.error(`Publish API call failed for post ID ${id}:`, pubErr);
            return { id, success: false, error: pubErr.message };
          }
        });

        const publishResults = await Promise.all(publishPromises);
        const failures = publishResults.filter(r => !r.success);
        if (failures.length > 0) {
          alert(`Publishing completed with warnings. Failed channels: ${failures.map(f => f.error).join(', ')}`);
        } else {
          alert('All posts published successfully!');
        }
      } else {
        alert(selectedConns.length === 1
          ? 'Post scheduled successfully!'
          : `Posts scheduled successfully for ${selectedConns.length} channels!`
        );
      }

      router.push('/dashboard/posts');
    } catch (err: any) {
      console.error('Error saving post:', err);
      alert(err.message || 'Failed to save post.');
      // Re-enable auto-save on failure
      hasCompletedDistributionRef.current = false;
      autoSaveTimerRef.current = setInterval(() => {
        saveDraftToDb();
      }, 30000);
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
    
    const layoutStyles = [
      {
        id: 'commercial' as const,
        name: 'Commercial Showcase',
        desc: 'High-impact central focus, dramatic lighting spotlighting the product photo (Perfect for consumer retail items like a soda bottle).',
        icon: Sparkles,
        gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
      },
      {
        id: 'minimalist' as const,
        name: 'Minimalist Modern / Corporate',
        desc: 'Heavy use of negative brand color space, elegant crisp text alignment, crisp clean geometric shapes (Perfect for corporate branding or software tools).',
        icon: Minimize2,
        gradient: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
      },
      {
        id: 'editorial' as const,
        name: 'Editorial / Magazine Style',
        desc: 'Split presentation with large typography blocks framing a subject illustration or a clean educational background asset.',
        icon: Columns,
        gradient: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
      },
    ];

    return (
      <div className={styles.stepContent}>
        <h2 className={styles.stepTitle}>Choose a Layout Style</h2>
        <p className={styles.stepDesc}>Select a visual style baseline that fits your industry and ad convention.</p>
        <div className={styles.templateGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {layoutStyles.map((styleItem) => {
            const isSelected = form.layoutStyle === styleItem.id;
            const Icon = styleItem.icon;
            return (
              <button
                key={styleItem.id}
                className={`${styles.templateCard} ${isSelected ? styles.templateCardActive : ''}`}
                onClick={() => setForm({ ...form, layoutStyle: styleItem.id })}
              >
                <div 
                  className={styles.layoutStyleVisual}
                  style={{
                    background: styleItem.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '180px',
                    width: '100%',
                    borderRadius: '8px',
                    position: 'relative',
                    color: 'white',
                    boxShadow: isSelected ? '0 0 0 4px rgba(79, 70, 229, 0.2)' : 'none',
                    border: isSelected ? '2px solid var(--primary)' : '2px solid var(--border)'
                  }}
                >
                  <Icon size={44} strokeWidth={1.5} />
                  {isSelected && <div className={styles.templateCheck}><Check size={18} /></div>}
                </div>
                <span className={styles.templateName} style={{ marginTop: '0.5rem', display: 'block', fontSize: '1rem', fontWeight: 700 }}>
                  {styleItem.name}
                </span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0', lineHeight: 1.4 }}>
                  {styleItem.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Step 3: Input Form ─────────────────────────────────────────────
  const renderStep3 = () => (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>Tell us about your post</h2>
      <p className={styles.stepDesc}>Provide details so AI can generate the perfect content.</p>
      
      <div className={styles.step3Layout}>
        {/* Left Column: Post Details */}
        <div className={styles.step3Left}>
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

          <div className={styles.formGroup}>
            <label htmlFor="extra">Post Description / Context</label>
            <textarea
              id="extra"
              placeholder="Explain exactly what the post is about, any specific tone, details, offers, or context..."
              rows={4}
              value={form.extraInstructions}
              onChange={(e) => setForm({ ...form, extraInstructions: e.target.value })}
            />
          </div>

          <div className={styles.formRowTwo}>
            <div className={styles.formGroup}>
              <label htmlFor="brandKit">Brand Kit</label>
              <select
                id="brandKit"
                value={form.brandKit}
                onChange={handleBrandKitChange}
              >
                {brandKits.length > 0 ? (
                  brandKits.map(kit => (
                    <option key={kit.id} value={kit.id}>{kit.brand_kit_name}</option>
                  ))
                ) : (
                  <option value="main-brand">{brandKitName || businessName || 'Main Brand'}</option>
                )}
                <option value="none">No Brand Kit</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="placementCategory">Placement Category</label>
              <select
                id="placementCategory"
                value={form.placementCategory || 'physical'}
                onChange={(e) => setForm({ ...form, placementCategory: e.target.value as any })}
              >
                <option value="physical">Physical Product (Packaged Goods, Food, Bottles)</option>
                <option value="digital">Digital Service / Software Solution</option>
                <option value="institutional">Institutional / Informational Awareness</option>
              </select>
            </div>
          </div>

          {/* Product Selection Zone */}
          {form.brandKit !== 'none' && (
            <div className={styles.formGroup}>
              <label>Select Products <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>(Optional)</span></label>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>
                Select products from your brand kit to feature them in the generated poster. AI will use these to create the scene.
              </p>

              {availableProducts.length > 0 ? (
                <div className={styles.productSelectorGrid}>
                  {availableProducts.map(product => {
                    const isSelected = form.selectedProductIds.includes(product.id);
                    return (
                      <div 
                        key={product.id} 
                        className={`${styles.productSelectorCard} ${isSelected ? styles.productSelected : ''}`}
                        onClick={() => handleProductToggle(product.id)}
                      >
                        <div className={styles.productSelectorCheck}>
                          {isSelected && <Check size={14} strokeWidth={3} />}
                        </div>
                        <img src={product.image_url} alt={product.product_name || 'Product'} />
                        {product.product_name && <span className={styles.productSelectorName}>{product.product_name}</span>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.noProductsHint}>
                  <AlertTriangle size={18} />
                  <span>No products found in this brand kit. You can upload products in your Brand Kit settings.</span>
                </div>
              )}
            </div>
          )}

          <div className={styles.formRowTwo}>
            <div className={styles.formGroup}>
              <label htmlFor="campaignExpiry">Campaign Expiry (Optional)</label>
              <input
                id="campaignExpiry"
                type="date"
                value={form.campaignExpiry}
                onChange={(e) => setForm({ ...form, campaignExpiry: e.target.value })}
              />
            </div>
            <div className={styles.formGroup} />
          </div>

          <div className={styles.formRowTwo}>
            <div className={styles.formGroup}>
              <label htmlFor="graphicHeadline">Graphic Headline</label>
              <input
                id="graphicHeadline"
                type="text"
                placeholder="e.g. BUY 2 GET 1 FREE!"
                maxLength={80}
                value={form.graphicHeadline}
                onChange={(e) => setForm({ ...form, graphicHeadline: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label htmlFor="heroObjects" style={{ marginBottom: 0 }}>Hero Objects</label>
                {form.selectedProductIds.length > 0 && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 400, fontSize: '0.85rem', cursor: 'pointer', marginBottom: 0, color: 'var(--text-muted)' }}>
                    <input 
                      type="checkbox" 
                      checked={useProductAsHero} 
                      onChange={(e) => setUseProductAsHero(e.target.checked)}
                      style={{ width: 'auto', margin: 0, accentColor: 'var(--primary)' }}
                    />
                    as Product Image
                  </label>
                )}
              </div>
              <input
                id="heroObjects"
                type="text"
                placeholder="e.g. Fresh Bread Loaf, Phones"
                maxLength={200}
                value={form.selectedProductIds.length > 0 && useProductAsHero ? 'Using Selected Products' : form.heroObjects}
                disabled={form.selectedProductIds.length > 0 && useProductAsHero}
                onChange={(e) => setForm({ ...form, heroObjects: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.formRowTwo}>
            <div className={styles.formGroup}>
              <label htmlFor="brandTitle">Brand Title</label>
              <input
                id="brandTitle"
                type="text"
                placeholder="e.g. Bhonsala Military School"
                maxLength={80}
                value={form.brandTitle}
                onChange={(e) => setForm({ ...form, brandTitle: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="heroMessage">Hero Message</label>
              <input
                id="heroMessage"
                type="text"
                placeholder="e.g. Discipline, Consistency, Focus"
                maxLength={150}
                value={form.heroMessage}
                onChange={(e) => setForm({ ...form, heroMessage: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Settings & Rules */}
        <div className={styles.step3Right}>
          {form.brandKit !== 'none' && (
            <div className={styles.brandRulesCard}>
              <h3>Brand Identity Rules</h3>
              <p className={styles.cardSubtitle}>Ensure your brand assets are positioned correctly.</p>
              
              <div className={styles.rulesList}>
                {/* Logo Rule */}
                <div className={styles.ruleItem}>
                  <div className={styles.ruleHeader}>
                    <label className={styles.toggleContainer}>
                      <input
                        type="checkbox"
                        id="mentionBrandLogo"
                        checked={form.mentionBrandLogo}
                        onChange={(e) => setForm({ ...form, mentionBrandLogo: e.target.checked })}
                      />
                      <span className={styles.toggleSlider}></span>
                    </label>
                    <span className={styles.ruleLabel}>Include Brand Logo on Graphic</span>
                  </div>
                  {form.mentionBrandLogo && (
                    <div className={styles.ruleDetails}>
                      <label htmlFor="brandLogoPosition">Logo Position</label>
                      <input
                        id="brandLogoPosition"
                        type="text"
                        placeholder="e.g. Bottom Right"
                        value={form.brandLogoPosition}
                        onChange={(e) => setForm({ ...form, brandLogoPosition: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                {/* Website in Post Rule */}
                <div className={styles.ruleItem}>
                  <div className={styles.ruleHeader}>
                    <label className={styles.toggleContainer}>
                      <input
                        type="checkbox"
                        id="mentionWebsiteInPost"
                        checked={form.mentionWebsiteInPost}
                        onChange={(e) => setForm({ ...form, mentionWebsiteInPost: e.target.checked })}
                      />
                      <span className={styles.toggleSlider}></span>
                    </label>
                    <span className={styles.ruleLabel}>Include Website Link on Graphic</span>
                  </div>
                  {form.mentionWebsiteInPost && (
                    <div className={styles.ruleDetails}>
                      <label htmlFor="brandLinkPosition">Link Position</label>
                      <input
                        id="brandLinkPosition"
                        type="text"
                        placeholder="e.g. Bottom Left"
                        value={form.brandLinkPosition}
                        onChange={(e) => setForm({ ...form, brandLinkPosition: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                {/* CTA Rule */}
                <div className={styles.ruleItem}>
                  <div className={styles.ruleHeader}>
                    <span className={styles.ruleLabel}>Call-to-Action Button (Optional)</span>
                  </div>
                  <div className={styles.ruleInputGroup}>
                    <input
                      id="ctaText"
                      type="text"
                      placeholder="e.g. Shop Now, Learn More"
                      value={form.ctaText}
                      onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                    />
                  </div>
                  {form.ctaText.trim() && (
                    <div className={styles.ruleDetails} style={{ marginTop: '0.5rem', paddingLeft: 0 }}>
                      <label htmlFor="ctaPosition">CTA Position</label>
                      <input
                        id="ctaPosition"
                        type="text"
                        placeholder="e.g. Bottom Center"
                        value={form.ctaPosition}
                        onChange={(e) => setForm({ ...form, ctaPosition: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                {/* Caption Rule */}
                <div className={styles.ruleItem}>
                  <div className={styles.ruleHeader}>
                    <label className={styles.toggleContainer}>
                      <input
                        type="checkbox"
                        id="mentionWebsiteInCaption"
                        checked={form.mentionWebsiteInCaption}
                        onChange={(e) => setForm({ ...form, mentionWebsiteInCaption: e.target.checked })}
                      />
                      <span className={styles.toggleSlider}></span>
                    </label>
                    <span className={styles.ruleLabel}>Include Website Link in Caption</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Caption Tuning Settings */}
          <div className={styles.tuningCard}>
            <h3>Caption Settings</h3>
            <p className={styles.cardSubtitle}>Configure caption length and hashtag count.</p>
            <div className={styles.formRowTwo}>
              <div className={styles.formGroup}>
                <label htmlFor="wordCount">Caption Words</label>
                <input
                  id="wordCount"
                  type="number"
                  min={10}
                  max={500}
                  value={form.wordCount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setForm({ ...form, wordCount: '' as any });
                      return;
                    }
                    const parsed = parseInt(val);
                    if (!isNaN(parsed)) {
                      setForm({ ...form, wordCount: Math.min(500, Math.max(0, parsed)) });
                    }
                  }}
                  onBlur={(e) => {
                    const parsed = parseInt(e.target.value);
                    if (isNaN(parsed) || parsed < 10) {
                      setForm({ ...form, wordCount: 10 });
                    } else if (parsed > 500) {
                      setForm({ ...form, wordCount: 500 });
                    }
                  }}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="hashtagCount">Hashtags Count</label>
                <input
                  id="hashtagCount"
                  type="number"
                  min={0}
                  max={30}
                  value={form.hashtagCount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setForm({ ...form, hashtagCount: '' as any });
                      return;
                    }
                    const parsed = parseInt(val);
                    if (!isNaN(parsed)) {
                      setForm({ ...form, hashtagCount: Math.min(30, Math.max(0, parsed)) });
                    }
                  }}
                  onBlur={(e) => {
                    const parsed = parseInt(e.target.value);
                    if (isNaN(parsed) || parsed < 0) {
                      setForm({ ...form, hashtagCount: 0 });
                    } else if (parsed > 30) {
                      setForm({ ...form, hashtagCount: 30 });
                    }
                  }}
                />
              </div>
            </div>
          </div>
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
           'AI is crafting a caption and a image based on your inputs.'}
        </p>
        <div className={styles.generatingSteps}>
          <div className={`${styles.genStep} ${generationState !== 'stopped' ? styles.genStepActive : ''}`}>
            <Loader2 size={16} className={styles.spinner} style={{ animationPlayState: generationState === 'paused' || generationState === 'stopped' ? 'paused' : 'running' }} /> Analyzing brand tone &amp; style...
          </div>
          <div className={styles.genStep}>
            <Loader2 size={16} className={styles.spinner} style={{ animationPlayState: (isGenerating || isGeneratingCaptions) ? 'running' : 'paused' }} /> Generating captions via Gemini...
          </div>
          <div className={styles.genStep}>
            <Loader2 size={16} className={styles.spinner} style={{ animationPlayState: (isGenerating || isGeneratingImages) ? 'running' : 'paused' }} /> Creating images via Imagen...
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 5: Preview & Edit ─────────────────────────────────────────
  const renderStep5 = () => {
    if (!generated) return null;
    const hasMultipleImages = generated.images.length > 1;
    const hasMultipleCaptions = generated.captions.length > 1;

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
                    src={generated.images[selectedImage]?.url} 
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
                      <Edit3 size={18} />
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
            {/* ── Image Options Carousel ────────────────────────────── */}
            {hasMultipleImages && (
              <div className={styles.regenCarousel}>
                {generated.images.map((img, idx) => (
                  <button
                    key={idx}
                    className={`${styles.regenCard} ${selectedImage === idx ? styles.regenCardActive : ''}`}
                    onClick={() => setSelectedImage(idx)}
                    title={`Option ${idx + 1}`}
                  >
                    <img src={img.url} alt={`Option ${idx + 1}`} className={styles.regenThumb} />
                    <span className={styles.regenLabel}>Option {idx + 1}</span>
                  </button>
                ))}
              </div>
            )}

            <div className={styles.imageOptions} style={{ justifyContent: 'space-between' }}>
              <span className={styles.regenBadge}>
                {imageRegenAttempts > 0 
                  ? `${imageRegenAttempts} regen${imageRegenAttempts !== 1 ? 's' : ''} left today`
                  : 'Limit reached today'}
              </span>
              <button 
                className={`${styles.regenerateBtn} ${imageRegenAttempts <= 0 ? styles.regenDisabled : ''}`}
                onClick={handleRegenerateImages}
                disabled={isGeneratingImages || imageRegenAttempts <= 0}
                title={imageRegenAttempts <= 0 ? 'Daily regeneration limit reached (3/3)' : `Regenerate image (${imageRegenAttempts} left)`}
              >
                {isGeneratingImages ? <Loader2 size={14} className={styles.spinner} /> : <RefreshCw size={14} />}
                Regenerate Image
              </button>
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
            {/* ── Caption Options Carousel ──────────────────────────── */}
            {hasMultipleCaptions && (
              <div className={styles.regenCarousel}>
                {generated.captions.map((cap, idx) => (
                  <button
                    key={idx}
                    className={`${styles.regenCard} ${styles.regenCardCaption} ${selectedCaption === idx ? styles.regenCardActive : ''}`}
                    onClick={() => setSelectedCaption(idx)}
                    title={`Caption ${idx + 1}`}
                  >
                    <span className={styles.regenCaptionPreview}>
                      {cap.substring(0, 60)}{cap.length > 60 ? '…' : ''}
                    </span>
                    <span className={styles.regenLabel}>Caption {idx + 1}</span>
                  </button>
                ))}
              </div>
            )}

            <div className={styles.captionVariants}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className={styles.regenBadge}>
                  {captionRegenAttempts > 0 
                    ? `${captionRegenAttempts} regen${captionRegenAttempts !== 1 ? 's' : ''} left today`
                    : 'Limit reached today'}
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                      fontWeight: '500'
                    }}
                  >
                    {isSavingImage ? <Loader2 size={14} className={styles.spinner} /> : <Bookmark size={14} fill="none" />}
                    Save Image
                  </button>
                  <button 
                    className={`${styles.regenerateBtn} ${captionRegenAttempts <= 0 ? styles.regenDisabled : ''}`}
                    onClick={handleRegenerateCaptions}
                    disabled={isGeneratingCaptions || captionRegenAttempts <= 0}
                    title={captionRegenAttempts <= 0 ? 'Daily regeneration limit reached (3/3)' : `Regenerate caption (${captionRegenAttempts} left)`}
                  >
                    {isGeneratingCaptions ? <Loader2 size={14} className={styles.spinner} /> : <RefreshCw size={14} />}
                    Regenerate Caption
                  </button>
                </div>
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
                <span className={styles.metaLabel}>Content Type</span>
                <span className={styles.metaValue} style={{ textTransform: 'capitalize' }}>{form.contentType}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Step 6: Social Distribution ──────────────────────────────────
  const renderStep6 = () => {
    if (loadingConnections) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
          <Loader2 size={36} className={styles.spinner} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Loading your social accounts...</span>
        </div>
      );
    }

    if (connections.length === 0) {
      return (
        <div className={styles.stepContent}>
          <h2 className={styles.stepTitle}>Social Distribution</h2>
          <p className={styles.stepDesc}>Publish or schedule your post across channels.</p>
          <div className={styles.noConnectionsMessage}>
            <Share2 size={48} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            <h3>No connected social channels</h3>
            <p>You need to connect at least one Facebook Page or Instagram Business account to distribute your content.</p>
            <Link href="/dashboard/settings" className={styles.connectButton}>
              Go to Settings
            </Link>
          </div>
        </div>
      );
    }

    // Filter connections based on what's active / selected
    const selectedConns = connections.filter(c => selectedConnectionIds.includes(c.id));
    
    // Find preview connection for active tab
    const previewConn = selectedConns.find(c => c.platform === activePreviewPlatform) 
      || connections.find(c => c.platform === activePreviewPlatform);

    // Get preview asset indices
    const previewMapping = previewConn ? (connectionMappings[previewConn.id] || { imageIndex: 0, captionIndex: 0 }) : { imageIndex: selectedImage, captionIndex: selectedCaption };
    const previewImage = generated?.images[previewMapping.imageIndex]?.url || generated?.images[selectedImage]?.url || '';
    const previewCaption = (previewMapping.captionIndex === selectedCaption) 
      ? editedCaption 
      : (generated?.captions[previewMapping.captionIndex] || editedCaption);

    return (
      <div className={styles.stepContent}>
        <h2 className={styles.stepTitle}>Social Distribution</h2>
        <p className={styles.stepDesc}>Select channels, map your generated assets, and schedule publication.</p>

        <div className={styles.previewLayout}>
          {/* Left Column: Channels & Scheduling */}
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)', marginBottom: '1rem' }}>Select Accounts</h3>
            <div className={styles.connectionsList}>
              {connections.map((conn) => {
                const isSelected = selectedConnectionIds.includes(conn.id);
                const mapping = connectionMappings[conn.id] || { imageIndex: 0, captionIndex: 0 };
                
                return (
                  <div key={conn.id} className={`${styles.connectionCard} ${isSelected ? styles.connectionCardActive : ''}`}>
                    <div className={styles.connectionHeader}>
                      <input
                        type="checkbox"
                        className={styles.connectionCheckbox}
                        checked={isSelected}
                        onChange={() => {
                          setSelectedConnectionIds(prev => 
                            prev.includes(conn.id) ? prev.filter(id => id !== conn.id) : [...prev, conn.id]
                          );
                        }}
                      />
                      <div className={styles.connectionAvatar}>
                        {conn.picture_url ? (
                          <img src={conn.picture_url} alt={conn.page_name} />
                        ) : (
                          conn.page_name?.charAt(0) || 'P'
                        )}
                      </div>
                      <div className={styles.connectionDetails}>
                        <span className={styles.connectionName}>{conn.page_name}</span>
                        <span className={conn.platform === 'facebook' ? `${styles.connectionBadge} ${styles.connectionBadgeFb}` : `${styles.connectionBadge} ${styles.connectionBadgeIg}`}>
                          {conn.platform === 'facebook' ? <Facebook size={12} /> : <Instagram size={12} />}
                          {conn.platform === 'facebook' ? ' Facebook Page' : ' Instagram Business'}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className={styles.connectionSettings}>
                        <div className={styles.selectorGroup}>
                          <label>Image Option</label>
                          <select
                            value={mapping.imageIndex}
                            onChange={(e) => {
                              const newIndex = parseInt(e.target.value, 10);
                              setConnectionMappings(prev => ({
                                ...prev,
                                [conn.id]: { ...prev[conn.id], imageIndex: newIndex }
                              }));
                            }}
                          >
                            {generated?.images.map((_, idx) => (
                              <option key={idx} value={idx}>Option {idx + 1}</option>
                            ))}
                          </select>
                        </div>
                        <div className={styles.selectorGroup}>
                          <label>Caption Option</label>
                          <select
                            value={mapping.captionIndex}
                            onChange={(e) => {
                              const newIndex = parseInt(e.target.value, 10);
                              setConnectionMappings(prev => ({
                                ...prev,
                                [conn.id]: { ...prev[conn.id], captionIndex: newIndex }
                              }));
                            }}
                          >
                            {generated?.captions.map((cap, idx) => (
                              <option key={idx} value={idx}>Caption {idx + 1} ({cap.substring(0, 20)}...)</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Execution / Scheduler Card */}
            {selectedConnectionIds.length > 0 && (
              <div className={styles.schedulerCard}>
                <span className={styles.schedulerTitle}>Scheduling Options</span>
                <div className={styles.scheduleModeToggle} style={{ margin: 0 }}>
                  <button
                    className={`${styles.modeBtn} ${!isImmediate ? styles.modeBtnActive : ''}`}
                    onClick={() => setIsImmediate(false)}
                  >
                    <CalendarClock size={16} /> Schedule for Later
                  </button>
                  <button
                    className={`${styles.modeBtn} ${isImmediate ? styles.modeBtnActive : ''}`}
                    onClick={() => setIsImmediate(true)}
                  >
                    <Send size={16} /> Publish Now
                  </button>
                </div>

                {!isImmediate && (
                  <div className={styles.scheduleInputs} style={{ margin: 0 }}>
                    <div className={styles.customDateWrapper}>
                      <label htmlFor="distScheduleDate" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>Date</label>
                      <input
                        id="distScheduleDate"
                        type="text"
                        placeholder="DD/MM/YY"
                        value={formatDateToDDMMYY(scheduleDate)}
                        readOnly
                        onClick={() => {
                          const input = document.getElementById('distHiddenDateInput');
                          if (input) (input as any).showPicker();
                        }}
                      />
                      <input
                        id="distHiddenDateInput"
                        type="date"
                        className={styles.hiddenNativeDate}
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="distScheduleTime" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Time</label>
                      <input
                        id="distScheduleTime"
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        style={{ padding: '0.75rem 1rem' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Previews */}
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)', marginBottom: '1rem' }}>Platform Preview</h3>
            
            <div className={styles.previewTabs}>
              <button
                className={`${styles.previewTab} ${activePreviewPlatform === 'facebook' ? styles.previewTabActive : ''}`}
                onClick={() => setActivePreviewPlatform('facebook')}
              >
                Facebook Feed
              </button>
              <button
                className={`${styles.previewTab} ${activePreviewPlatform === 'instagram' ? styles.previewTabActive : ''}`}
                onClick={() => setActivePreviewPlatform('instagram')}
              >
                Instagram Feed
              </button>
            </div>

            {activePreviewPlatform === 'facebook' ? (
              <div className={styles.fbMockup}>
                <div className={styles.fbHeader}>
                  <div className={styles.fbAvatar}>
                    {previewConn?.picture_url ? (
                      <img src={previewConn.picture_url} alt={previewConn.page_name} />
                    ) : (
                      previewConn?.page_name?.charAt(0) || 'F'
                    )}
                  </div>
                  <div className={styles.fbHeaderInfo}>
                    <span className={styles.fbPageName}>{previewConn?.page_name || 'Facebook Page'}</span>
                    <span className={styles.fbPostTime}>
                      {isImmediate ? 'Just now' : `${formatDateToDDMMYY(scheduleDate) || 'Today'} at ${scheduleTime || '12:00'}`} · <Globe size={12} />
                    </span>
                  </div>
                </div>
                <div className={styles.fbTextContent}>
                  {previewCaption || 'This is where your Facebook caption will go...'}
                </div>
                <div className={styles.fbImageContent}>
                  {previewImage ? (
                    <img src={previewImage} alt="Facebook Post Preview" />
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No image option selected</div>
                  )}
                </div>
                <div className={styles.fbActions}>
                  <button className={styles.fbActionBtn}>Like</button>
                  <button className={styles.fbActionBtn}>Comment</button>
                  <button className={styles.fbActionBtn}>Share</button>
                </div>
              </div>
            ) : (
              <div className={styles.igMockup}>
                <div className={styles.igHeader}>
                  <div className={styles.igAvatar}>
                    {previewConn?.picture_url ? (
                      <img src={previewConn.picture_url} alt={previewConn.page_name} />
                    ) : (
                      previewConn?.page_name?.charAt(0) || 'I'
                    )}
                  </div>
                  <span className={styles.igUsername}>
                    {previewConn?.page_name?.toLowerCase().replace(/\s+/g, '_') || 'instagram_account'}
                  </span>
                </div>
                <div className={styles.igImageContent}>
                  {previewImage ? (
                    <img src={previewImage} alt="Instagram Post Preview" />
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No image option selected</div>
                  )}
                </div>
                <div className={styles.igActions}>
                  <Heart size={20} className={styles.igActionIcon} />
                  <MessageCircle size={20} className={styles.igActionIcon} />
                  <Send size={20} className={styles.igActionIcon} />
                  <Bookmark size={20} className={styles.igActionIcon} style={{ marginLeft: 'auto' }} />
                </div>
                <div className={styles.igDetails}>
                  <div className={styles.igCaption}>
                    <span className={styles.igCaptionUsername}>
                      {previewConn?.page_name?.toLowerCase().replace(/\s+/g, '_') || 'instagram_account'}
                    </span>
                    {previewCaption || 'This is where your Instagram caption will go...'}
                  </div>
                  <div className={styles.igTime}>
                    {isImmediate ? 'Just now' : `${formatDateToDDMMYY(scheduleDate) || 'TODAY'} · ${scheduleTime || '12:00'}`}
                  </div>
                </div>
              </div>
            )}
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
        {step === 6 && renderStep6()}
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
              type="button"
              className={styles.generateBtn}
              disabled={!canProceedStep4}
              onClick={handleGenerateFull}
            >
              <Sparkles size={18} /> Generate with AI
            </button>
          )}
          {step === 5 && (
            <>
              <button className={styles.scheduleBtn} onClick={() => setStep(6)}>
                Next: Distribution <ArrowRight size={18} />
              </button>
            </>
          )}
          {step === 6 && (
            <button
              className={styles.scheduleBtn}
              onClick={handleConfirmSchedule}
              disabled={isGenerating || selectedConnectionIds.length === 0}
            >
              {isGenerating ? <Loader2 size={16} className={styles.spinner} /> : (
                isImmediate ? (
                  <><Send size={16} /> Publish Now</>
                ) : (
                  <><CalendarClock size={16} /> Schedule Distribution</>
                )
              )}
            </button>
          )}
        </div>
      </div>
      {showEditor && generated && (
        <ImageEditor
          key={`editor-${selectedImage}-${generated.images[selectedImage]?.url}`}
          imageUrl={generated.images[selectedImage]?.url}
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
