import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  console.log("\n" + "=".repeat(50));
  console.log("===== SOCIAL PUBLISH START =====");
  console.log("=".repeat(50));

  try {
    const { postId } = await req.json();
    console.log(`Publishing Post ID: ${postId}`);
    const adminSupabase = createAdminClient();

    // 1. Fetch Post Data
    const { data: post, error: postError } = await adminSupabase
      .from("posts")
      .select("*, workspaces!inner(*)")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      console.error("Publish Error: Post record not found in DB:", postError);
      throw new Error("Post not found");
    }

    console.log(`Post loaded: "${post.title}" for platform: ${post.platform}`);

    // 2. Fetch Social Connections
    const { data: connections, error: connError } = await adminSupabase
      .from("social_connections")
      .select("*")
      .eq("workspace_id", post.workspace_id);

    if (connError || !connections || connections.length === 0) {
      console.error(
        "Publish Error: No social connections found for workspace:",
        post.workspace_id,
      );
      throw new Error("No social connections found for this workspace");
    }

    console.log(`Found ${connections.length} social connections.`);
    connections.forEach((c) =>
      console.log(
        `- Connection: ${c.platform} (ID: ${c.page_id}, Name: ${c.page_name})`,
      ),
    );

    const fbConn = connections.find(
      (c) => c.platform.toLowerCase() === "facebook",
    );
    const igConn = connections.find(
      (c) => c.platform.toLowerCase() === "instagram",
    );

    let fbPostId = null;
    let igPostId = null;
    let errors: string[] = [];
    let imageUrl = post.image_url;

    // Check if imageUrl is a local/relative path
    if (imageUrl && !imageUrl.startsWith('http')) {
      try {
        const cleanPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
        const localPath = path.join(process.cwd(), 'public', cleanPath);
        
        if (fs.existsSync(localPath)) {
          console.log(`Local image detected at: ${localPath}. Uploading to Supabase Storage for public access...`);
          const fileBuffer = fs.readFileSync(localPath);
          const extension = path.extname(cleanPath) || '.png';
          const mimeType = extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 'image/png';
          const filename = `local_${Date.now()}${extension}`;
          const storagePath = `local_uploads/${post.workspace_id}/${filename}`;

          // Upload to storage using Admin Client (bypasses RLS)
          const { error: uploadError } = await adminSupabase.storage
            .from('BrandPostAI_Post')
            .upload(storagePath, fileBuffer, {
              contentType: mimeType,
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) {
            console.error('Failed to upload local image to storage:', uploadError);
            throw uploadError;
          }

          // Get Public URL
          const { data: { publicUrl } } = adminSupabase.storage
            .from('BrandPostAI_Post')
            .getPublicUrl(storagePath);

          console.log(`Local image successfully uploaded. Public URL: ${publicUrl}`);
          imageUrl = publicUrl;

          // Update post record in DB with the new public URL so it is persisted
          await adminSupabase
            .from('posts')
            .update({ image_url: publicUrl })
            .eq('id', postId);
        } else {
          console.warn(`Local file not found at: ${localPath}. Trying to proceed as-is.`);
        }
      } catch (err: any) {
        console.error('Error handling local image upload:', err.message);
        errors.push(`Local Image Upload Error: ${err.message}`);
      }
    }

    // 3. Publish to Facebook
    if ((post.platform === "facebook" || post.platform === "both") && fbConn) {
      try {
        console.log(`Publish: Attempting Facebook post for Page ID: ${fbConn.page_id} (${fbConn.page_name})`);
        const fbUrl = `https://graph.facebook.com/v22.0/${fbConn.page_id}/photos`;
        const fbRes = await fetch(fbUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: imageUrl,
            message: post.caption,
            access_token: fbConn.access_token,
          }),
        });
        const fbData = await fbRes.json();
        console.log("Publish: Facebook API Response:", JSON.stringify(fbData));

        if (fbData.id) {
          fbPostId = fbData.id;
        } else {
          errors.push(
            `Facebook Error: ${fbData.error?.message || "Unknown error"}`,
          );
        }
      } catch (e: any) {
        console.error("Publish: Facebook Exception:", e.message);
        errors.push(`Facebook Exception: ${e.message}`);
      }
    }

    // 4. Publish to Instagram
    if ((post.platform === "instagram" || post.platform === "both") && igConn) {
      try {
        console.log(
          `Publish: Attempting Instagram post for IG ID: ${igConn.page_id} (${igConn.page_name})`,
        );
        // Step A: Create Media Container
        const igContainerUrl = `https://graph.facebook.com/v22.0/${igConn.page_id}/media`;
        const containerRes = await fetch(igContainerUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: imageUrl,
            caption: post.caption,
            access_token: igConn.access_token,
          }),
        });
        const containerData = await containerRes.json();
        console.log(
          "Publish: IG Container Response:",
          JSON.stringify(containerData),
        );

        if (containerData.id) {
          const creationId = containerData.id;

          // Step B: Wait for Instagram to process the image (Media ID is not available fix)
          console.log("Publish: Waiting 10 seconds for Instagram processing...");
          await new Promise((resolve) => setTimeout(resolve, 10000));

          // Step C: Publish Media Container
          const igPublishUrl = `https://graph.facebook.com/v22.0/${igConn.page_id}/media_publish`;
          const publishRes = await fetch(igPublishUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              creation_id: creationId,
              access_token: igConn.access_token,
            }),
          });
          const publishData = await publishRes.json();
          console.log(
            "Publish: IG Final Publish Response:",
            JSON.stringify(publishData),
          );

          if (publishData.id) {
            igPostId = publishData.id;
          } else {
            errors.push(
              `Instagram Publish Error: ${publishData.error?.message || "Unknown error"}`,
            );
          }
        } else {
          errors.push(
            `Instagram Container Error: ${containerData.error?.message || "Unknown error"}`,
          );
        }
      } catch (e: any) {
        console.error("Publish: Instagram Exception:", e.message);
        errors.push(`Instagram Exception: ${e.message}`);
      }
    }

    // 5. Update Post Record
    const updateData: any = {
      published_at: new Date().toISOString(),
      fb_post_id: fbPostId,
      ig_post_id: igPostId,
      status: fbPostId || igPostId ? "published" : "failed",
      error_message: errors.length > 0 ? errors.join("; ") : null,
    };

    await adminSupabase.from("posts").update(updateData).eq("id", postId);

    return NextResponse.json({
      success: !!(fbPostId || igPostId),
      fbPostId,
      igPostId,
      errors: errors.length > 0 ? errors : null,
    });
  } catch (error: any) {
    console.error("Publish API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
