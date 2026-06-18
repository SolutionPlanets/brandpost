
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkWorkspaceColumns() {
  const { data, error } = await supabase.from('workspaces').select('*').limit(1);
  if (error) {
    console.log('Error:', error.message);
  } else if (data && data.length > 0) {
    console.log('Workspace columns:', Object.keys(data[0]));
    console.log('Sample workspace:', data[0]);
  } else {
      console.log('Workspace table is empty, cannot check columns directly.');
  }
}

checkWorkspaceColumns();
