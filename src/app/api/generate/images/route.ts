import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';
import { getImageExpansionPrompt } from './prompts';

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

    // 2. Developer Test Mode (Skip AI if dev mode is active)
    if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
      console.log('🚧 DEVELOPER MODE ACTIVE: Skipping AI image generation and using dummy images.');
      const dummyUrls = [
        `https://picsum.photos/seed/${topic.replace(/\s+/g, '')}1/1024/1024`,
        `https://picsum.photos/seed/${topic.replace(/\s+/g, '')}2/1024/1024`
      ];
      
      // Proceed to storage upload with dummy images
      return await processAndStoreImages(dummyUrls, targetWorkspaceId, uid, topic, platform, contentType, brandKitId, workspace, extraInstructions);
    }

    // 3. Expand Prompts (Deep Analysis & Three-Section Layout)
    console.log('Starting prompt expansion...');
    let expandedPrompts: string[] = [];
    try {
      const promptExpansionMsg = getImageExpansionPrompt(brandDetails, topic, contentType, platform, extraInstructions);

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
    console.log('Generating images for prompts...');
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

    return await processAndStoreImages(finalTempUrls, targetWorkspaceId, uid, topic, platform, contentType, brandKitId, workspace, extraInstructions);
  } catch (error: any) {
    console.error('Fatal Image generation error:', error);
    return NextResponse.json({
      error: error.message,
      details: 'Check server logs for full stack trace'
    }, { status: 500 });
  }
}

// Helper function to process URLs (fetch, store in Supabase, insert to DB)
async function processAndStoreImages(
  urls: string[], 
  targetWorkspaceId: string, 
  uid: string | undefined, 
  topic: string, 
  platform: string, 
  contentType: string, 
  brandKitId: any, 
  workspace: any,
  extraInstructions: string
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

      // 5. Save to database
      try {
        const { data: postData, error: postInsertError } = await adminSupabase
          .from('posts')
          .insert([{
            workspace_id: targetWorkspaceId,
            brand_kit_id: brandKitId || null,
            caption: `Generated for ${topic} on ${platform}`,
            image_url: publicUrl,
            status: 'draft',
            platform: platform === 'both' ? 'both' : platform,
            content_type: contentType,
            title: topic,
            extra_instructions: extraInstructions
          }])
          .select('id')
          .single();

        if (postInsertError) {
          console.error('CRITICAL POST INSERT ERROR:', postInsertError.message);
          return { url: publicUrl, id: null };
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

  // Update usage in workspace (Only increment if NOT in dev mode, or keep it to test quota logic)
  await adminSupabase
    .from('workspaces')
    .update({ posts_used_this_cycle: (workspace.posts_used_this_cycle || 0) + results.length })
    .eq('id', targetWorkspaceId);

  return NextResponse.json({ images: results });
}
