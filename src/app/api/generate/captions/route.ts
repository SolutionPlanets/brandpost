import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { 
      topic, 
      contentType, 
      platform, 
      extraInstructions,
      brandDetails 
    } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const captionPrompt = `
      Create 3 engaging social media captions for a ${contentType} post about "${topic}".
      Platform: ${platform}
      Brand Name: ${brandDetails.businessName}
      Brand Description: ${brandDetails.brandDescription}
      Tone: ${brandDetails.brandTone}
      Extra Instructions: ${extraInstructions}
      
      Format the response as a JSON object with a "captions" array of strings.
    `;

    const captionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a creative social media manager. Respond only in JSON." },
        { role: "user", content: captionPrompt }
      ],
      response_format: { type: "json_object" },
    });

    const captionContent = captionResponse.choices[0].message.content;
    const captions = JSON.parse(captionContent || '{"captions":[]}').captions;

    return NextResponse.json({ captions });
  } catch (error: any) {
    console.error('Caption generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
