import { createClient } from '@supabase/supabase-js';
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function test() {
  const { data, error } = await supabase
    .from('workspaces')
    .select('id, brand_kits(id)')
    .limit(1);
    
  console.log('Data:', JSON.stringify(data, null, 2));
  if (error) console.error('Error:', error);
}

test();
