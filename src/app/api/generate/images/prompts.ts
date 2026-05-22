// ── Negative Prompt Baseline ─────────────────────────────────────────
// Appended to every image generation call to eliminate common artifacts.
export const NEGATIVE_PROMPT_BASELINE = `blurry, low quality, pixelated, jpeg artifacts, poorly drawn, deformed, extra limbs, fused fingers, bad anatomy, watermark, text artifacts, cropped text, illegible writing, misspelled words, oversaturated, harsh lighting, messy composition, cluttered background, stock photo watermark, low resolution, grainy, noisy`;

// ── Platform Aspect Ratios ───────────────────────────────────────────
export const PLATFORM_RATIOS: Record<string, string> = {
  instagram: '1:1',
  facebook: '4:5',
  both: '1:1',
};

// ── Content-Type Specific Design Guide ───────────────────────────────
export const CONTENT_TYPE_GUIDE: Record<string, string> = {
  offer: 'BOLD discount text, clear CTA button, high contrast, urgent but premium feel. Use large price/percentage numbers. Banner-style layout with attention-grabbing hierarchy.',
  festive: 'Festive decorations, warm golden lighting, celebratory mood, rich jewel-tone colors, ornamental borders, traditional motifs blended with modern design.',
  informational: 'Editorial layout, plenty of whitespace, authoritative tone, clean sections, subtle icons, professional and trustworthy feel.',
  general: 'Lifestyle-focused, aspirational imagery, balanced composition, brand-forward design with elegant typography and subtle gradient backgrounds.',
};

// ── Style Library: Brand Tone → Artistic Keywords ────────────────────
const BRAND_TONE_STYLES: Record<string, string> = {
  elegant: 'cinematic lighting, high-end fashion editorial, deep shadows, metallic accents, luxury magazine aesthetic',
  luxury: 'cinematic lighting, high-end fashion editorial, deep shadows, metallic accents, luxury magazine aesthetic',
  minimalist: 'clean negative space, Swiss design, geometric precision, muted palette, editorial whitespace',
  playful: 'vibrant pop art, bold flat colors, dynamic composition, playful typography, energetic layout',
  fun: 'vibrant pop art, bold flat colors, dynamic composition, playful typography, energetic layout',
  trustworthy: 'clean corporate memphis design, soft gradients, professional, ample negative space, structured grid',
  corporate: 'clean corporate memphis design, soft gradients, professional, ample negative space, structured grid',
  modern: 'sleek gradients, neon accents, futuristic sans-serif typography, dark backgrounds with vibrant highlights',
  warm: 'golden hour lighting, natural textures, earth tones, cozy atmosphere, soft focus backgrounds',
  bold: 'high contrast, saturated colors, dramatic lighting, impactful typography, strong geometric shapes',
};

function getStyleKeywords(brandTone: string | undefined): string {
  if (!brandTone) return 'professional, clean, modern design aesthetic';
  const toneLower = brandTone.toLowerCase();
  for (const [key, style] of Object.entries(BRAND_TONE_STYLES)) {
    if (toneLower.includes(key)) return style;
  }
  return 'professional, clean, modern design aesthetic';
}

// ── Few-Shot Example ─────────────────────────────────────────────────
const FEW_SHOT_OFFER_EXAMPLE = `
EXAMPLE of a top-quality prompt (for reference only, DO NOT copy this verbatim):
"An ultra-premium, 8k marketing poster for a modern clothing brand. Deep obsidian background (#1A1A1A). A golden spotlight illuminates a neatly folded stack of luxury apparel. Bold, razor-sharp white sans-serif text at the very top: 'EXCLUSIVE DIWALI OFFER'. In the centre, a large gold badge with clean serif text: '30% OFF'. Bottom footer area: 'Use Code DIWALI30' in small, crisp gold letters on a dark strip. Cinematic depth of field, bokeh highlights, no clutter, minimalist luxury aesthetic. Business name 'LUXE THREADS' in top-left corner in elegant thin serif."
`;

// ── Main Expansion Prompt Builder ────────────────────────────────────
export const getImageExpansionPrompt = (
  brandDetails: any,
  topic: string,
  contentType: string,
  platform: string,
  extraInstructions: string,
  graphicHeadline?: string,
  heroObjects?: string
) => {
  const aspectRatio = PLATFORM_RATIOS[platform] || '1:1';
  const contentGuide = CONTENT_TYPE_GUIDE[contentType] || CONTENT_TYPE_GUIDE.general;
  const styleKeywords = brandDetails ? getStyleKeywords(brandDetails.brandTone) : 'professional, clean, modern design aesthetic';

  const brandContext = brandDetails ? `
  BRAND DATABASE (STRICTLY ADHERE TO THESE):
  - Business Name: "${brandDetails.businessName}"
  - Industry: "${brandDetails.industry || 'Not specified'}"
  - Target Audience: "${brandDetails.brandAudience || 'General audience'}"
  - Logo Reference: ${brandDetails.logo ? `A logo exists for this brand. Integrate the brand identity visually through color and typography. Do NOT attempt to fetch or render the logo URL.` : 'Use premium professional typography for branding.'}
  - Color Palette: Primary ${brandDetails.colors?.primary || '#4F46E5'}, Secondary ${brandDetails.colors?.secondary || '#7C3AED'}, Accent ${brandDetails.colors?.accent || '#F59E0B'}
  - Brand Tone: ${brandDetails.brandTone || 'professional'}
  - Artistic Style: ${styleKeywords}

  BRAND LAYOUT RULES:
  1. TOP ZONE: Premium branding area – place "${brandDetails.businessName}" in bold, high-contrast, large font using brand Primary color.
  2. CENTRE ZONE: Main visual content and key message text.
  3. BOTTOM ZONE: Clean footer with CTA, coupon code, or tagline.
  ` : `
  DESIGN FREEDOM: No specific brand kit is selected. Rely entirely on the user's Post Description and Topic to determine the design, colors, and typography. Use a sophisticated, modern aesthetic.
  `;

  const visualGeometryContext = `
  VISUAL GEOMETRY AND STRUCTURAL INSTRUCTIONS (CRITICAL):
  ${graphicHeadline ? `Headline to print directly on the graphic: "${graphicHeadline}". This MUST be printed boldly and visibly as the main text element.` : 'Generate an appropriate short headline based on the topic.'}
  ${heroObjects ? `Main focal items to display visually: ${heroObjects}. Make sure these elements are the primary visual focus of the composition.` : 'Determine appropriate hero visual objects based on the topic.'}
  `;

  return `
You are an Elite Creative Strategist and Graphic Designer specialising in high-impact social media marketing posters.

YOUR TASK: Generate ONE detailed, production-ready image prompt for a ${contentType} marketing poster.

You MUST output a JSON object with EXACTLY this structure (no markdown, no extra text):
{"expandedPrompts": ["detailed prompt text"], "negativePrompt": "things to avoid", "design_rationale": "brief reasoning"}

FOLLOW THIS STEP-BY-STEP REASONING before writing the final prompt:
1. VISUAL HIERARCHY: Decide what catches the eye first (headline/offer), second (supporting visual), third (CTA/brand).
2. COLOR ZONES: Assign the brand colours (#primary, #secondary, #accent) to specific areas of the poster.
3. TYPOGRAPHY PLAN: Business name location (top), main headline size/position (centre, large), CTA placement (bottom).
4. ARTISTIC STYLE: Select style keywords matching the brand tone.
5. FINAL PROMPT: Write the prompt using ultra-specific visual descriptors (lighting, materials, camera angle, textures).

CRITICAL RULES FOR THE PROMPT:
- IMAGE QUALITY: Ultra-HD, 8k resolution, photorealistic rendering, razor-sharp focus, NO BLUR.
- TEXT CLARITY: Every letter MUST be sharp, crisp, perfectly spelled, and clearly readable. Use high-contrast text against its background.
- LANGUAGE: All text in the image MUST be in CLEAR, FLUENT ENGLISH.
- ASPECT RATIO: Design for ${aspectRatio} aspect ratio (${platform} optimised).
- TEXT PLACEMENT: Business name at the very top in bold high-contrast font. Main offer/headline centred and largest. CTA/coupon at the bottom, clean and legible.
- Describe exact positions: "top-centre", "bottom-left", "perfectly centred", "prominent and unmissable".

CONTENT-TYPE DESIGN RULES (${contentType}):
${contentGuide}

USER INPUTS:
Topic: ${topic}
Post Context & Offers: ${extraInstructions || 'No specific extra instructions provided. Rely on topic and brand details.'}
${visualGeometryContext}

Now, reason step-by-step and then provide the JSON output:

${brandContext}

${FEW_SHOT_OFFER_EXAMPLE}

The "negativePrompt" field should list things to AVOID in this specific image (e.g., cluttered background, deformed text, low contrast). Be specific to the content type.

Now generate the JSON object.
`;
};
