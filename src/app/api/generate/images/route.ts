import { NextResponse } from 'next/server';
import { GoogleGenAI, Modality } from '@google/genai';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';
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
    if (regenPostId) {
      const { allowed, remaining } = await checkAndIncrementRegenLimit(adminSupabase, regenPostId, 'image');
      if (!allowed) {
        return NextResponse.json({
          error: 'Daily image regeneration limit reached (3/3). Try again tomorrow.',
          code: 'REGEN_LIMIT_REACHED',
          remainingImageRegens: 0,
        }, { status: 429 });
      }
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
          caption: `Processing: ${topic}...`
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

      return await processAndStoreImages(dummyUrls, targetWorkspaceId, uid, topic, platform, contentType, brandKitId, workspace, extraInstructions, draftId);
    }

    // 3. Resolve platform aspect ratio
    const aspectRatio = PLATFORM_RATIOS[platform] || '1:1';
    console.log(`📐 Platform: ${platform} → Aspect Ratio: ${aspectRatio}`);

    // 4. Expand Prompt using Gemini 2.5 Flash (text-only, cheap & fast)
    console.log('Starting prompt expansion with Gemini 2.5 Flash...');
    let expandedPrompt = '';
    let dynamicNegativePrompt = '';
    let designRationale = '';

    try {
      const promptExpansionMsg = getImageExpansionPrompt(brandDetails, topic, contentType, platform, extraInstructions, graphicHeadline, heroObjects);

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

      console.log('Expanded Prompt length:', expandedPrompt.length);
      console.log('🎨 Design Rationale:', designRationale);
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

      // 8. Upload generated image buffer to Supabase Storage and save metadata
      return await processAndStoreBuffer(
        imageBuffer, targetWorkspaceId, uid, topic, platform, contentType,
        brandKitId, workspace, extraInstructions, draftId,
        // Extended metadata
        expandedPrompt, mergedNegativePrompt, setup.modelId, aspectRatio,
        regenPostId
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

    if (draftId) {
      const updatePayload: any = {
        image_url: publicUrl,
        status: 'draft',
        ...metadataFields,
      };
      // Only overwrite caption placeholder on first generation, not on regen
      if (!isRegen) {
        updatePayload.caption = `Generated for ${topic} on ${platform}`;
      }

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
          caption: `Generated for ${topic} on ${platform}`,
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

    // 5. Update usage in workspace (only for first generation, not regens)
    if (!isRegen) {
      await adminSupabase
        .from('workspaces')
        .update({ posts_used_this_cycle: (workspace.posts_used_this_cycle || 0) + 1 })
        .eq('id', targetWorkspaceId);
    }

    // 6. Fetch remaining regen count for the response
    let remainingImageRegens = DAILY_IMAGE_REGEN_LIMIT;
    if (isRegen && postData?.id) {
      const { data: regenRow } = await adminSupabase
        .from('regen_limits')
        .select('image_count')
        .eq('post_id', postData.id)
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

  return NextResponse.json({ images: results, remainingImageRegens: DAILY_IMAGE_REGEN_LIMIT });
}
