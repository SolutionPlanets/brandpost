import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const error_description = searchParams.get('error_description');

  if (error_description) {
    console.error('Callback: Auth error from provider:', error_description);
    // If the user was in the middle of onboarding or settings, send them back there
    if (next && (next.includes('/onboarding') || next.includes('/dashboard'))) {
      const separator = next.includes('?') ? '&' : '?';
      return NextResponse.redirect(`${origin}${next}${separator}error=${encodeURIComponent(error_description)}`);
    }
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error_description)}`);
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    // Admin client to bypass RLS during callback processing
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Exchange the code for a session (PKCE)
    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!exchangeError && exchangeData) {
      const { session, user } = exchangeData;
      
      if (user) {
        console.log(`Callback: Processing user ${user.email} (${user.id})`);
        
        // 1. Ensure user and workspace records exist using admin client
        const { data: existingUser } = await adminSupabase
          .from('users')
          .select('id, auth_provider, profile_photo, mail_verified')
          .eq('id', user.id)
          .maybeSingle();

        if (!existingUser) {
          // Determine the signup provider
          const signupProvider = user.app_metadata?.provider || 'email';
          let providerPhoto: string | null = null;

          if (signupProvider === 'google') {
            providerPhoto = user.user_metadata?.avatar_url || null;
          } else if (signupProvider === 'facebook') {
            providerPhoto = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
          }

          console.log(`Callback: Creating new user (provider: ${signupProvider}, hasPhoto: ${!!providerPhoto})`);
          await adminSupabase.from('users').insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
            mail_verified: true,
            plan_id: 'solo',
            auth_provider: signupProvider,
            profile_photo: providerPhoto,
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          });

          // Create initial workspace using admin client to bypass RLS
          await adminSupabase.from('workspaces').insert({
            owner_id: user.id,
            business_name: 'My Workspace',
            plan_id: 'solo'
          });
        } else {
          // Determine actual current provider and check if it's OAuth
          const currentProvider = user.app_metadata?.provider || 'email';
          let storedProvider = existingUser.auth_provider;

          // Self-healing: if DB has 'email' but current auth provider is 'google' or 'facebook', correct it!
          if (storedProvider !== currentProvider && ['google', 'facebook'].includes(currentProvider)) {
            console.log(`Callback: Correcting auth_provider from ${storedProvider} to ${currentProvider} for user ${user.id}`);
            const freshPhoto = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
            
            const updatePayload: any = { auth_provider: currentProvider };
            if (!existingUser.profile_photo && freshPhoto) {
              updatePayload.profile_photo = freshPhoto;
              existingUser.profile_photo = freshPhoto;
            }

            await adminSupabase.from('users')
              .update(updatePayload)
              .eq('id', user.id);

            storedProvider = currentProvider;
            existingUser.auth_provider = currentProvider;
          }

          // Fix: Ensure standard email users' and OAuth users' verification status is updated upon successful callback landing
          const isEmailAuth = storedProvider === 'email' || currentProvider === 'email';
          const isOAuth = ['google', 'facebook'].includes(storedProvider) || ['google', 'facebook'].includes(currentProvider);
          
          if ((isEmailAuth || isOAuth) && !existingUser.mail_verified) {
            await adminSupabase.from('users')
              .update({ mail_verified: true })
              .eq('id', user.id);
          }

          // User exists — update profile_photo from OAuth ONLY if they don't already have one stored
          if (!existingUser.profile_photo && storedProvider !== 'email') {
            const freshPhoto = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
            if (freshPhoto) {
              await adminSupabase.from('users')
                .update({ profile_photo: freshPhoto })
                .eq('id', user.id);
              existingUser.profile_photo = freshPhoto;
            }
          }
        }

        // 2. Fetch workspace via Admin
        let { data: workspace } = await adminSupabase
          .from('workspaces')
          .select('id, brand_kits(id)')
          .eq('owner_id', user.id)
          .maybeSingle();

        const isFacebookAuth = user.app_metadata?.provider === 'facebook' || 
                             next.includes('provider=facebook') ||
                             user.identities?.some(id => id.provider === 'facebook');
        
        let providerToken = session?.provider_token;
        
        // Fallback: Check if session has token if not in exchangeData
        if (!providerToken) {
          const { data: sData } = await supabase.auth.getSession();
          providerToken = sData.session?.provider_token;
        }

        console.log(`Callback: isFacebookAuth=${isFacebookAuth}, providerTokenPresent=${!!providerToken}`);

        if (isFacebookAuth && providerToken && workspace) {
          try {
            const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

            // Fetch User's Personal Photo if missing
            let userProfilePhoto = null;
            try {
              const mePicRes = await fetch(`https://graph.facebook.com/v19.0/me/picture?type=large&redirect=false&access_token=${providerToken}`);
              const mePicData = await mePicRes.json();
              if (mePicData?.data?.url && !mePicData.data.is_silhouette) {
                userProfilePhoto = mePicData.data.url;
                console.log('Callback: Fetched personal Facebook photo');
              }
            } catch (picErr) {
              console.error('Callback: Error fetching personal photo:', picErr);
            }

            // Step 1: Debug the token to get granular_scopes (page IDs)
            let granularScopes: any[] = [];
            try {
              const debugRes = await fetch(`https://graph.facebook.com/debug_token?input_token=${providerToken}&access_token=${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`);
              const debugData = await debugRes.json();
              console.log('Callback: Token Debug Info:', JSON.stringify(debugData));
              granularScopes = debugData?.data?.granular_scopes || [];
            } catch (de) {
              console.error('Callback: Could not debug token:', de);
            }

            // Step 2: Try /me/accounts first
            console.log('Callback: Fetching Facebook pages via /me/accounts...');
            const fbRes = await fetch(
              `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,picture,instagram_business_account&access_token=${providerToken}`
            );
            const fbData = await fbRes.json();
            let pages = fbData?.data || [];

            // Step 3: FALLBACK — Direct page queries
            if (pages.length === 0 && granularScopes.length > 0) {
              const pageIds = new Set<string>();
              const igIds = new Set<string>();
              for (const scope of granularScopes) {
                if (['pages_show_list', 'pages_manage_posts', 'pages_read_engagement'].includes(scope.scope)) {
                  (scope.target_ids || []).forEach((id: string) => pageIds.add(id));
                }
                if (['instagram_basic', 'instagram_content_publish'].includes(scope.scope)) {
                  (scope.target_ids || []).forEach((id: string) => igIds.add(id));
                }
              }

              for (const pageId of pageIds) {
                try {
                  const pageRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=id,name,access_token,picture,instagram_business_account&access_token=${providerToken}`);
                  const pageData = await pageRes.json();
                  if (pageData && pageData.id && !pageData.error) pages.push(pageData);
                } catch (_) {}
              }
            }

            // Step 4: Process and Save Connections
            if (pages.length > 0) {
              // Use first Page photo as User photo if we still don't have one
              if (!userProfilePhoto) {
                userProfilePhoto = pages[0].picture?.data?.url || null;
                console.log('Callback: Falling back to Page photo for user profile');
              }

              for (const page of pages) {
                const pictureUrl = page.picture?.data?.url || null;
                const pageAccessToken = page.access_token || providerToken;

                const { data: existingFb } = await adminSupabase
                  .from('social_connections')
                  .select('id')
                  .eq('workspace_id', workspace.id)
                  .eq('platform', 'facebook')
                  .eq('page_id', page.id)
                  .maybeSingle();

                if (!existingFb) {
                  await adminSupabase.from('social_connections').insert({
                    workspace_id: workspace.id,
                    platform: 'facebook',
                    page_id: page.id,
                    page_name: page.name,
                    picture_url: pictureUrl,
                    access_token: pageAccessToken,
                    token_expires_at: tokenExpiresAt,
                  });
                } else {
                  await adminSupabase.from('social_connections').update({
                    page_name: page.name,
                    picture_url: pictureUrl,
                    access_token: pageAccessToken,
                    token_expires_at: tokenExpiresAt,
                    updated_at: new Date().toISOString()
                  }).eq('id', existingFb.id);
                }

                if (page.instagram_business_account) {
                  const igId = page.instagram_business_account.id;
                  let igName = `${page.name} (Instagram)`;
                  let igPic = null;
                  try {
                    const igRes = await fetch(`https://graph.facebook.com/v19.0/${igId}?fields=name,username,profile_picture_url&access_token=${pageAccessToken}`);
                    const igData = await igRes.json();
                    if (igData.username) igName = `@${igData.username}`;
                    igPic = igData.profile_picture_url || null;
                  } catch (_) {}

                  const { data: existingIg } = await adminSupabase
                    .from('social_connections')
                    .select('id')
                    .eq('workspace_id', workspace.id)
                    .eq('platform', 'instagram')
                    .eq('page_id', igId)
                    .maybeSingle();

                  if (!existingIg) {
                    await adminSupabase.from('social_connections').insert({
                      workspace_id: workspace.id,
                      platform: 'instagram',
                      page_id: igId,
                      page_name: igName,
                      picture_url: igPic,
                      access_token: pageAccessToken,
                      token_expires_at: tokenExpiresAt,
                    });
                  } else {
                    await adminSupabase.from('social_connections').update({
                      page_name: igName,
                      picture_url: igPic,
                      access_token: pageAccessToken,
                      token_expires_at: tokenExpiresAt,
                      updated_at: new Date().toISOString()
                    }).eq('id', existingIg.id);
                  }
                }
              }
            }

            // Update user's profile photo in DB if we found one
            if (userProfilePhoto) {
              await adminSupabase.from('users').update({ profile_photo: userProfilePhoto }).eq('id', user.id);
              console.log('Callback: Updated user profile photo in DB');
            }

          } catch (e) {
            console.error('Callback: Exception during Facebook fetch:', e);
          }
        }

        const isNewUser = !existingUser;
        const brandKits = workspace?.brand_kits;
        const hasBrandKit = brandKits ? (Array.isArray(brandKits) ? brandKits.length > 0 : Object.keys(brandKits).length > 0) : false;
        
        let redirectPath = next;
        
        // Social login connections handling
        if (next.includes('provider=facebook')) {
          if (next.includes('/dashboard/settings')) {
            redirectPath = '/dashboard/settings?tab=social&fb_connected=1';
          } else if (next.includes('/onboarding')) {
            redirectPath = next;
          }
        } 
        // Logic for First-time vs Returning users
        else if (isNewUser && !hasBrandKit) {
          // Only force onboarding for brand new accounts that don't have a kit
          redirectPath = '/onboarding';
        }
        // If it's a returning user (existingUser is true), we let them go to /dashboard (default)
        // even if they haven't finished onboarding yet, as per user request.
        
        console.log(`Callback: Success. Redirecting to ${redirectPath}`);
        return NextResponse.redirect(`${origin}${redirectPath}`);
      }
    } else {
      console.error('Callback: Exchange error:', exchangeError);
      return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(exchangeError?.message || 'Exchange failed')}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=Invalid link or expired session.`);
}
