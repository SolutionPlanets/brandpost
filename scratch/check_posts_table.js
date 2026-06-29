
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTable() {
  const { data, error } = await supabase.from('posts').select('*').limit(1);
  if (error) {
    console.log('Posts table error:', error.message);
  } else {
    console.log('Posts table exists:', data);
  }
}

checkTable();
