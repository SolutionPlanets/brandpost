
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPostColumns() {
  const { data, error } = await supabase.from('posts').select('*').limit(1);
  if (error) {
    console.log('Error:', error.message);
  } else if (data && data.length > 0) {
    console.log('Post columns:', Object.keys(data[0]));
  } else {
      console.log('Post table is empty, cannot check columns directly.');
  }
}

checkPostColumns();
