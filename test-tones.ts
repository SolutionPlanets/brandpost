import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

async function testTones() {
  const tones = ['Professional', 'professional', 'Casual', 'casual', 'Friendly', 'friendly', 'Bold', 'bold', 'Playful', 'playful', 'Authoritative', 'authoritative', 'Innovative', 'innovative', 'Conversational', 'conversational', 'Enthusiastic', 'enthusiastic'];
  
  const { data: workspace } = await supabase.from('workspaces').select('id').limit(1).single();
  if(!workspace) return console.log("No workspaces");

  for (const tone of tones) {
    const payload = {
        workspace_id: workspace.id,
        brand_kit_name: 'Test',
        tone: tone
    };
    
    console.log(`Testing tone: ${tone}`);
    const { error: err1 } = await supabase.from('brand_kits').insert(payload);
    
    if (err1) {
       console.error(`Failed ${tone}: ${err1.message}`);
    } else {
       console.log(`Success ${tone}`);
    }
  }
}

testTones();
