// ── Negative Prompt Baseline ─────────────────────────────────────────
// Quality-control floor appended to every image generation call. Lists
// universal failure modes — NOT creative content (cultural motifs,
// brand-tone interpretation, content-type design) which is derived
// dynamically by the LLM from user inputs.
export const NEGATIVE_PROMPT_BASELINE = `blurry, low quality, pixelated, jpeg artifacts, poorly drawn, deformed faces, fused fingers, extra limbs, bad anatomy, watermark, stock photo overlay, text artifacts, cropped letters, illegible writing, misspelled words, gibberish text, warped typography, oversaturated, harsh flash, cluttered composition, isolated single subject on empty plain background, plain solid-coloured full-width banner strip across top or bottom, generic flat coloured navigation bar look, low resolution, grainy, noisy, painted URL text, painted website address, http://, https://, www., domain name in image, browser address bar, search bar UI, magnifying glass icon with text, made-up URL gibberish, painted CTA button, "Click Here" button, "Visit Our Website" chip, "Shop Now" pill, painted action buttons, duplicate overlay elements`;

// ── Platform Aspect Ratios ───────────────────────────────────────────
// Technical mapping — not creative — so it stays here.
export const PLATFORM_RATIOS: Record<string, string> = {
  instagram: '1:1',
  facebook: '4:5',
  both: '1:1',
};

// Normalise comma-separated strings or arrays into a clean string list.
function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

// ── Main Expansion Prompt Builder (fully dynamic) ────────────────────
// There are NO hardcoded festival libraries, brand-tone style tables, or
// content-type design templates. The LLM is taught a REASONING PIPELINE
// that interprets every input from first principles — so any topic,
// tone, industry, or occasion is handled without code changes.
export const getImageExpansionPrompt = (
  brandDetails: any,
  topic: string,
  contentType: string,
  platform: string,
  extraInstructions: string,
  graphicHeadline?: string,
  heroObjects?: string,
  mentionBrandLogo?: boolean,
  brandLogoPosition?: string,
  mentionWebsiteInPost?: boolean,
  brandLinkPosition?: string,
  ctaText?: string,
  ctaPosition?: string
) => {
  const aspectRatio = PLATFORM_RATIOS[platform] || '1:1';
  const phrasesToInclude = asList(brandDetails?.phrasesToInclude);
  const phrasesToAvoid = asList(brandDetails?.phrasesToAvoid);
  const hasUrlChip = mentionWebsiteInPost && brandDetails?.websiteUrl;
  const hasCtaButton = !!(ctaText && String(ctaText).trim());

  // Each composited UI element needs a "quiet zone" reserved in the AI
  // artwork so the overlay doesn't fight the design underneath. We list
  // every reserved zone so the model knows to keep those areas clean.
  const reservedZones: string[] = [];
  if (mentionBrandLogo && brandDetails?.logo) {
    reservedZones.push(`a clean uncluttered ~22% × 22% LOGO quiet zone at [${brandLogoPosition || 'Bottom Right'}]`);
  }
  if (hasUrlChip) {
    reservedZones.push(`a horizontal ~55% × 7% URL CHIP quiet zone at [${brandLinkPosition || 'Bottom Center'}] (a pixel-perfect browser-style search-bar pill will be pasted there)`);
  }
  if (hasCtaButton) {
    reservedZones.push(`a compact ~28% × 9% CTA BUTTON quiet zone at [${ctaPosition || 'Bottom Center'}]`);
  }
  const reservedBlock = reservedZones.length ? `

POST-GENERATION OVERLAYS — RESERVED ZONES (CRITICAL):
After this image is generated, the following elements will be PASTED ON TOP by a separate system with pixel-perfect typography. You MUST leave each listed zone visually quiet — calm low-contrast backdrop, NO text, NO faces, NO decorative elements, NO painted versions of these elements. The rest of the composition stays rich and detailed.
${reservedZones.map((z, i) => `  ${i + 1}. ${z}`).join('\n')}
Specifically: DO NOT draw a logo/wordmark in the logo zone; DO NOT draw a URL, website address, browser-bar, address-pill or "https://" anywhere; DO NOT draw a button, "Click Here", "Shop Now", "Register" or similar CTA chip. Those are all rendered later by overlay. Painting them yourself will result in DUPLICATED elements stacked on top of each other.` : '';

  const brandBlock = brandDetails ? `
BRAND DETAILS (interpret and honour these dynamically — do NOT map to a fixed template):
- Business Name: "${brandDetails.businessName || ''}"
- Industry: "${brandDetails.industry || ''}"
- Target Audience: "${brandDetails.brandAudience || ''}"
- Brand Description: "${brandDetails.brandDescription || ''}"
- Brand Tone (free-form keywords — translate semantically into a matching artistic style): "${brandDetails.brandTone || ''}"
- Colour Palette: Primary ${brandDetails.colors?.primary || '(unspecified)'}, Secondary ${brandDetails.colors?.secondary || '(unspecified)'}, Accent ${brandDetails.colors?.accent || '(unspecified)'}
- Website: ${brandDetails.websiteUrl || '(none)'}
- Logo present: ${brandDetails.logo ? 'yes — reflect identity via palette and typography only; do NOT attempt to fetch or render the URL' : 'no'}${brandDetails.logo && mentionBrandLogo ? `\n- Logo handling: the user\'s real logo file will be PASTED onto the poster after generation at [${brandLogoPosition || 'Bottom Right'}]. You MUST NOT draw a logo, wordmark, monogram, badge or any brand mark in that corner. Reserve a clean uncluttered "quiet zone" there (roughly 22% × 22%) with calm, low-contrast background and NO text, NO decorative elements, NO faces — just an empty area suitable for an overlaid logo. The rest of the composition stays rich.` : ''}
${phrasesToInclude.length ? `- Approved phrases — usable as on-image microcopy (urgency chip, subtitle) where natural: ${phrasesToInclude.join(' | ')}` : ''}
${phrasesToAvoid.length ? `- Forbidden phrases — these MUST NEVER appear in any image text: ${phrasesToAvoid.join(' | ')}` : ''}
` : `
NO BRAND KIT PROVIDED — derive the design language entirely from the Topic, Post Description, Hero Objects and Content Type. Use a sophisticated, modern aesthetic.
`;

  // Build the hard-priority anti-paint block. Anything in here is a
  // post-generation overlay; if the model paints its own version, the user
  // sees DUPLICATE garbage (e.g. an AI-painted "uttp://arn.bo" sitting under
  // the real URL chip overlay). This rule is so commonly violated by image
  // models that we promote it to the very TOP of the prompt with concrete
  // anti-patterns the model can recognise and refuse.
  const antiPaintItems: string[] = [];
  if (mentionBrandLogo && brandDetails?.logo) {
    antiPaintItems.push(`• ABSOLUTELY NO LOGO / WORDMARK / MONOGRAM / BRAND BADGE rendered anywhere on the image, especially at [${brandLogoPosition || 'Bottom Right'}]. The real logo file is pasted there after generation.`);
  }
  if (hasUrlChip) {
    antiPaintItems.push(`• ABSOLUTELY NO URL, DOMAIN NAME, WEBSITE ADDRESS, OR BROWSER ADDRESS BAR rendered anywhere on the image. This includes: "http://", "https://", "www.", any "${(brandDetails?.websiteUrl || '').replace(/^https?:\/\//i, '').replace(/\/$/, '')}", any rounded white pill with a magnifying glass icon, any "search bar" UI element, any partial / blurred / illegible / made-up URL text. A real polished URL chip is pasted post-generation. Painting your own creates DUPLICATE GIBBERISH text underneath the real overlay — this is the single worst failure mode.`);
  }
  if (hasCtaButton) {
    antiPaintItems.push(`• ABSOLUTELY NO CTA BUTTON, action chip, "${(ctaText || '').toUpperCase()}", "CLICK HERE", "SHOP NOW", "VISIT", "BUY NOW", "REGISTER", "LEARN MORE", or any similar call-to-action pill / button anywhere on the image. The real CTA button is pasted post-generation. Painting your own creates a duplicate.`);
  }
  const antiPaintBlock = antiPaintItems.length ? `

╔══════════════════════════════════════════════════════════════════╗
║ HIGHEST-PRIORITY RULES — VIOLATION RUINS THE OUTPUT             ║
╚══════════════════════════════════════════════════════════════════╝
The following elements will be COMPOSITED on top of the generated image after the fact by a separate pixel-perfect system. They must NEVER be drawn by you:
${antiPaintItems.join('\n')}

Instead of painting these elements, RESERVE clean quiet space at the listed positions: calm low-contrast background, no text, no faces, no decorative clutter. The rest of the composition stays rich and detailed — only those small reserved zones stay quiet.

` : '';

  return `
You are an Elite Creative Strategist and Graphic Designer specialising in high-impact social media marketing posters. You design every poster FROM FIRST PRINCIPLES based on the specific inputs given — you do NOT rely on stock templates, fixed style libraries, or generic defaults.

YOUR TASK: Produce ONE detailed, production-ready image generation prompt for a marketing poster.

OUTPUT FORMAT — return ONLY a JSON object in this exact shape (no markdown fences, no commentary):
{"expandedPrompts": ["<single rich paragraph describing the poster>"], "negativePrompt": "<comma-separated things to avoid in THIS image>", "design_rationale": "<2-3 sentence reasoning>"}
${antiPaintBlock}
DYNAMIC REASONING PIPELINE — work through these silently before writing the final prompt. Every decision must be derived from the user's actual inputs, not from generic defaults:

STEP 1 — TOPIC INTERPRETATION
Read the Topic string and decide what kind of subject it names:
  (a) A specific cultural / religious festival or holiday (Diwali, Christmas, Eid, Lunar New Year, Hanukkah, Holi, Thanksgiving, Onam, Pongal, Songkran, Raksha Bandhan, Navratri, etc.) — if so, recall the AUTHENTIC visual vocabulary of that occasion: traditional motifs, signature ritual objects, characteristic colour palette, typical lighting, scene atmosphere. Be culturally accurate, not generic. Resist clichés (e.g. "just a single firework" for Diwali when the occasion has diyas, marigolds, rangoli, sweets, sparklers, family scenes).
  (b) A seasonal or weather event (summer sale, monsoon, autumn, winter) — translate to atmospheric cues.
  (c) A product launch, milestone, announcement, or generic theme — derive imagery from Industry + Post Description.
If the Topic is sparse or one-word, expand it using the Post Description and Industry. Never produce a literal one-word interpretation when richer context is available.

STEP 2 — BRAND TONE INTERPRETATION
Treat the Brand Tone keywords as free-form descriptors and translate them semantically into concrete artistic choices:
  - lighting (golden hour, hard rim, soft diffuse, neon, candlelit, studio, overcast)
  - typography character (thin serif, condensed sans, rounded, geometric, brushed)
  - composition feel (editorial, dynamic, minimal, playful, cinematic)
  - texture / finish (matte, glossy, grainy film, polished)
Interpret unusual or compound tones by reasoning about their meaning — do not match against a fixed lookup.

STEP 3 — CONTENT TYPE INTENT
The Content Type names the COMMERCIAL goal. Derive the design language from intent:
  - offer/sale → the discount or price IS the hero; urgency cues; high contrast; one strong CTA chip.
  - festive → authentic occasion atmosphere first, brand/offer integrated subtly.
  - informational → editorial layout, hierarchy, restrained palette, generous whitespace.
  - general → lifestyle-led, aspirational, brand-forward.
Blend with cultural context from Step 1 where they overlap (e.g. a festive offer = rich occasion scene + bold price hero).

STEP 3b — HEADLINE TREATMENT RECIPE (pick ONE that matches the content type and brand tone — describe it explicitly in the final paragraph so the image model renders it precisely):
  • CARD-HERO — large bold headline set inside a soft cream/off-white rounded rectangle at the top, generous padding, subtle drop shadow. Best for OFFER posters where the price is the hero (e.g. "30% OFF" set in a heavyweight rounded sans inside a pale card).
  • EYEBROW + PILL — two-tier treatment: a short eyebrow line in plain confident text on top ("TURN YOUR INNINGS INTO"), then the main payoff line set in heavy bold uppercase inside a tight rounded pill chip filled with an accent colour ("UNFORGETTABLE RECORDS" in a yellow pill). Best for editorial / sports / announcement posters where there is a build-up phrase + a punchline.
  • OUTLINED DISPLAY — large display headline with a heavy stroke outline only (no fill), or filled with the background colour and stroked with the accent. Best for energetic / sports / youth-targeted compositions.
  • EDITORIAL SERIF — refined serif headline, restrained sizing, thin underline rule, generous whitespace around it. Best for informational / luxury / professional content.
  • FESTIVE GOLD/CREAM — headline in a warm gold or cream-on-deep-tone treatment, possibly with a thin ornamental rule above. Best for festivals and cultural occasions.
Always name the chosen treatment in the final paragraph and describe its colour callouts, weight, casing and pill/card colour exactly so the image model can render it consistently. The headline is the HERO of the poster — give it strong size and presence.

STEP 4 — SCENE INVENTORY (CRITICAL — most failures happen here)
List every visible element the final image MUST contain, in priority order:
  1. PRIMARY HERO SUBJECT — the focal point: ${heroObjects ? `"${heroObjects}"` : '(derive from Topic + Post Description)'}
  2. REQUIRED SUPPORTING SCENE ELEMENTS — these are MANDATORY, not optional flavour:
       • Every element described in the Post Description (people, objects, mood, action)
       • Every cultural / contextual motif you identified in Step 1
       • Atmospheric backdrop appropriate to the tone
     Render these supporting elements visibly somewhere in the composition (foreground, midground, atmospheric background or soft bokeh). DO NOT strip them out to "simplify" the composition. Stripping them is the most common failure mode of poster generation — explicitly resist it.
  3. TYPOGRAPHY — headline ${graphicHeadline ? `"${graphicHeadline}"` : '(generate a short punchy headline)'} rendered using the chosen treatment recipe from Step 3b${mentionBrandLogo && brandDetails?.logo ? '. DO NOT paint a brand wordmark, monogram or logo at the logo corner (the real logo will be pasted there post-generation)' : ', plus a discreet brand wordmark integrated into the artwork'}${hasUrlChip ? '. DO NOT paint the website URL or any browser-style address bar anywhere on the image (a real URL chip will be pasted post-generation)' : ''}${hasCtaButton ? '. DO NOT paint any CTA button, "Click Here", "Shop Now" or similar chip (the real CTA will be pasted post-generation)' : ''}.

STEP 5 — COLOUR & LAYOUT
Map the brand hex codes to specific regions of the composition (primary for dominant tone, secondary for accents, accent for highlights). DO NOT substitute the supplied hex codes.
LAYOUT PRINCIPLES — favour elegant integration over rigid zoning:
  - ${mentionBrandLogo && brandDetails?.logo ? `The [${brandLogoPosition || 'Bottom Right'}] corner is RESERVED for the real logo overlay — keep it visually quiet (calm low-contrast backdrop, no text, no faces, no decorative elements, no painted wordmark there).` : 'Integrate the brand wordmark discreetly into the artwork (refined wordmark at top with a thin ornamental rule, transparent overlay, or quiet corner placement).'} DO NOT paint a solid full-width coloured rectangular banner strip across the top or bottom — that pattern looks generic and cheap and will be rejected.
  - Hero headline occupies the optical centre (or top, depending on the chosen treatment) with strong size, weight and presence — it is the primary visual draw.
  - Any post-generation overlay zones (logo / URL chip / CTA button) MUST be kept visually quiet — DO NOT paint duplicates of those elements anywhere on the image.

STEP 6 — WRITE THE FINAL PROMPT
Compose ONE rich paragraph naming every element from your Scene Inventory EXPLICITLY. Use ultra-specific visual descriptors (lighting direction, materials, depth of field, camera feel, textures, colour callouts by hex). Mentioning each required element by name prevents the downstream image model from dropping it.

QUALITY RULES (always apply):
- Photorealistic, ultra-HD 8k, sharp focus, magazine-quality finish.
- Every letter in the image must be perfectly spelled, crisp, high-contrast English.
- Aspect ratio: ${aspectRatio} for ${platform}.
- Forbidden layout: single isolated subject on empty background framed by solid coloured top/bottom banner strips.

USER INPUTS:
- Topic: "${topic || ''}"
- Content Type: "${contentType || ''}"
- Platform: "${platform || ''}"
- Post Description: "${extraInstructions || '(none)'}"
- Graphic Headline (must print on image as largest text element): "${graphicHeadline || '(none — generate one)'}"
- Hero Objects (primary focal subject): "${heroObjects || '(none — derive from above)'}"
- Brand logo overlay (pasted post-generation): ${mentionBrandLogo && brandDetails?.logo ? `yes, at [${brandLogoPosition || 'Bottom Right'}]` : 'no'}
- Website URL chip overlay (pasted post-generation): ${hasUrlChip ? `yes, "${brandDetails?.websiteUrl || ''}" at [${brandLinkPosition || 'Bottom Center'}]` : 'no'}
- CTA button overlay (pasted post-generation): ${hasCtaButton ? `yes, "${ctaText}" at [${ctaPosition || 'Bottom Center'}]` : 'no'}

${brandBlock}${reservedBlock}

NEGATIVE PROMPT GUIDANCE — for the "negativePrompt" field, list things to AVOID for THIS specific image. At minimum include: plain solid-colour top or bottom banner strip, isolated hero on empty background, missing supporting scene elements, deformed or misspelled text, generic stock-photo look${reservedZones.length ? `, painted logos / wordmarks / monograms at any reserved zone, ANY painted URL or domain text (http, https, www, .com, address bar, search bar, browser pill, magnifying-glass icon next to text, blurred or partial URLs, made-up domains like "uttp://" or "arn.bo"), ANY painted CTA button or call-to-action chip ("Click Here", "Visit Our Website", "Shop Now", "Register", "Buy Now", "Learn More"), duplicated overlays — every one of these elements is pasted post-generation and painting your own creates ugly duplicates` : ''}${phrasesToAvoid.length ? `, and these words must never appear in any image text: ${phrasesToAvoid.join(', ')}` : ''}. Add anything else specific to this image's risks.

Now run the reasoning pipeline silently, then output ONLY the JSON object.
`;
};
