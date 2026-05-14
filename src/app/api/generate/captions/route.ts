import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCaptionPrompt } from './prompts';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

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
          `Dummy Caption 1 for ${topic}: Enhance your brand with our premium ${contentType} services! #BrandBoost`,
          `Dummy Caption 2 for ${topic}: Discover why everyone is talking about ${brandDetails.businessName}. Quality you can trust.`,
          `Dummy Caption 3 for ${topic}: Limited time offer on all ${contentType} posts! DM us to get started with ${brandDetails.businessName}.`
        ] 
      });
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not set');
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const captionPrompt = getCaptionPrompt(brandDetails, topic, contentType, platform, extraInstructions);

    // Requesting without responseMimeType to avoid 400 errors on some v1 endpoints
    const result = await model.generateContent(captionPrompt);
    const response = await result.response;
    let text = response.text();
    
    // Clean markdown blocks if present (e.g., ```json ... ```)
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let captions = [];
    try {
      const parsed = JSON.parse(text);
      captions = parsed.captions || [];
    } catch (parseErr) {
      console.error('Gemini JSON Parse Error. Raw text:', text);
      // Fallback: If JSON parsing fails, try to extract lines as captions
      captions = text.split('\n').filter(line => line.length > 5).slice(0, 3);
    }

    return NextResponse.json({ captions });
  } catch (error: any) {
    console.error('Gemini Caption generation error:', error);
    return NextResponse.json({ 
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
}
