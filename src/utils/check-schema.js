const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vifpopdwdihchwxccadx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZnBvcGR3ZGloY2h3eGNjYWR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY2MzI2MywiZXhwIjoyMDkyMjM5MjYzfQ.ITlkD8dOgBBRj1nGuK9JzfjELUxouZyqk9TEOOnd5LU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  try {
    const { data, error } = await supabase.from('posts').select('*').limit(1);
    if (error) throw error;
    if (data && data.length > 0) {
      console.log("SCHEMA_COLUMNS:", Object.keys(data[0]));
      console.log("SAMPLE_ROW:", data[0]);
    } else {
      console.log("No rows found in posts table.");
    }
  } catch (err) {
    console.error("Error fetching schema:", err.message);
  }
}

checkSchema();
