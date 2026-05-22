import { NextResponse } from 'next/server';
import { GoogleGenAI, Modality } from '@google/genai';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';
import { getImageExpansionPrompt } from './prompts';

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

    // ── NEW: INITIAL DRAFT CREATION ────────────────────────────────────
    // Create a draft record immediately so user progress isn't lost on failure
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
        caption: `Processing: ${topic}...`
      }])
      .select('id')
      .single();

    const draftId = initialDraft?.id;
    if (draftError) console.error('Warning: Could not create initial draft record:', draftError.message);

    // 2. Developer Test Mode (Skip AI if dev mode is active)
    if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
      console.log('🚧 DEVELOPER MODE ACTIVE: Skipping AI image generation and using dummy images.');
      const dummyUrls = [
        `https://picsum.photos/seed/${topic.replace(/\s+/g, '')}1/1024/1024`
      ];

      return await processAndStoreImages(dummyUrls, targetWorkspaceId, uid, topic, platform, contentType, brandKitId, workspace, extraInstructions, draftId);
    }

    // 3. Expand Prompt using Gemini 2.5 Flash (text-only, cheap & fast)
    console.log('Starting prompt expansion with Gemini 2.5 Flash...');
    let expandedPrompt = '';
    try {
      const promptExpansionMsg = getImageExpansionPrompt(brandDetails, topic, contentType, platform, extraInstructions);

      const expansionResult = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptExpansionMsg,
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
      console.log('Expanded Prompt length:', expandedPrompt.length);

      if (!expandedPrompt) {
        console.warn('Gemini returned no prompt, using fallback.');
        expandedPrompt = `Professional marketing poster for ${brandDetails.businessName} about ${topic}, high quality, sharp typography, premium design`;
      }
    } catch (err: any) {
      console.error('Prompt expansion error:', err.message);
      expandedPrompt = `Professional marketing poster for ${brandDetails.businessName} about ${topic}, high quality typography, premium brand design, sharp focus`;
    }

    // 4. Resolve active model configuration from registry
    const activeKey = process.env.ACTIVE_IMAGE_MODEL || 'IMAGEN_FAST';
    const setup = IMAGE_MODEL_REGISTRY[activeKey] || IMAGE_MODEL_REGISTRY.IMAGEN_FAST;

    console.log(`Generating image with ${activeKey} (model: ${setup.modelId})...`);
    let imageBuffer: Buffer | null = null;
    try {
      if (setup.apiType === 'generateContent') {
        const imageResult = await ai.models.generateContent({
          model: setup.modelId,
          contents: expandedPrompt,
          config: setup.config,
        });

        // Log token usage for content generation model
        const imgUsage = imageResult.usageMetadata;
        console.log('📊 TOKEN USAGE [Image Generation]:', {
          cause: `Generating native image with ${activeKey}`,
          inputTokens: imgUsage?.promptTokenCount,
          outputTokens: imgUsage?.candidatesTokenCount,
          totalTokens: imgUsage?.totalTokenCount
        });

        // Extract base64 image data from response parts
        const parts = imageResult.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            imageBuffer = Buffer.from(part.inlineData.data, 'base64');
            console.log(`Image generated successfully via ${activeKey}. Buffer size:`, imageBuffer.length);
            break;
          }
        }
      } else {
        const imageResult = await ai.models.generateImages({
          model: setup.modelId,
          prompt: expandedPrompt,
          config: setup.config,
        });

        // Imagen uses per-image pricing rather than token-based pricing
        console.log('📊 IMAGEN USAGE:', {
          cause: `Generating high-resolution image via ${activeKey}`,
          model: setup.modelId,
          numberOfImages: setup.config.numberOfImages,
          aspectRatio: setup.config.aspectRatio
        });

        // Extract base64 image data from generated images
        const generatedImage = imageResult.generatedImages?.[0];
        if (generatedImage?.image?.imageBytes) {
          imageBuffer = Buffer.from(generatedImage.image.imageBytes, 'base64');
          console.log(`Image generated successfully via ${activeKey}. Buffer size:`, imageBuffer.length);
        }
      }

      if (!imageBuffer) {
        throw new Error(`${activeKey} returned no image data in the response.`);
      }
    } catch (imgErr: any) {
      console.error(`❌ ${activeKey} Image generation failed:`, imgErr.message);
      // Update draft with error info if possible
      if (draftId) {
        await adminSupabase
          .from('posts')
          .update({ caption: `Error during generation: ${imgErr.message}` })
          .eq('id', draftId);
      }
      throw imgErr;
    }

    // 5. Upload generated image buffer to Supabase Storage
    return await processAndStoreBuffer(imageBuffer, targetWorkspaceId, uid, topic, platform, contentType, brandKitId, workspace, extraInstructions, draftId);

  } catch (error: any) {
    console.error('Fatal Image generation error:', error);
    return NextResponse.json({
      error: error.message,
      details: 'Check server logs for full stack trace'
    }, { status: 500 });
  }
}

// Helper function to process a buffer (upload to Supabase, insert to DB)
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
  draftId?: string
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

    if (draftId) {
      const { data, error } = await adminSupabase
        .from('posts')
        .update({
          caption: `Generated for ${topic} on ${platform}`,
          image_url: publicUrl,
          status: 'draft',
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
      postData = data;
      postError = error;
    }

    if (postError) {
      console.error('CRITICAL POST DB ERROR:', postError.message);
      // Still return the image even if DB update fails
      return NextResponse.json({ images: [{ url: publicUrl, id: draftId || null }] });
    }

    // 5. Update usage in workspace
    await adminSupabase
      .from('workspaces')
      .update({ posts_used_this_cycle: (workspace.posts_used_this_cycle || 0) + 1 })
      .eq('id', targetWorkspaceId);

    return NextResponse.json({ images: [{ url: publicUrl, id: postData?.id }] });

  } catch (err: any) {
    console.error('Storage processing error:', err);
    throw err;
  }
}

// Helper function to process URLs (for dev mode dummy images)
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
  draftId?: string
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
              extra_instructions: extraInstructions
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

  return NextResponse.json({ images: results });
}
