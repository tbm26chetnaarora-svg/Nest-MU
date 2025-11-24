import { createClient } from '@supabase/supabase-js';

// NOTE: In a real environment, these are process.env.VITE_SUPABASE_URL
// For this generated code to work 'out of the box' with a user's own project, 
// they must set these env vars. 
// We use placeholders here to prevent 'supabaseUrl is required' error on startup if env vars are missing.
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);