import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getCaptionPrompt } from './prompts';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY || '' });

export async function POST(req: Request) {
  try {
    const { 
      topic, 
      contentType, 
      platform, 
      extraInstructions,
      brandDetails 
    } = await req.json();

    // 1. Developer Test Mode (Skip AI if dev mode is active)
    if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
      console.log('🚧 DEVELOPER MODE ACTIVE: Skipping Gemini caption generation.');
      return NextResponse.json({ 
        captions: [
          `Dummy Caption for ${topic}: Enhance your brand with our premium ${contentType} services! #BrandBoost #AI #Marketing`
        ] 
      });
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not set');
    }

    const captionPrompt = getCaptionPrompt(brandDetails, topic, contentType, platform, extraInstructions);

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

    return NextResponse.json({ captions });
  } catch (error: any) {
    console.error('❌ Gemini Caption generation error:', error);
    return NextResponse.json({ 
      error: error.message,
      details: error.stack,
      code: error.status || 500
    }, { status: 500 });
  }
}
