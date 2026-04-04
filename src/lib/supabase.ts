import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const trimmedUrl = (typeof rawUrl === 'string' ? rawUrl : '').trim();
const supabaseAnonKey = (typeof rawKey === 'string' ? rawKey : '').trim();
const schemeWasMissing = Boolean(trimmedUrl && !/^https?:\/\//i.test(trimmedUrl));

let supabaseUrl = trimmedUrl;
// Supabase client requires http(s):// — host-only values from .env would otherwise throw at import time.
if (schemeWasMissing) {
  supabaseUrl = `https://${trimmedUrl}`;
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.\n' +
    'Get these values from your Supabase project dashboard at https://supabase.com/dashboard'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Clip {
  id: string;
  match_id: string;
  innings_number: number;
  over_number: number;
  ball_number: number;
  outcome: string;
  video_url: string;
  duration: number;
  created_at: string;
}
