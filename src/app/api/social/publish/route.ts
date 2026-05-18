import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: Request) {
  console.log('\n' + '='.repeat(50));
  console.log('===== SOCIAL PUBLISH START =====');
  console.log('='.repeat(50));
  
  try {
    const { postId } = await req.json();
    console.log(`Publishing Post ID: ${postId}`);
    const adminSupabase = createAdminClient();

    // 1. Fetch Post Data
    const { data: post, error: postError } = await adminSupabase
      .from('posts')
      .select('*, workspaces!inner(*)')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      console.error('Publish Error: Post record not found in DB:', postError);
      throw new Error('Post not found');
    }

    console.log(`Post loaded: "${post.title}" for platform: ${post.platform}`);

    // 2. Fetch Social Connections
    const { data: connections, error: connError } = await adminSupabase
      .from('social_connections')
      .select('*')
      .eq('workspace_id', post.workspace_id);

    if (connError || !connections || connections.length === 0) {
      console.error('Publish Error: No social connections found for workspace:', post.workspace_id);
      throw new Error('No social connections found for this workspace');
    }

    console.log(`Found ${connections.length} social connections.`);
    connections.forEach(c => console.log(`- Connection: ${c.platform} (ID: ${c.page_id}, Name: ${c.page_name})`));
    
    const fbConn = connections.find(c => c.platform.toLowerCase() === 'facebook');
    const igConn = connections.find(c => c.platform.toLowerCase() === 'instagram');

    let fbPostId = null;
    let igPostId = null;
    let errors: string[] = [];

    // 3. Publish to Facebook
    if ((post.platform === 'facebook' || post.platform === 'both') && fbConn) {
      try {
        console.log(`Publish: Attempting Facebook post for Page ID: ${fbConn.page_id} (${fbConn.page_name})`);
        const fbUrl = `https://graph.facebook.com/v22.0/${fbConn.page_id}/photos`;
        const fbRes = await fetch(fbUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: post.image_url,
            message: post.caption,
            access_token: fbConn.access_token
          })
        });
        const fbData = await fbRes.json();
        console.log('Publish: Facebook API Response:', JSON.stringify(fbData));
        
        if (fbData.id) {
          fbPostId = fbData.id;
        } else {
          errors.push(`Facebook Error: ${fbData.error?.message || 'Unknown error'}`);
        }
      } catch (e: any) {
        console.error('Publish: Facebook Exception:', e.message);
        errors.push(`Facebook Exception: ${e.message}`);
      }
    }

    // 4. Publish to Instagram
    if ((post.platform === 'instagram' || post.platform === 'both') && igConn) {
      try {
        console.log(`Publish: Attempting Instagram post for IG ID: ${igConn.page_id} (${igConn.page_name})`);
        // Step A: Create Media Container
        const igContainerUrl = `https://graph.facebook.com/v22.0/${igConn.page_id}/media`;
        const containerRes = await fetch(igContainerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: post.image_url,
            caption: post.caption,
            access_token: igConn.access_token
          })
        });
        const containerData = await containerRes.json();
        console.log('Publish: IG Container Response:', JSON.stringify(containerData));
        
        if (containerData.id) {
          const creationId = containerData.id;
          
          // Step B: Wait for Instagram to process the image (Media ID is not available fix)
          console.log('Publish: Waiting 3 seconds for Instagram processing...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Step C: Publish Media Container
          const igPublishUrl = `https://graph.facebook.com/v22.0/${igConn.page_id}/media_publish`;
          const publishRes = await fetch(igPublishUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creation_id: creationId,
              access_token: igConn.access_token
            })
          });
          const publishData = await publishRes.json();
          console.log('Publish: IG Final Publish Response:', JSON.stringify(publishData));
          
          if (publishData.id) {
            igPostId = publishData.id;
          } else {
            errors.push(`Instagram Publish Error: ${publishData.error?.message || 'Unknown error'}`);
          }
        } else {
          errors.push(`Instagram Container Error: ${containerData.error?.message || 'Unknown error'}`);
        }
      } catch (e: any) {
        console.error('Publish: Instagram Exception:', e.message);
        errors.push(`Instagram Exception: ${e.message}`);
      }
    }

    // 5. Update Post Record
    const updateData: any = {
      published_at: new Date().toISOString(),
      fb_post_id: fbPostId,
      ig_post_id: igPostId,
      status: (fbPostId || igPostId) ? 'published' : 'failed',
      error_message: errors.length > 0 ? errors.join('; ') : null
    };

    await adminSupabase
      .from('posts')
      .update(updateData)
      .eq('id', postId);

    return NextResponse.json({ 
      success: !!(fbPostId || igPostId),
      fbPostId,
      igPostId,
      errors: errors.length > 0 ? errors : null
    });

  } catch (error: any) {
    console.error('Publish API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
