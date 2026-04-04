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

// #region agent log
fetch('http://127.0.0.1:7701/ingest/321b9d3b-108d-47b3-aacd-93cd4565022b', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'caa140' },
  body: JSON.stringify({
    sessionId: 'caa140',
    runId: 'pre-fix',
    hypothesisId: 'H1',
    location: 'supabase.ts:env',
    message: 'supabase env before guard',
    data: {
      hasUrl: Boolean(supabaseUrl),
      hasKey: Boolean(supabaseAnonKey),
      urlLen: supabaseUrl ? supabaseUrl.length : 0,
      schemeAdded: schemeWasMissing,
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.\n' +
    'Get these values from your Supabase project dashboard at https://supabase.com/dashboard'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// #region agent log
fetch('http://127.0.0.1:7701/ingest/321b9d3b-108d-47b3-aacd-93cd4565022b', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'caa140' },
  body: JSON.stringify({
    sessionId: 'caa140',
    runId: 'post-fix',
    hypothesisId: 'H1',
    location: 'supabase.ts:afterCreateClient',
    message: 'createClient completed',
    data: { ok: true },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

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
