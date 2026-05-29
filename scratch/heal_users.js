const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local!');
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function healUsers() {
  console.log('--- STARTING OAUTH USER HEALING PROCESS ---');
  
  // 1. Get all users from Supabase Auth service
  const { data: { users }, error: listError } = await adminSupabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing auth users:', listError);
    return;
  }
  
  console.log(`Found ${users.length} user records in Supabase Auth.`);
  
  for (const authUser of users) {
    const email = authUser.email;
    const uid = authUser.id;
    const provider = authUser.app_metadata?.provider || 'email';
    
    console.log(`\nProcessing user: ${email} (${uid}) | Auth Provider from Identity: ${provider}`);
    
    // Get corresponding record from public.users
    const { data: dbUser, error: dbError } = await adminSupabase
      .from('users')
      .select('id, auth_provider, profile_photo')
      .eq('id', uid)
      .maybeSingle();
      
    if (dbError) {
      console.error(`Error querying DB for user ${email}:`, dbError);
      continue;
    }
    
    if (!dbUser) {
      console.log(`Warning: User ${email} exists in auth.users but has NO record in public.users. Creating one...`);
      const isVerified = ['google', 'facebook'].includes(provider);
      const freshPhoto = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null;
      
      const { error: insertError } = await adminSupabase.from('users').insert({
        id: uid,
        email: email,
        full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'User',
        mail_verified: isVerified,
        plan_id: 'solo',
        auth_provider: provider,
        profile_photo: freshPhoto,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      });
      
      if (insertError) {
        console.error(`Error creating public user row for ${email}:`, insertError);
      } else {
        console.log(`Successfully created public user record for ${email} with provider ${provider}`);
      }
      continue;
    }
    
    // Check if there's an out-of-sync provider or profile photo
    const dbProvider = dbUser.auth_provider;
    const dbPhoto = dbUser.profile_photo;
    const freshPhoto = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null;
    
    const needsProviderFix = dbProvider !== provider && ['google', 'facebook'].includes(provider);
    const needsPhotoFix = !dbPhoto && freshPhoto && provider !== 'email';
    
    if (needsProviderFix || needsPhotoFix) {
      const updates = {};
      if (needsProviderFix) {
        updates.auth_provider = provider;
        console.log(`  -> Correcting auth_provider in DB: '${dbProvider}' -> '${provider}'`);
      }
      if (needsPhotoFix) {
        updates.profile_photo = freshPhoto;
        console.log(`  -> Synchronizing profile_photo URL: ${freshPhoto}`);
      }
      
      const { error: updateError } = await adminSupabase
        .from('users')
        .update(updates)
        .eq('id', uid);
        
      if (updateError) {
        console.error(`Error updating DB for user ${email}:`, updateError);
      } else {
        console.log(`Successfully healed DB record for user ${email}!`);
      }
    } else {
      console.log(`  -> DB record is already correct. (Provider: ${dbProvider}, Photo: ${dbPhoto ? 'Present' : 'None'})`);
    }
  }
  
  console.log('\n--- HEALING PROCESS COMPLETED ---');
}

healUsers();
