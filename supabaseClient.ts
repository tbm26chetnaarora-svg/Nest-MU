import { createClient } from '@supabase/supabase-js';

// NOTE: In a real environment, these are process.env.VITE_SUPABASE_URL
// We use placeholders here to prevent 'supabaseUrl is required' error on startup if env vars are missing.

const getEnv = (key: string) => {
  try {
    // Safely access import.meta.env
    const meta = (import.meta as any);
    return meta && meta.env ? meta.env[key] : undefined;
  } catch {
    return undefined;
  }
};

const envUrl = getEnv('VITE_SUPABASE_URL');
const envKey = getEnv('VITE_SUPABASE_ANON_KEY');

const supabaseUrl = envUrl || 'https://fyxtjivbmkjwgrrghwcn.supabase.co';
const supabaseAnonKey = envKey || 'sb_publishable_9nI863VCUQSAkS4oQ2kJQw_HMz-gwLu';

// Flag to check if we have real credentials
export const isSupabaseConfigured = supabaseUrl !== 'https://placeholder.supabase.co';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
  },
});