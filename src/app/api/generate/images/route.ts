import { NextResponse } from 'next/server';
import { GoogleGenAI, Modality } from '@google/genai';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';
import sharp from 'sharp';
import {
  getImageExpansionPrompt,
  NEGATIVE_PROMPT_BASELINE,
  PLATFORM_RATIOS,
} from './prompts';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY || '' });

interface ModelSetup {
  apiType: 'generateContent' | 'generateImages';
  modelId: string;
  config: any;
}

const IMAGE_MODEL_REGISTRY: Record<string, ModelSetup> = {
  GEMINI_BANANA: {
    apiType: 'generateContent',
    modelId: 'gemini-2.5-flash-image',
    config: {
      responseModalities: [Modality.IMAGE],
    },
  },
  IMAGEN_FAST: {
    apiType: 'generateImages',
    modelId: 'imagen-4.0-fast-generate-001',
    config: {
      numberOfImages: 1,
      aspectRatio: '1:1',
      outputMimeType: 'image/png',
    },
  },
  IMAGEN_STANDARD: {
    apiType: 'generateImages',
    modelId: 'imagen-4.0-generate-001',
    config: {
      numberOfImages: 1,
      aspectRatio: '1:1',
      outputMimeType: 'image/png',
    },
  },
  IMAGEN_ULTRA: {
    apiType: 'generateImages',
    modelId: 'imagen-4.0-ultra-generate-001',
    config: {
      numberOfImages: 1,
      aspectRatio: '1:1',
      outputMimeType: 'image/png',
    },
  },
};

// ── Daily Regen Limit ────────────────────────────────────────────────
const DAILY_IMAGE_REGEN_LIMIT = 3;

async function checkAndIncrementRegenLimit(
  adminSupabase: any,
  postId: string,
  type: 'image' | 'caption'
): Promise<{ allowed: boolean; remaining: number }> {
  const countCol = type === 'image' ? 'image_count' : 'caption_count';

  // Fetch or create regen_limits row
  let { data: row, error } = await adminSupabase
    .from('regen_limits')
    .select('*')
    .eq('post_id', postId)
    .maybeSingle();

  if (error) {
    console.error('regen_limits query error:', error.message);
    // Allow on DB error to not block user
    return { allowed: true, remaining: DAILY_IMAGE_REGEN_LIMIT };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!row) {
    // First regeneration – create the row with count = 1
    await adminSupabase.from('regen_limits').insert({
      post_id: postId,
      [countCol]: 1,
      reset_at: now.toISOString(),
    });
    return { allowed: true, remaining: DAILY_IMAGE_REGEN_LIMIT - 1 };
  }

  // Check if reset is needed (reset_at is from a previous day)
  const resetDate = new Date(row.reset_at);
  if (resetDate < todayStart) {
    // New day – reset both counts
    await adminSupabase
      .from('regen_limits')
      .update({
        image_count: type === 'image' ? 1 : 0,
        caption_count: type === 'caption' ? 1 : 0,
        reset_at: now.toISOString(),
      })
      .eq('post_id', postId);
    return { allowed: true, remaining: DAILY_IMAGE_REGEN_LIMIT - 1 };
  }

  // Same day – check limit
  const currentCount = row[countCol] || 0;
  if (currentCount >= DAILY_IMAGE_REGEN_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  // Increment
  await adminSupabase
    .from('regen_limits')
    .update({ [countCol]: currentCount + 1 })
    .eq('post_id', postId);

  return { allowed: true, remaining: DAILY_IMAGE_REGEN_LIMIT - (currentCount + 1) };
}

// ── Retry Logic with Exponential Backoff ─────────────────────────────
async function generateImageWithRetry(
  setup: ModelSetup,
  expandedPrompt: string,
  negativePrompt: string,
  aspectRatio: string,
  activeKey: string,
  retries = 3
): Promise<Buffer> {
  let currentPrompt = expandedPrompt;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`🔄 Image generation attempt ${attempt + 1}/${retries} with ${activeKey}...`);

      let imageBuffer: Buffer | null = null;

      // Apply negative prompt constraints directly to the main prompt text
      // since the developer API mode doesn't support the separate negativePrompt parameter
      const fullPrompt = negativePrompt
        ? `${currentPrompt}\n\nIMPORTANT: AVOID the following in the generated image: ${negativePrompt}`
        : currentPrompt;

      if (setup.apiType === 'generateContent') {
        const imageResult = await ai.models.generateContent({
          model: setup.modelId,
          contents: fullPrompt,
          config: setup.config,
        });

        const imgUsage = imageResult.usageMetadata;
        console.log('📊 TOKEN USAGE [Image Generation]:', {
          cause: `Generating native image with ${activeKey} (attempt ${attempt + 1})`,
          inputTokens: imgUsage?.promptTokenCount,
          outputTokens: imgUsage?.candidatesTokenCount,
          totalTokens: imgUsage?.totalTokenCount,
        });

        const parts = imageResult.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            imageBuffer = Buffer.from(part.inlineData.data, 'base64');
            break;
          }
        }
      } else {
        const imagenConfig = {
          ...setup.config,
          aspectRatio,
        };

        const imageResult = await ai.models.generateImages({
          model: setup.modelId,
          prompt: fullPrompt,
          config: imagenConfig,
        });

        console.log('📊 IMAGEN USAGE:', {
          cause: `Generating image via ${activeKey} (attempt ${attempt + 1})`,
          model: setup.modelId,
          numberOfImages: setup.config.numberOfImages,
          aspectRatio,
          hasNegativePrompt: !!negativePrompt,
        });

        const generatedImage = imageResult.generatedImages?.[0];
        if (generatedImage?.image?.imageBytes) {
          imageBuffer = Buffer.from(generatedImage.image.imageBytes, 'base64');
        }
      }

      if (!imageBuffer) {
        throw new Error(`${activeKey} returned no image data in the response.`);
      }

      console.log(`✅ Image generated successfully via ${activeKey} on attempt ${attempt + 1}. Buffer size: ${imageBuffer.length}`);
      return imageBuffer;

    } catch (err: any) {
      console.error(`❌ Attempt ${attempt + 1}/${retries} failed:`, err.message);

      if (attempt === retries - 1) {
        throw err; // Final attempt – propagate the error
      }

      // On retry, emphasise quality in the prompt
      currentPrompt = `HIGHER QUALITY, SHARPER, MORE DETAILED. ${currentPrompt}`;
      const backoffMs = 2000 * (attempt + 1);
      console.log(`⏳ Retrying in ${backoffMs}ms...`);
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }

  // This should never be reached due to the throw above, but TypeScript needs it
  throw new Error('Image generation failed after all retries.');
}

// ── Post-Generation UI Overlays ──────────────────────────────────────
// After the image model returns the raw poster, we composite brand-critical
// UI furniture on top with sharp: the brand logo (with dynamic variant
// selection), a Chrome-style URL search-bar chip, and a CTA button. Doing
// this server-side means typography is pixel-perfect (no AI text drift)
// and brand assets are placed deterministically. All failures are silent —
// if any overlay step throws, generation falls back to the un-composited
// buffer so users never lose their poster over an overlay glitch.

type LogoTreatment = 'primary' | 'transparent' | 'primary_with_plate';
type OverlayKind = 'logo' | 'url_chip' | 'cta' | 'product';

interface OverlayDesc {
  kind: OverlayKind;
  position: string;     // user-supplied position label e.g. "Bottom Right"
  input: Buffer;        // composited bitmap or SVG
  width: number;
  height: number;
  left: number;
  top: number;
  blend?: string;
  // Optional plate composited underneath this overlay at (left - pad, top - pad).
  // Used by the logo when contrast is low.
  plate?: { input: Buffer; pad: number };
}

// ── small utilities ──

function relLum(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function estimateTextWidth(text: string, fontSize: number, bold = false): number {
  // Rough average character advance for proportional sans-serif at the given size.
  // We can't measure exactly without a font metrics lib on the server, but for
  // chips/buttons a 5-10% overshoot just gives a touch of extra padding.
  const factor = bold ? 0.62 : 0.56;
  return Math.ceil(text.length * fontSize * factor);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = (hex || '').replace('#', '').trim();
  if (h.length !== 6) return { r: 80, g: 80, b: 80 };
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function readableTextOn(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return relLum(r, g, b) > 0.55 ? '#111111' : '#ffffff';
}

function normalizePos(label: string): string {
  return (label || '').toLowerCase().replace(/\s+/g, '');
}

function positionFor(
  label: string,
  baseW: number,
  baseH: number,
  w: number,
  h: number,
  inset: number
): { left: number; top: number } {
  const norm = normalizePos(label);
  const rightX = Math.max(0, baseW - w - inset);
  const bottomY = Math.max(0, baseH - h - inset);
  const centerX = Math.max(0, Math.round((baseW - w) / 2));

  if (norm.includes('topleft')) return { left: inset, top: inset };
  if (norm.includes('topright')) return { left: rightX, top: inset };
  if (norm.includes('topcenter') || norm === 'top') return { left: centerX, top: inset };
  if (norm.includes('bottomleft')) return { left: inset, top: bottomY };
  if (norm.includes('bottomcenter') || norm === 'bottom') return { left: centerX, top: bottomY };
  // Default: Bottom Right
  return { left: rightX, top: bottomY };
}

async function fetchAsBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function analyseLogo(buf: Buffer) {
  const img = sharp(buf);
  const meta = await img.metadata();
  const stats = await img.stats();
  const [r, g, b] = stats.channels;
  return {
    hasAlpha: !!meta.hasAlpha,
    luminance: relLum(r.mean, g.mean, b.mean),
  };
}

async function analyseRegion(
  baseBuf: Buffer,
  baseW: number,
  baseH: number,
  left: number,
  top: number,
  w: number,
  h: number
) {
  // Sample a slightly larger window than the overlay footprint to capture
  // the immediate visual context around the placement.
  const padX = Math.round(w * 0.2);
  const padY = Math.round(h * 0.2);
  const sLeft = Math.max(0, left - padX);
  const sTop = Math.max(0, top - padY);
  const sW = Math.min(baseW - sLeft, w + padX * 2);
  const sH = Math.min(baseH - sTop, h + padY * 2);

  const cropped = await sharp(baseBuf)
    .extract({ left: sLeft, top: sTop, width: sW, height: sH })
    .toBuffer();
  const stats = await sharp(cropped).stats();
  const [r, g, b] = stats.channels;
  // stdev range is 0..~128 in practice; normalise to 0..1 by /128
  const complexity = ((r.stdev + g.stdev + b.stdev) / 3) / 128;
  return {
    luminance: relLum(r.mean, g.mean, b.mean),
    complexity: Math.min(1, complexity),
  };
}

function buildPlateSvg(w: number, h: number, plateIsLight: boolean): Buffer {
  const radius = Math.round(Math.min(w, h) * 0.18);
  const fill = plateIsLight ? 'rgba(255,255,255,0.92)' : 'rgba(20,20,20,0.86)';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="${fill}"/></svg>`;
  return Buffer.from(svg);
}

// ── URL search-bar chip ──
// Renders a Chrome-style address-bar pill: rounded white background, soft
// shadow, magnifier icon, the URL text in mid-grey, and a small × on the
// right. Pixel-perfect every time — no AI typography drift.

function renderUrlChipSvg(url: string, baseW: number): { svg: Buffer; width: number; height: number } {
  const display = (url || '').replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const fontSize = Math.max(18, Math.round(baseW * 0.024));
  const height = Math.round(fontSize * 2.2);
  const iconBox = Math.round(height * 0.5);
  const iconPad = Math.round(height * 0.35);
  const textPad = Math.round(height * 0.28);
  const closeBox = Math.round(height * 0.32);
  const closePad = Math.round(height * 0.45);
  const textW = estimateTextWidth(display, fontSize);
  const width = iconPad + iconBox + textPad + textW + textPad + closeBox + closePad;
  const radius = Math.round(height / 2);
  const safe = xmlEscape(display);

  const iconCx = iconPad + iconBox / 2;
  const iconCy = height / 2;
  const iconR = iconBox * 0.34;
  const handleX1 = iconCx + iconR * 0.7;
  const handleY1 = iconCy + iconR * 0.7;
  const handleX2 = iconCx + iconR * 1.4;
  const handleY2 = iconCy + iconR * 1.4;

  const closeCx = width - closePad - closeBox / 2;
  const closeCy = height / 2;
  const closeArm = closeBox * 0.35;

  const textX = iconPad + iconBox + textPad;
  const textBaseline = height / 2 + fontSize * 0.35;
  const strokeW = Math.max(2, Math.round(iconR * 0.22));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <filter id="us" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="${Math.max(2, Math.round(height * 0.06))}" stdDeviation="${Math.max(3, Math.round(height * 0.1))}" flood-color="rgba(0,0,0,0.18)"/>
    </filter>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="#ffffff" filter="url(#us)"/>
  <circle cx="${iconCx}" cy="${iconCy}" r="${iconR}" fill="none" stroke="#5f6368" stroke-width="${strokeW}"/>
  <line x1="${handleX1}" y1="${handleY1}" x2="${handleX2}" y2="${handleY2}" stroke="#5f6368" stroke-width="${strokeW}" stroke-linecap="round"/>
  <text x="${textX}" y="${textBaseline}" font-family="Inter, Arial, Helvetica, Liberation Sans, DejaVu Sans, sans-serif" font-size="${fontSize}" fill="#202124">${safe}</text>
  <line x1="${closeCx - closeArm}" y1="${closeCy - closeArm}" x2="${closeCx + closeArm}" y2="${closeCy + closeArm}" stroke="#9aa0a6" stroke-width="${Math.max(2, Math.round(closeArm * 0.45))}" stroke-linecap="round"/>
  <line x1="${closeCx - closeArm}" y1="${closeCy + closeArm}" x2="${closeCx + closeArm}" y2="${closeCy - closeArm}" stroke="#9aa0a6" stroke-width="${Math.max(2, Math.round(closeArm * 0.45))}" stroke-linecap="round"/>
</svg>`;
  return { svg: Buffer.from(svg), width, height };
}

// ── CTA button ──
// Rounded, filled, bold uppercase text, soft drop shadow. Fill colour comes
// from the brand kit; text colour is auto-picked for contrast.

function renderCtaButtonSvg(
  text: string,
  baseW: number,
  fillHex: string
): { svg: Buffer; width: number; height: number } {
  const display = (text || '').toUpperCase();
  const fontSize = Math.max(20, Math.round(baseW * 0.028));
  const padX = Math.round(fontSize * 1.3);
  const padY = Math.round(fontSize * 0.7);
  const textW = estimateTextWidth(display, fontSize, true);
  const width = textW + padX * 2;
  const height = fontSize + padY * 2;
  const radius = Math.round(height * 0.22);
  const fg = readableTextOn(fillHex);
  const safe = xmlEscape(display);
  const letterSpacing = Math.max(1, Math.round(fontSize * 0.04));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <filter id="cs" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="${Math.max(2, Math.round(height * 0.08))}" stdDeviation="${Math.max(3, Math.round(height * 0.12))}" flood-color="rgba(0,0,0,0.25)"/>
    </filter>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="${fillHex}" filter="url(#cs)"/>
  <text x="${width / 2}" y="${height / 2 + fontSize * 0.35}" text-anchor="middle" font-family="Inter, Arial, Helvetica, Liberation Sans, DejaVu Sans, sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="${letterSpacing}" fill="${fg}">${safe}</text>
</svg>`;
  return { svg: Buffer.from(svg), width, height };
}

// ── Build the logo overlay (dynamic variant + plate decision) ──

async function buildLogoOverlay(
  baseBuffer: Buffer,
  baseW: number,
  baseH: number,
  inset: number,
  primaryUrl: string,
  transparentUrl: string | null,
  positionLabel: string
): Promise<OverlayDesc | null> {
  const targetSize = Math.round(Math.min(baseW, baseH) * 0.16);
  try {
    const primaryBuf = await fetchAsBuffer(primaryUrl);
    let transparentBuf: Buffer | null = null;
    if (transparentUrl) {
      try {
        transparentBuf = await fetchAsBuffer(transparentUrl);
      } catch (e: any) {
        console.warn('Transparent logo fetch failed, falling back to primary only:', e.message);
      }
    }

    const primaryInfo = await analyseLogo(primaryBuf);
    const transparentInfo = transparentBuf ? await analyseLogo(transparentBuf) : null;

    // Probe geometry from the primary, then sample the destination region.
    const probeResized = await sharp(primaryBuf)
      .resize({ width: targetSize, height: targetSize, fit: 'inside' })
      .toBuffer();
    const probeMeta = await sharp(probeResized).metadata();
    const probeW = probeMeta.width || targetSize;
    const probeH = probeMeta.height || targetSize;
    const probePos = positionFor(positionLabel, baseW, baseH, probeW, probeH, inset);
    const region = await analyseRegion(baseBuffer, baseW, baseH, probePos.left, probePos.top, probeW, probeH);

    const primaryContrast = Math.abs(region.luminance - primaryInfo.luminance);
    const transparentContrast = transparentInfo
      ? Math.abs(region.luminance - transparentInfo.luminance)
      : 0;

    const BUSY = 0.18;
    const LOW_CONTRAST = 0.22;

    let treatment: LogoTreatment;
    if (region.complexity > BUSY && transparentInfo) {
      treatment = 'transparent';
    } else if (primaryContrast < LOW_CONTRAST && transparentInfo && transparentContrast > primaryContrast + 0.05) {
      treatment = 'transparent';
    } else if (primaryContrast < LOW_CONTRAST) {
      treatment = 'primary_with_plate';
    } else {
      treatment = 'primary';
    }

    const chosenSrc = treatment === 'transparent' ? transparentBuf! : primaryBuf;
    const chosenInfo = treatment === 'transparent' ? transparentInfo! : primaryInfo;

    const logoResized = await sharp(chosenSrc)
      .resize({ width: targetSize, height: targetSize, fit: 'inside' })
      .png()
      .toBuffer();
    const logoMeta = await sharp(logoResized).metadata();
    const logoW = logoMeta.width || probeW;
    const logoH = logoMeta.height || probeH;
    const pos = positionFor(positionLabel, baseW, baseH, logoW, logoH, inset);

    const desc: OverlayDesc = {
      kind: 'logo',
      position: positionLabel,
      input: logoResized,
      width: logoW,
      height: logoH,
      left: pos.left,
      top: pos.top,
    };

    if (treatment === 'primary_with_plate') {
      const pad = Math.round(targetSize * 0.12);
      const plateW = logoW + pad * 2;
      const plateH = logoH + pad * 2;
      const plateIsLight = chosenInfo.luminance < 0.5;
      desc.plate = { input: buildPlateSvg(plateW, plateH, plateIsLight), pad };
    }

    console.log(
      `🎨 Logo: treatment=${treatment} pos=${positionLabel} ` +
      `region(lum=${region.luminance.toFixed(2)}, busy=${region.complexity.toFixed(2)}) ` +
      `primary(Δ=${primaryContrast.toFixed(2)}) ` +
      `transparent=${transparentInfo ? `(Δ=${transparentContrast.toFixed(2)})` : 'none'}`
    );

    return desc;
  } catch (e: any) {
    console.warn('Logo overlay failed:', e.message);
    return null;
  }
}

// ── Build the product overlay ──

async function buildProductsOverlay(
  baseBuffer: Buffer,
  baseW: number,
  baseH: number,
  productUrls: string[]
): Promise<OverlayDesc[]> {
  const descriptors: OverlayDesc[] = [];
  
  if (!productUrls || productUrls.length === 0) return descriptors;
  
  // Total container for all products: 85% of base width for bolder impact
  const containerW = Math.round(Math.min(baseW, baseH) * 0.85);
  // Allow products to be taller
  const containerH = Math.round(baseH * 0.75);
  
  // Gap between multiple products
  const gap = productUrls.length > 1 ? Math.round(baseW * 0.05) : 0;
  
  // Width allocated to each individual product
  const targetW = Math.round((containerW - (gap * (productUrls.length - 1))) / productUrls.length);
  const targetH = Math.round(containerH);

  let totalActualW = 0;
  let maxActualH = 0;
  
  const processedProducts = [];
  
  // First pass: process and resize all products
  for (const url of productUrls) {
    try {
      const productBuf = await fetchAsBuffer(url);
      
      // Process image to ensure transparency instead of using multiply blend mode
      const { data, info: rawInfo } = await sharp(productBuf)
        .resize({ width: targetW, height: targetH, fit: 'inside' })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
        
      // Iterate through RGBA pixels and make near-white background transparent
      for (let j = 0; j < data.length; j += 4) {
        const r = data[j];
        const g = data[j+1];
        const b = data[j+2];
        // If pixel is very close to pure white, make it transparent
        if (r > 240 && g > 240 && b > 240) {
          data[j+3] = 0; // Set Alpha to 0
        }
      }
      
      const transparentBuf = await sharp(data, {
        raw: {
          width: rawInfo.width,
          height: rawInfo.height,
          channels: 4
        }
      }).png().toBuffer();
      
      processedProducts.push({ buffer: transparentBuf, width: rawInfo.width, height: rawInfo.height, blend: 'over' });
      
      totalActualW += rawInfo.width;
      maxActualH = Math.max(maxActualH, rawInfo.height);
    } catch (e: any) {
      console.warn('Failed to process product image:', url, e.message);
    }
  }
  
  if (processedProducts.length === 0) return descriptors;
  
  // Add gaps to total width
  totalActualW += gap * (processedProducts.length - 1);
  
  // Start left so that the whole group is centered
  let currentLeft = Math.round((baseW - totalActualW) / 2);
  // Push them slightly down to leave room for top headlines
  const centerTop = Math.round(baseH * 0.55);
  
  for (let i = 0; i < processedProducts.length; i++) {
    const p = processedProducts[i];
    
    // Center vertically, shift slightly up so shadow has room
    const top = centerTop - Math.round(p.height / 2) - Math.round(p.height * 0.02);
    
    // Create soft contact shadow via SVG radial gradient
    const shadowW = Math.round(p.width * 0.85);
    const shadowH = Math.max(Math.round(p.height * 0.12), 20);
    const shadowSvg = Buffer.from(`
      <svg width="${shadowW}" height="${shadowH}" viewBox="0 0 ${shadowW} ${shadowH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="black" stop-opacity="0.85"/>
            <stop offset="40%" stop-color="black" stop-opacity="0.5"/>
            <stop offset="100%" stop-color="black" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <ellipse cx="${shadowW/2}" cy="${shadowH/2}" rx="${shadowW/2}" ry="${shadowH/2}" fill="url(#shadowGrad)" />
      </svg>
    `);

    // Add shadow behind the product
    descriptors.push({
      kind: 'product',
      position: 'center',
      input: shadowSvg,
      width: shadowW,
      height: shadowH,
      left: currentLeft + Math.round((p.width - shadowW) / 2),
      top: top + p.height - Math.round(shadowH / 2.5), // Tuck it nicely under the base
      blend: 'over'
    });

    descriptors.push({
      kind: 'product',
      position: 'center',
      input: p.buffer,
      width: p.width,
      height: p.height,
      left: currentLeft,
      top,
      blend: p.blend as any
    });
    
    currentLeft += p.width + gap;
  }
  
  return descriptors;
}

// ── Unified compositor ──
// Layouts logo + URL chip + CTA at their requested positions, resolves same-
// corner collisions by stacking inward (logo stays anchored to the edge),
// then composites everything in one pass.

interface OverlayOptions {
  logo?: { primary: string; transparent: string | null; position: string };
  urlChip?: { url: string; position: string };
  cta?: { text: string; position: string; fillColor: string };
  products?: { urls: string[] };
}

async function compositeAllOverlays(
  baseBuffer: Buffer,
  opts: OverlayOptions
): Promise<Buffer> {
  if (!opts.logo && !opts.urlChip && !opts.cta && !opts.products) return baseBuffer;

  try {
    const baseMeta = await sharp(baseBuffer).metadata();
    const baseW = baseMeta.width || 1024;
    const baseH = baseMeta.height || 1024;
    const inset = Math.round(baseW * 0.04);
    const stackGap = Math.round(baseW * 0.018);

    const overlays: OverlayDesc[] = [];

    if (opts.logo) {
      const desc = await buildLogoOverlay(
        baseBuffer, baseW, baseH, inset,
        opts.logo.primary, opts.logo.transparent, opts.logo.position
      );
      if (desc) overlays.push(desc);
    }

    if (opts.urlChip && opts.urlChip.url) {
      const { svg, width, height } = renderUrlChipSvg(opts.urlChip.url, baseW);
      const pos = positionFor(opts.urlChip.position, baseW, baseH, width, height, inset);
      overlays.push({
        kind: 'url_chip',
        position: opts.urlChip.position,
        input: svg,
        width, height,
        left: pos.left, top: pos.top,
      });
      console.log(`🔗 URL chip: pos=${opts.urlChip.position} size=${width}×${height}`);
    }

    if (opts.cta && opts.cta.text) {
      const { svg, width, height } = renderCtaButtonSvg(opts.cta.text, baseW, opts.cta.fillColor);
      const pos = positionFor(opts.cta.position, baseW, baseH, width, height, inset);
      overlays.push({
        kind: 'cta',
        position: opts.cta.position,
        input: svg,
        width, height,
        left: pos.left, top: pos.top,
      });
      console.log(`🟢 CTA: "${opts.cta.text}" pos=${opts.cta.position} size=${width}×${height}`);
    }

    if (opts.products && opts.products.urls.length > 0) {
      const pDescs = await buildProductsOverlay(baseBuffer, baseW, baseH, opts.products.urls);
      overlays.push(...pDescs);
    }

    if (overlays.length === 0) return baseBuffer;

    // ── Pixel-rect overlap resolution ──
    // Different position labels can still overlap visually (e.g. a wide CTA
    // at "Bottom Left" + a wide URL chip at "Bottom Center" — their footprints
    // meet in the middle). We walk overlays in priority order and, for each,
    // push it vertically AWAY from the screen edge until no rectangle overlap
    // remains with any previously-placed overlay. Logo stays anchored to its
    // corner; URL chip yields if it collides; CTA yields last.
    const priorityOf = (k: OverlayKind): number =>
      ({ product: -1, logo: 0, url_chip: 1, cta: 2 } as Record<OverlayKind, number>)[k];

    const rectsOverlap = (a: OverlayDesc, b: OverlayDesc): boolean =>
      !(a.left + a.width <= b.left ||
        b.left + b.width <= a.left ||
        a.top + a.height <= b.top ||
        b.top + b.height <= a.top);

    const sortedByPriority = [...overlays].sort(
      (a, b) => priorityOf(a.kind) - priorityOf(b.kind)
    );
    const placed: OverlayDesc[] = [];

    for (const o of sortedByPriority) {
      // Edge affinity based on the ORIGINAL anchor: bottom positions push
      // upward, top positions push downward. We use the initial vertical
      // position (relative to base centre) to decide direction.
      const isTopAnchor = normalizePos(o.position).includes('top');
      const isBottomAnchor = !isTopAnchor; // anything else lands at the bottom edge by default

      let safety = 0;
      while (safety++ < 24) {
        const collider = placed.find(p => rectsOverlap(o, p));
        if (!collider) break;

        if (isBottomAnchor) {
          // Push the moving overlay UP so its bottom edge sits above the collider's top.
          o.top = collider.top - o.height - stackGap;
          if (o.top < 0) { o.top = 0; break; } // give up gracefully if we ran out of room
        } else {
          // Top-anchored: push DOWN so its top sits below the collider's bottom.
          o.top = collider.top + collider.height + stackGap;
          if (o.top + o.height > baseH) { o.top = baseH - o.height; break; }
        }
      }
      placed.push(o);
    }

    // Emit sharp overlays: plate first (if any), then the main bitmap.
    const sharpOverlays: sharp.OverlayOptions[] = [];
    for (const o of overlays) {
      if (o.plate) {
        sharpOverlays.push({
          input: o.plate.input,
          left: Math.max(0, Math.round(o.left - o.plate.pad)),
          top: Math.max(0, Math.round(o.top - o.plate.pad)),
        });
      }
      sharpOverlays.push({
        input: o.input,
        left: Math.max(0, Math.round(o.left)),
        top: Math.max(0, Math.round(o.top)),
        blend: (o.blend as sharp.Blend) || 'over',
      });
    }

    return await sharp(baseBuffer).composite(sharpOverlays).png().toBuffer();
  } catch (err: any) {
    console.warn('⚠️  Overlay composition failed, returning un-composited buffer:', err.message);
    return baseBuffer;
  }
}

export async function POST(req: Request) {
  try {
    const {
      topic,
      contentType,
      platform,
      extraInstructions,
      brandDetails,
      workspaceId: bodyWorkspaceId,
      postId: regenPostId, // Optional: set when regenerating an existing post's image
      graphicHeadline,
      heroObjects,
      campaignExpiry,
      wordCount,
      hashtagCount,
      currentCaption,
      mentionBrandLogo,
      brandLogoPosition,
      mentionWebsiteInPost,
      brandLinkPosition,
      ctaText,
      ctaPosition,
      brandTitle,
      heroMessage,
      productImages,
      productNames,
      placementCategory,
      layoutStyle,
    } = await req.json();

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not set');
    }

    // Initialize Supabase for getting user email
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const adminSupabase = createAdminClient();

    // 1. Resolve Workspace ID (Body or UID fallback)
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    let targetWorkspaceId = bodyWorkspaceId;
    let workspaceData = null;

    if (targetWorkspaceId) {
      console.log('Using workspaceId from body:', targetWorkspaceId);
      const { data } = await adminSupabase
        .from('workspaces')
        .select('id, posts_used_this_cycle, brand_kits (id)')
        .eq('id', targetWorkspaceId)
        .single();
      workspaceData = data;
    } else if (uid) {
      console.log('bodyWorkspaceId missing, fetching via UID:', uid);
      const { data } = await adminSupabase
        .from('workspaces')
        .select('id, posts_used_this_cycle, brand_kits (id)')
        .eq('owner_id', uid)
        .maybeSingle();
      workspaceData = data;
      targetWorkspaceId = data?.id;
    }

    if (!targetWorkspaceId || !workspaceData) {
      console.error('CRITICAL: Could not resolve workspace for UID:', uid);
      throw new Error('Workspace identification failed. Please ensure you are logged in.');
    }

    const workspace = workspaceData;
    const bKits: any = workspace.brand_kits;
    const brandKitId = Array.isArray(bKits) ? bKits[0]?.id : bKits?.id;

    console.log('Final Target Workspace:', targetWorkspaceId, 'UID:', uid);

    // ── REGEN LIMIT CHECK (only for regeneration, not first generation) ──
    let remainingImageRegens = DAILY_IMAGE_REGEN_LIMIT;
    if (regenPostId) {
      const { allowed, remaining } = await checkAndIncrementRegenLimit(adminSupabase, regenPostId, 'image');
      if (!allowed) {
        return NextResponse.json({
          error: 'Daily image regeneration limit reached (3/3). Try again tomorrow.',
          code: 'REGEN_LIMIT_REACHED',
          remainingImageRegens: 0,
        }, { status: 429 });
      }
      remainingImageRegens = remaining;
      console.log(`🔄 Regeneration allowed. ${remaining} image regens remaining today.`);
    }

    // ── INITIAL DRAFT CREATION ────────────────────────────────────────
    // Create a draft record immediately so user progress isn't lost on failure
    let draftId = regenPostId; // Use existing post ID if regenerating

    if (!draftId) {
      const { data: initialDraft, error: draftError } = await adminSupabase
        .from('posts')
        .insert([{
          workspace_id: targetWorkspaceId,
          brand_kit_id: brandKitId || null,
          title: topic,
          platform: platform === 'both' ? 'both' : platform,
          content_type: contentType,
          status: 'draft',
          extra_instructions: extraInstructions,
          caption: `Processing: ${topic}...`,
          mention_brand_logo: mentionBrandLogo,
          brand_logo_position: brandLogoPosition,
          mention_website_in_post: mentionWebsiteInPost,
          brand_link_position: brandLinkPosition,
          cta_text: ctaText || null,
          cta_position: ctaPosition || null,
          graphic_headline: graphicHeadline || null,
          hero_objects: heroObjects || null,
          campaign_expiry: campaignExpiry || null,
          brand_title: brandTitle || null,
          hero_message: heroMessage || null,
          product_image_url: productImages && productImages.length > 0 ? productImages[0] : null, // Store first product URL for backward compat
          word_count: wordCount,
          hashtag_count: hashtagCount,
          placement_category: placementCategory || 'physical',
          layout_style: layoutStyle || null,
        }])
        .select('id')
        .single();

      draftId = initialDraft?.id;
      if (draftError) console.error('Warning: Could not create initial draft record:', draftError.message);
    }

    // 2. Developer Test Mode (Skip AI if dev mode is active)
    if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
      console.log('🚧 DEVELOPER MODE ACTIVE: Skipping AI image generation and using dummy images.');
      const dummyUrls = [
        `https://picsum.photos/seed/${topic.replace(/\s+/g, '')}1/1024/1024`
      ];

      return await processAndStoreImages(dummyUrls, targetWorkspaceId, uid, topic, platform, contentType, brandKitId, workspace, extraInstructions, draftId, remainingImageRegens);
    }

    // 3. Resolve platform aspect ratio
    const aspectRatio = PLATFORM_RATIOS[platform] || '1:1';
    console.log(`📐 Platform: ${platform} → Aspect Ratio: ${aspectRatio}`);

    // 4. Expand Prompt using Gemini 2.5 Flash (text-only, cheap & fast)
    console.log('Starting prompt expansion with Gemini 2.5 Flash...');
    let expandedPrompt = '';
    let dynamicNegativePrompt = '';
    let designRationale = '';
    let productQuantities: Record<string, number> = {};

    try {
      const promptExpansionMsg = getImageExpansionPrompt(
        brandDetails, topic, contentType, platform, extraInstructions, graphicHeadline, heroObjects,
        mentionBrandLogo, brandLogoPosition, mentionWebsiteInPost, brandLinkPosition,
        ctaText, ctaPosition, brandTitle, heroMessage, productImages, productNames,
        placementCategory, layoutStyle
      );

      const expansionResult = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptExpansionMsg,
        config: { temperature: 0.8 }, // Higher creativity for fresh ideas
      });

      // LOG TOKEN USAGE: Expansion
      const usage = expansionResult.usageMetadata;
      console.log('📊 TOKEN USAGE [Prompt Expansion]:', {
        cause: 'Expanding user instructions into high-quality image prompt',
        inputTokens: usage?.promptTokenCount,
        outputTokens: usage?.candidatesTokenCount,
        totalTokens: usage?.totalTokenCount
      });

      const expansionText = (expansionResult.text || '').replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(expansionText);

      const prompts = parsed.expandedPrompts || [];
      expandedPrompt = prompts[0] || '';
      dynamicNegativePrompt = parsed.negativePrompt || '';
      designRationale = parsed.design_rationale || '';
      productQuantities = parsed.productQuantities || {};

      console.log('Expanded Prompt length:', expandedPrompt.length);
      console.log('🎨 Design Rationale:', designRationale);
      console.log('📦 Product Quantities:', productQuantities);
      console.log('🚫 Dynamic Negative Prompt:', dynamicNegativePrompt);

      if (!expandedPrompt) {
        console.warn('Gemini returned no prompt, using fallback.');
        expandedPrompt = `Professional marketing poster for ${brandDetails?.businessName || 'brand'} about ${topic}, high quality, sharp typography, premium design`;
      }
    } catch (err: any) {
      console.error('Prompt expansion error:', err.message);
      expandedPrompt = `Professional marketing poster for ${brandDetails?.businessName || 'brand'} about ${topic}, high quality typography, premium brand design, sharp focus`;
    }

    // 5. Merge negative prompts: dynamic (from LLM) + baseline
    const mergedNegativePrompt = [dynamicNegativePrompt, NEGATIVE_PROMPT_BASELINE]
      .filter(Boolean)
      .join(', ');
    console.log('🚫 Final Merged Negative Prompt:', mergedNegativePrompt);

    // 6. Resolve active model configuration from registry
    const activeKey = process.env.ACTIVE_IMAGE_MODEL || 'IMAGEN_FAST';
    const setup = IMAGE_MODEL_REGISTRY[activeKey] || IMAGE_MODEL_REGISTRY.IMAGEN_FAST;

    console.log(`Generating image with ${activeKey} (model: ${setup.modelId})...`);

    try {
      // 7. Generate image with retry logic
      const imageBuffer = await generateImageWithRetry(
        setup,
        expandedPrompt,
        mergedNegativePrompt,
        aspectRatio,
        activeKey
      );

      // 7b. Composite brand-critical UI overlays onto the generated poster.
      // Logo + URL chip + CTA are all rendered server-side for pixel-perfect
      // typography and consistent brand placement. Each element is optional;
      // collisions at the same corner are stacked inward automatically.
      const overlayOpts: OverlayOptions = {};
      if (mentionBrandLogo && brandDetails?.logo) {
        overlayOpts.logo = {
          primary: brandDetails.logo,
          transparent: brandDetails.logoDark || null,
          position: brandLogoPosition || 'Bottom Right',
        };
      }
      if (mentionWebsiteInPost && brandDetails?.websiteUrl) {
        overlayOpts.urlChip = {
          url: brandDetails.websiteUrl,
          position: brandLinkPosition || 'Bottom Center',
        };
      }
      if (ctaText && String(ctaText).trim()) {
        const accent = brandDetails?.colors?.accent || brandDetails?.colors?.primary || '#06b6d4';
        overlayOpts.cta = {
          text: String(ctaText).trim(),
          position: ctaPosition || 'Bottom Center',
          fillColor: accent,
        };
      }
      if (productImages && productImages.length > 0) {
        let finalProductUrls: string[] = [];
        if (productNames && productNames.length === productImages.length) {
          for (let i = 0; i < productNames.length; i++) {
            const name = productNames[i];
            const url = productImages[i];
            
            let count = 1;
            // Fuzzy match the product name against the LLM's productQuantities object
            const matchedKey = Object.keys(productQuantities).find(
              k => name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(name.toLowerCase())
            );
            if (matchedKey && typeof productQuantities[matchedKey] === 'number') {
              // Cap at 4 duplicates max per product so we don't break the layout if LLM hallucinates 100
              count = Math.min(Math.max(productQuantities[matchedKey], 1), 4);
            }
            
            for (let c = 0; c < count; c++) {
              finalProductUrls.push(url);
            }
          }
        } else {
          finalProductUrls = [...productImages];
        }
        
        console.log(`📦 Compositing products: original=${productImages.length}, expanded=${finalProductUrls.length}`);
        overlayOpts.products = { urls: finalProductUrls };
      }
      const finalBuffer = await compositeAllOverlays(imageBuffer, overlayOpts);

      // 8. Upload generated image buffer to Supabase Storage and save metadata
      return await processAndStoreBuffer(
        finalBuffer, targetWorkspaceId, uid, topic, platform, contentType,
        brandKitId, workspace, extraInstructions, draftId,
        // Extended metadata
        expandedPrompt, mergedNegativePrompt, setup.modelId, aspectRatio,
        regenPostId, currentCaption,
        mentionBrandLogo, brandLogoPosition, mentionWebsiteInPost, brandLinkPosition,
        ctaText, ctaPosition, graphicHeadline, heroObjects, campaignExpiry, wordCount, hashtagCount,
        brandTitle, heroMessage, productImages && productImages.length > 0 ? productImages[0] : null
      );

    } catch (imgErr: any) {
      console.error(`❌ ${activeKey} Image generation failed after all retries:`, imgErr.message);
      // Update draft with error info if possible
      if (draftId && !regenPostId) {
        await adminSupabase
          .from('posts')
          .update({ caption: `Error during generation: ${imgErr.message}` })
          .eq('id', draftId);
      }
      throw imgErr;
    }

  } catch (error: any) {
    console.error('Fatal Image generation error:', error);
    return NextResponse.json({
      error: error.message,
      details: 'Check server logs for full stack trace'
    }, { status: 500 });
  }
}

// ── Helper: Process buffer, upload to storage, save to DB ────────────
async function processAndStoreBuffer(
  buffer: Buffer,
  targetWorkspaceId: string,
  uid: string | undefined,
  topic: string,
  platform: string,
  contentType: string,
  brandKitId: any,
  workspace: any,
  extraInstructions: string,
  draftId?: string,
  // Extended metadata
  expandedPrompt?: string,
  negativePrompt?: string,
  modelUsed?: string,
  aspectRatio?: string,
  isRegen?: string, // truthy if this is a regeneration
  currentCaption?: string,
  mentionBrandLogo?: boolean,
  brandLogoPosition?: string,
  mentionWebsiteInPost?: boolean,
  brandLinkPosition?: string,
  ctaText?: string,
  ctaPosition?: string,
  graphicHeadline?: string,
  heroObjects?: string,
  campaignExpiry?: string,
  wordCount?: number,
  hashtagCount?: number,
  brandTitle?: string,
  heroMessage?: string,
  productImage?: string
) {
  const adminSupabase = createAdminClient();

  try {
    // 1. Prepare filename
    const timestamp = Date.now();
    const filename = `post_${timestamp}_0.png`;
    const filePath = `${uid || 'anonymous'}/${filename}`;

    // 2. Upload to Supabase Storage
    const { error: uploadError } = await adminSupabase.storage
      .from('BrandPostAI_Post')
      .upload(filePath, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // 3. Get Public URL
    const { data: { publicUrl } } = adminSupabase.storage
      .from('BrandPostAI_Post')
      .getPublicUrl(filePath);

    // 4. Save to database (Update existing draft or insert new if missing)
    let postData, postError;

    // Build the update/insert payload with extended metadata
    const metadataFields: any = {};
    if (expandedPrompt) metadataFields.expanded_prompt = expandedPrompt;
    if (negativePrompt) metadataFields.negative_prompt = negativePrompt;
    if (modelUsed) metadataFields.model_used = modelUsed;
    if (aspectRatio) metadataFields.aspect_ratio = aspectRatio;
    if (mentionBrandLogo !== undefined) metadataFields.mention_brand_logo = mentionBrandLogo;
    if (brandLogoPosition !== undefined) metadataFields.brand_logo_position = brandLogoPosition;
    if (mentionWebsiteInPost !== undefined) metadataFields.mention_website_in_post = mentionWebsiteInPost;
    if (brandLinkPosition !== undefined) metadataFields.brand_link_position = brandLinkPosition;
    if (ctaText !== undefined) metadataFields.cta_text = ctaText || null;
    if (ctaPosition !== undefined) metadataFields.cta_position = ctaPosition || null;
    if (graphicHeadline !== undefined) metadataFields.graphic_headline = graphicHeadline || null;
    if (heroObjects !== undefined) metadataFields.hero_objects = heroObjects || null;
    if (campaignExpiry !== undefined) metadataFields.campaign_expiry = campaignExpiry || null;
    if (wordCount !== undefined) metadataFields.word_count = wordCount;
    if (hashtagCount !== undefined) metadataFields.hashtag_count = hashtagCount;
    if (brandTitle !== undefined) metadataFields.brand_title = brandTitle || null;
    if (heroMessage !== undefined) metadataFields.hero_message = heroMessage || null;
    if (productImage !== undefined) metadataFields.product_image_url = productImage || null;

    if (draftId && !isRegen) {
      const updatePayload: any = {
        image_url: publicUrl,
        status: 'draft',
        ...metadataFields,
      };
      
      updatePayload.caption = currentCaption || `Generated for ${topic} on ${platform}`;

      const { data, error } = await adminSupabase
        .from('posts')
        .update(updatePayload)
        .eq('id', draftId)
        .select('id')
        .single();
      postData = data;
      postError = error;
    } else {
      const { data, error } = await adminSupabase
        .from('posts')
        .insert([{
          workspace_id: targetWorkspaceId,
          brand_kit_id: brandKitId || null,
          caption: currentCaption || `Generated for ${topic} on ${platform}`,
          image_url: publicUrl,
          status: 'draft',
          platform: platform === 'both' ? 'both' : platform,
          content_type: contentType,
          title: topic,
          extra_instructions: extraInstructions,
          ...metadataFields,
        }])
        .select('id')
        .single();
      postData = data;
      postError = error;
    }

    if (postError) {
      console.error('CRITICAL POST DB ERROR:', postError.message);
      // Still return the image even if DB update fails
      return NextResponse.json({ images: [{ url: publicUrl, id: draftId || null }] });
    }

    // 5. Update usage in workspace (costs 1 credit for both initial and regenerations)
    await adminSupabase
      .from('workspaces')
      .update({ posts_used_this_cycle: (workspace.posts_used_this_cycle || 0) + 1 })
      .eq('id', targetWorkspaceId);

    // 6. Fetch remaining regen count for the response
    let remainingImageRegens = DAILY_IMAGE_REGEN_LIMIT;
    if (isRegen) {
      const { data: regenRow } = await adminSupabase
        .from('regen_limits')
        .select('image_count')
        .eq('post_id', isRegen)
        .maybeSingle();
      if (regenRow) {
        remainingImageRegens = Math.max(0, DAILY_IMAGE_REGEN_LIMIT - (regenRow.image_count || 0));
      }
    }

    return NextResponse.json({
      images: [{ url: publicUrl, id: postData?.id }],
      remainingImageRegens,
    });

  } catch (err: any) {
    console.error('Storage processing error:', err);
    throw err;
  }
}

// ── Helper: Process URLs (for dev mode dummy images) ─────────────────
async function processAndStoreImages(
  urls: string[],
  targetWorkspaceId: string,
  uid: string | undefined,
  topic: string,
  platform: string,
  contentType: string,
  brandKitId: any,
  workspace: any,
  extraInstructions: string,
  draftId?: string,
  remainingImageRegens?: number
) {
  const adminSupabase = createAdminClient();

  const finalUrls = await Promise.all(urls.map(async (url, index) => {
    try {
      // 1. Fetch the image
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      const buffer = await response.arrayBuffer();

      // 2. Prepare filename
      const timestamp = Date.now();
      const filename = `dev_post_${timestamp}_${index}.png`;
      const filePath = `${uid || 'anonymous'}/${filename}`;

      // 3. Upload to Supabase Storage
      const { error: uploadError } = await adminSupabase.storage
        .from('BrandPostAI_Post')
        .upload(filePath, buffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return { url, id: null };
      }

      // 4. Get Public URL
      const { data: { publicUrl } } = adminSupabase.storage
        .from('BrandPostAI_Post')
        .getPublicUrl(filePath);

      // 5. Save to database (Update existing draft or insert new if missing)
      try {
        let postData, postError;

        if (draftId) {
          const { data, error } = await adminSupabase
            .from('posts')
            .update({
              caption: `Generated (Dev Mode) for ${topic} on ${platform}`,
              image_url: publicUrl,
              status: 'draft',
              model_used: 'dev-mode-dummy',
            })
            .eq('id', draftId)
            .select('id')
            .single();
          postData = data;
          postError = error;
        } else {
          const { data, error } = await adminSupabase
            .from('posts')
            .insert([{
              workspace_id: targetWorkspaceId,
              brand_kit_id: brandKitId || null,
              caption: `Generated (Dev Mode) for ${topic} on ${platform}`,
              image_url: publicUrl,
              status: 'draft',
              platform: platform === 'both' ? 'both' : platform,
              content_type: contentType,
              title: topic,
              extra_instructions: extraInstructions,
              model_used: 'dev-mode-dummy',
            }])
            .select('id')
            .single();
          postData = data;
          postError = error;
        }

        if (postError) {
          console.error('CRITICAL POST INSERT ERROR:', postError.message);
          return { url: publicUrl, id: draftId || null };
        }

        return { url: publicUrl, id: postData?.id };
      } catch (dbErr: any) {
        console.error('DB INSERT EXCEPTION:', dbErr.message);
        return { url: publicUrl, id: null };
      }
    } catch (uploadErr) {
      console.error('Storage processing error:', uploadErr);
      return { url, id: null };
    }
  }));

  const results = finalUrls.filter(r => r.url);

  // Update usage in workspace
  await adminSupabase
    .from('workspaces')
    .update({ posts_used_this_cycle: (workspace.posts_used_this_cycle || 0) + results.length })
    .eq('id', targetWorkspaceId);

  return NextResponse.json({ images: results, remainingImageRegens: remainingImageRegens !== undefined ? remainingImageRegens : DAILY_IMAGE_REGEN_LIMIT });
}
