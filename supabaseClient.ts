import { createClient } from '@supabase/supabase-js';

// NOTE: In a real environment, these are process.env.VITE_SUPABASE_URL
// We use placeholders here to prevent 'supabaseUrl is required' error on startup if env vars are missing.

const getEnv = (key: string) => {
  try {
    return (import.meta as any).env?.[key];
  } catch {
    return undefined;
  }
};

const envUrl = getEnv('VITE_SUPABASE_URL');
const envKey = getEnv('VITE_SUPABASE_ANON_KEY');

const supabaseUrl = envUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = envKey || 'placeholder-key';

// Flag to check if we have real credentials
export const isSupabaseConfigured = !!envUrl && !!envKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);