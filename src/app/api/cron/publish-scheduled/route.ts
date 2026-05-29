import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

// This endpoint should be triggered by a Cron service (e.g. Vercel Cron, GitHub Actions)
export async function GET(req: Request) {
  // 1. Security Check: Ensure this is only called by our trusted cron job
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminSupabase = createAdminClient();
    const now = new Date().toISOString();

    // 1. Find posts that are scheduled and due
    const { data: scheduledPosts, error: fetchError } = await adminSupabase
      .from('posts')
      .select('id')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);

    if (fetchError) throw fetchError;

    if (!scheduledPosts || scheduledPosts.length === 0) {
      return NextResponse.json({ message: 'No posts due for publishing.' });
    }

    console.log(`Cron: Found ${scheduledPosts.length} posts to publish.`);

    const results = [];

    // 2. Process each post (calling our internal publish API logic)
    for (const post of scheduledPosts) {
      try {
        // We call our own publish API internally or share the logic
        // For simplicity in this route, we'll trigger a fetch to our publish endpoint
        // NOTE: In production, ensure this URL is correct for your environment
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
        const host = req.headers.get('host');
        
        const pubRes = await fetch(`${protocol}://${host}/api/social/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: post.id })
        });
        
        const data = await pubRes.json();
        results.push({ postId: post.id, success: data.success });
      } catch (err: any) {
        console.error(`Cron: Failed to publish post ${post.id}:`, err.message);
        results.push({ postId: post.id, success: false, error: err.message });
      }
    }

    return NextResponse.json({ 
      message: `Processed ${scheduledPosts.length} posts.`,
      results 
    });

  } catch (error: any) {
    console.error('Cron Job Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
