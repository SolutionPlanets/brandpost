import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

/**
 * POST /api/social/connect
 * Receives the Facebook provider_token from the client after OAuth,
 * fetches Pages + Instagram accounts from Graph API,
 * and stores them in social_connections.
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the current session to access provider_token
    const { data: { session } } = await supabase.auth.getSession();
    const providerToken = session?.provider_token;

    if (!providerToken) {
      return NextResponse.json({ error: 'No Facebook token available. Please re-authenticate with Facebook.' }, { status: 400 });
    }

    // Get the user's workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    // Fetch Facebook Pages with profile pictures & linked Instagram accounts
    const fbRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,picture,instagram_business_account&access_token=${providerToken}`
    );
    const fbData = await fbRes.json();

    if (fbData.error) {
      console.error('Facebook Graph API error:', fbData.error);
      return NextResponse.json({ error: fbData.error.message }, { status: 400 });
    }

    const savedPages: any[] = [];

    if (fbData?.data) {
      for (const page of fbData.data) {
        // Calculate token expiry (Facebook Page tokens from long-lived user tokens don't expire,
        // but we set a 60-day marker for safety)
        const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
        const pictureUrl = page.picture?.data?.url || null;

        // Upsert Facebook Page
        const { data: existingFb } = await supabase
          .from('social_connections')
          .select('id')
          .eq('workspace_id', workspace.id)
          .eq('platform', 'facebook')
          .eq('page_id', page.id)
          .maybeSingle();

        if (!existingFb) {
          await supabase.from('social_connections').insert({
            workspace_id: workspace.id,
            platform: 'facebook',
            page_id: page.id,
            page_name: page.name,
            access_token: page.access_token,
            token_expires_at: tokenExpiresAt,
          });
        } else {
          await supabase.from('social_connections').update({
            page_name: page.name,
            access_token: page.access_token,
            token_expires_at: tokenExpiresAt,
            updated_at: new Date().toISOString(),
          }).eq('id', existingFb.id);
        }

        savedPages.push({
          platform: 'facebook',
          page_id: page.id,
          page_name: page.name,
          picture_url: pictureUrl,
        });

        // Upsert linked Instagram Business Account
        if (page.instagram_business_account) {
          const igId = page.instagram_business_account.id;

          // Fetch Instagram profile info
          let igName = `${page.name} (Instagram)`;
          let igPictureUrl = null;
          try {
            const igRes = await fetch(
              `https://graph.facebook.com/v19.0/${igId}?fields=name,username,profile_picture_url&access_token=${page.access_token}`
            );
            const igData = await igRes.json();
            if (igData.username) igName = `@${igData.username}`;
            igPictureUrl = igData.profile_picture_url || null;
          } catch (e) {
            // Fallback name is fine
          }

          const { data: existingIg } = await supabase
            .from('social_connections')
            .select('id')
            .eq('workspace_id', workspace.id)
            .eq('platform', 'instagram')
            .eq('page_id', igId)
            .maybeSingle();

          if (!existingIg) {
            await supabase.from('social_connections').insert({
              workspace_id: workspace.id,
              platform: 'instagram',
              page_id: igId,
              page_name: igName,
              access_token: page.access_token,
              token_expires_at: tokenExpiresAt,
            });
          } else {
            await supabase.from('social_connections').update({
              page_name: igName,
              access_token: page.access_token,
              token_expires_at: tokenExpiresAt,
              updated_at: new Date().toISOString(),
            }).eq('id', existingIg.id);
          }

          savedPages.push({
            platform: 'instagram',
            page_id: igId,
            page_name: igName,
            picture_url: igPictureUrl,
          });
        }
      }
    }

    return NextResponse.json({ success: true, connections: savedPages });
  } catch (err: any) {
    console.error('Social connect error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
