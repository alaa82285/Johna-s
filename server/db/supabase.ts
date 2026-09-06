import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error('Supabase is required. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.');
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function assertSupabaseConnection() {
  const { error } = await supabase.from('organizations').select('id').limit(1);
  if (error) throw error;
  return true;
}
