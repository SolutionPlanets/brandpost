import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createAdminClient } from '@/utils/supabase/admin';
import { getCaptionPrompt } from './prompts';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY || '' });

// ── Daily Regen Limit ────────────────────────────────────────────────
const DAILY_CAPTION_REGEN_LIMIT = 3;

async function checkAndIncrementCaptionRegenLimit(
  adminSupabase: any,
  postId: string
): Promise<{ allowed: boolean; remaining: number }> {
  // Fetch or create regen_limits row
  let { data: row, error } = await adminSupabase
    .from('regen_limits')
    .select('*')
    .eq('post_id', postId)
    .maybeSingle();

  if (error) {
    console.error('regen_limits query error:', error.message);
    return { allowed: true, remaining: DAILY_CAPTION_REGEN_LIMIT };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!row) {
    // First regeneration – create the row with caption_count = 1
    await adminSupabase.from('regen_limits').insert({
      post_id: postId,
      caption_count: 1,
      reset_at: now.toISOString(),
    });
    return { allowed: true, remaining: DAILY_CAPTION_REGEN_LIMIT - 1 };
  }

  // Check if reset is needed (reset_at is from a previous day)
  const resetDate = new Date(row.reset_at);
  if (resetDate < todayStart) {
    await adminSupabase
      .from('regen_limits')
      .update({
        image_count: 0,
        caption_count: 1,
        reset_at: now.toISOString(),
      })
      .eq('post_id', postId);
    return { allowed: true, remaining: DAILY_CAPTION_REGEN_LIMIT - 1 };
  }

  // Same day – check limit
  const currentCount = row.caption_count || 0;
  if (currentCount >= DAILY_CAPTION_REGEN_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  // Increment
  await adminSupabase
    .from('regen_limits')
    .update({ caption_count: currentCount + 1 })
    .eq('post_id', postId);

  return { allowed: true, remaining: DAILY_CAPTION_REGEN_LIMIT - (currentCount + 1) };
}

export async function POST(req: Request) {
  try {
    const { 
      topic, 
      contentType, 
      platform, 
      extraInstructions,
      brandDetails,
      postId: regenPostId, // Optional: set when regenerating an existing post's caption
      wordCount,
      hashtagCount,
      campaignExpiry,
    } = await req.json();

    // 1. Developer Test Mode (Skip AI if dev mode is active)
    if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
      console.log('🚧 DEVELOPER MODE ACTIVE: Skipping Gemini caption generation.');
      return NextResponse.json({ 
        captions: [
          `Dummy Caption for ${topic}: Enhance your brand with our premium ${contentType} services! #BrandBoost #AI #Marketing`
        ],
        remainingCaptionRegens: DAILY_CAPTION_REGEN_LIMIT,
      });
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not set');
    }

    // ── REGEN LIMIT CHECK (only for regeneration, not first generation) ──
    if (regenPostId) {
      const adminSupabase = createAdminClient();
      const { allowed, remaining } = await checkAndIncrementCaptionRegenLimit(adminSupabase, regenPostId);
      if (!allowed) {
        return NextResponse.json({
          error: 'Daily caption regeneration limit reached (3/3). Try again tomorrow.',
          code: 'REGEN_LIMIT_REACHED',
          remainingCaptionRegens: 0,
        }, { status: 429 });
      }
      console.log(`🔄 Caption regen allowed. ${remaining} caption regens remaining today.`);
    }

    const captionPrompt = getCaptionPrompt(brandDetails, topic, contentType, platform, extraInstructions, wordCount, hashtagCount, campaignExpiry);

    // Use Gemini 2.5 Flash for caption generation
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: captionPrompt,
    });

    // LOG TOKEN USAGE: Captions
    const usage = result.usageMetadata;
    console.log('📊 TOKEN USAGE [Caption Generation]:', {
      cause: `Creating highly engaging ${contentType} caption for ${platform}`,
      inputTokens: usage?.promptTokenCount,
      outputTokens: usage?.candidatesTokenCount,
      totalTokens: usage?.totalTokenCount
    });

    let text = result.text || '';
    
    // Clean markdown blocks if present (e.g., ```json ... ```)
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let captions = [];
    try {
      const parsed = JSON.parse(text);
      captions = parsed.captions || [];
    } catch (parseErr) {
      console.error('Gemini JSON Parse Error. Raw text:', text);
      // Fallback: If JSON parsing fails, try to extract lines as captions
      captions = text.split('\n').filter(line => line.length > 5).slice(0, 1);
    }

    // Calculate remaining regens for response
    let remainingCaptionRegens = DAILY_CAPTION_REGEN_LIMIT;
    if (regenPostId) {
      const adminSupabase = createAdminClient();
      const { data: regenRow } = await adminSupabase
        .from('regen_limits')
        .select('caption_count')
        .eq('post_id', regenPostId)
        .maybeSingle();
      if (regenRow) {
        remainingCaptionRegens = Math.max(0, DAILY_CAPTION_REGEN_LIMIT - (regenRow.caption_count || 0));
      }
    }

    return NextResponse.json({ captions, remainingCaptionRegens });
  } catch (error: any) {
    console.error('❌ Gemini Caption generation error:', error);
    return NextResponse.json({ 
      error: error.message,
      details: error.stack,
      code: error.status || 500
    }, { status: 500 });
  }
}
