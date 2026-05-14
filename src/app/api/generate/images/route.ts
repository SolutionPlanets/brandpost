import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';

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
      brandDetails,
      workspaceId: bodyWorkspaceId
    } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
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

    // 2. Expand Prompts (Deep Analysis & Three-Section Layout)
    console.log('Starting prompt expansion...');
    let expandedPrompts: string[] = [];
    try {
      const promptExpansionMsg = `
        You are an Elite Creative Strategist and Graphic Designer. 
        Your goal is to design exactly TWO BESPOKE AND DISTINCT "Brand Post" marketing templates (Option 1 and Option 2).

        CRITICAL: QUALITY & TEXT
        - IMAGE QUALITY: Ultra-HD, 8k resolution, photorealistic, sharp focus, NO BLUR, NO NOISE.
        - TEXT CLARITY: Every letter MUST be sharp, crisp, and perfectly legible.
        - SPELLING: The business name "${brandDetails.businessName}" and the topic "${topic}" MUST be spelled 100% correctly.
        - LANGUAGE: All text in the image MUST be in CLEAR, FLUENT ENGLISH.

        USER INPUTS:
        - Topic: "${topic}"
        - Goal: "${contentType}"
        - Platform: "${platform}"
        - Instructions: "${extraInstructions || 'No extra instructions'}"

        BRAND DATABASE:
        - Business Name: "${brandDetails.businessName}"
        - Logo Reference: ${brandDetails.logo ? `IMPORTANT: Perfectly integrate the visual style, symbol, and colors of this logo into the header: ${brandDetails.logo}` : 'No logo, use premium professional typography for branding.'}
        - Palette: ${brandDetails.colors.primary}, ${brandDetails.colors.secondary}, ${brandDetails.colors.accent}

        DESIGN OPTIONS (GENERATE 2 INDEPENDENT PROMPTS):
        - Option 1 (Minimalist & Modern): Describe a SINGLE, ISOLATED poster with a clean, high-contrast background, razor-sharp typography, and a cinematic focal visual of "${topic}".
        - Option 2 (Vibrant & Energetic): Describe a SINGLE, ISOLATED poster with bold brand colors, dynamic composition, dramatic lighting, and a high-impact visual of "${topic}".

        IMPORTANT: Each prompt in the "expandedPrompts" array must describe ONE SINGLE isolated poster. NO side-by-side. NO comparisons. Use keywords like "Sharp focus", "Highly detailed", "Crisp text".

        POSTER STRUCTURE:
        1. TOP: Premium branding area with "${brandDetails.businessName}" and the user's logo.
        2. CENTER: A breathtaking, high-definition visual representation of "${topic}".
        3. BOTTOM: A professional, clean footer area with contact info and address in sharp fonts.

        Respond with a JSON object: {"expandedPrompts": ["detailed prompt for Option 1", "detailed prompt for Option 2"]}
      `;

      const expansionResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "system",
          content: "You are an expert at translating brand database metrics into premium visual assets."
        }, {
          role: "user",
          content: promptExpansionMsg
        }],
        response_format: { type: "json_object" },
      });

      const expansionContent = expansionResponse.choices[0].message.content;
      expandedPrompts = JSON.parse(expansionContent || '{"expandedPrompts":[]}').expandedPrompts;
      console.log('Expanded Prompts count:', expandedPrompts.length);

      if (!expandedPrompts || expandedPrompts.length < 2) {
        console.warn('GPT returned fewer than 2 prompts, adding fallback variation.');
        const basePrompt = expandedPrompts[0] || `Professional marketing poster for ${brandDetails.businessName} about ${topic}`;
        expandedPrompts = [
          basePrompt,
          `${basePrompt} - vibrant cinematic style, high impact`
        ];
      }
    } catch (err: any) {
      console.error('Prompt expansion error:', err);
      // Fallback to simple prompts if expansion fails
      expandedPrompts = [
        `Minimalist professional marketing poster for ${brandDetails.businessName} about ${topic}, high quality typography`,
        `Vibrant creative marketing poster for ${brandDetails.businessName} about ${topic}, cinematic lighting`
      ];
    }

    // 2. Generate Images
    console.log('Generating images for prompts using DALL-E 3...');
    const imagePromises = expandedPrompts.map(async (p, i) => {
      try {
        console.log(`Starting generation for Option ${i + 1}...`);
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: p,
          n: 1,
          size: "1024x1024",
          quality: "standard",
        });

        const url = response.data?.[0]?.url;
        if (url) {
          console.log(`Option ${i + 1} generated successfully.`);
          return url;
        }
        console.warn(`Option ${i + 1} returned no URL.`);
        return null;
      } catch (err: any) {
        console.error(`Image generation failed for Option ${i + 1}:`, err.message);
        return null;
      }
    });

    const tempUrlsResult = await Promise.all(imagePromises);
    const finalTempUrls = tempUrlsResult.filter((url): url is string => url !== null);

    console.log(`Successfully generated ${finalTempUrls.length} images.`);

    if (finalTempUrls.length === 0) {
      throw new Error('Image generation was rejected by the safety system for all prompts. Please try a different topic.');
    }

    const tempUrls = finalTempUrls;

    const finalUrls = await Promise.all(tempUrls.map(async (url, index) => {
      try {
        // 1. Fetch the image from OpenAI
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image from OpenAI: ${response.statusText}`);
        const buffer = await response.arrayBuffer();

        // 2. Prepare filename
        const timestamp = Date.now();
        const safeBusinessName = (brandDetails.businessName || 'Brand').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${safeBusinessName}_${timestamp}_${index}.png`;
        const filePath = `${uid}/${filename}`;

        // 3. Upload to Supabase Storage using Admin Client (bypasses RLS)
        const { error: uploadError } = await adminSupabase.storage
          .from('BrandPostAI_Post')
          .upload(filePath, buffer, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error('Supabase upload error:', uploadError);
          return url; // Fallback to OpenAI URL
        }

        // 4. Get Public URL
        const { data: { publicUrl } } = adminSupabase.storage
          .from('BrandPostAI_Post')
          .getPublicUrl(filePath);

        // 3. Save to database (posts table)
        try {
          const insertData = {
            workspace_id: targetWorkspaceId,
            brand_kit_id: brandKitId || null,
            caption: `Generated for ${topic} on ${platform}`,
            image_url: publicUrl,
            status: 'published',
            platform: platform === 'both' ? 'both' : platform,
            content_type: contentType
          };
          
          console.log('Final Insertion Data:', JSON.stringify(insertData, null, 2));

          const { data: postInsertData, error: postInsertError } = await adminSupabase
            .from('posts')
            .insert([insertData])
            .select();

          if (postInsertError) {
            console.error('CRITICAL POST INSERT ERROR:', postInsertError.message, postInsertError.details, postInsertError.hint);
          } else {
            console.log('POST SAVED SUCCESS! ID:', postInsertData && postInsertData[0]?.id);
          }
        } catch (dbErr: any) {
          console.error('DB INSERT EXCEPTION:', dbErr.message);
        }

        return publicUrl;
      } catch (uploadErr) {
        console.error('Storage processing error:', uploadErr);
        return url; // Fallback to OpenAI URL
      }
    }));

    // Update usage in workspace
    await adminSupabase
      .from('workspaces')
      .update({ posts_used_this_cycle: (workspace.posts_used_this_cycle || 0) + finalUrls.length })
      .eq('id', targetWorkspaceId);

    return NextResponse.json({ images: finalUrls });
  } catch (error: any) {
    console.error('Fatal Image generation error:', error);
    return NextResponse.json({
      error: error.message,
      details: 'Check server logs for full stack trace'
    }, { status: 500 });
  }
}
