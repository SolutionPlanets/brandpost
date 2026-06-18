import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export default async function TestDBPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Attempt to fetch something from the 'users' table
  const { data: users, error } = await supabase.from('users').select('*').limit(1);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Supabase Connection Test</h1>
      {error ? (
        <div style={{ color: 'red', marginTop: '1rem' }}>
          <h3>❌ Connection Failed</h3>
          <p>{error.message}</p>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      ) : (
        <div style={{ color: 'green', marginTop: '1rem' }}>
          <h3>✅ Connection Successful</h3>
          <p>Successfully reached Supabase!</p>
          <p>Rows found in 'users' table: {users?.length || 0}</p>
        </div>
      )}
      <div style={{ marginTop: '2rem' }}>
        <p><strong>Configured URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
      </div>
    </div>
  );
}
