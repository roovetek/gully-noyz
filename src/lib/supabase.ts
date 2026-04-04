import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
