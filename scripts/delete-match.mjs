#!/usr/bin/env node
/**
 * Delete a match (storage prefix, clips, audit_logs, matches row).
 *
 * Usage:
 *   node scripts/delete-match.mjs AB12CD
 *
 * Env (from shell or .env.local in repo root):
 *   SUPABASE_URL or VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (recommended) or VITE_SUPABASE_ANON_KEY
 *
 * Service role bypasses RLS and is appropriate for one-off admin scripts.
 * Do not commit the service role key or expose it in client code.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function loadDotEnvLocal() {
  const p = join(ROOT, '.env.local');
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const fileEnv = loadDotEnvLocal();
const env = { ...fileEnv, ...process.env };

const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

const matchIdArg = process.argv[2]?.trim().toUpperCase();

if (!matchIdArg || !/^[A-Z0-9]{6}$/.test(matchIdArg)) {
  console.error('Usage: node scripts/delete-match.mjs <MATCH_ID>');
  console.error('Example: node scripts/delete-match.mjs AB12CD');
  process.exit(1);
}

if (!url || !key) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabaseUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
const supabase = createClient(supabaseUrl, key);

const BUCKET = 'clips';
const BATCH = 500;

async function removeStorage(prefix) {
  const paths = [];
  let offset = 0;
  for (;;) {
    const { data: entries, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
    if (listError) throw new Error(`storage.list: ${listError.message}`);
    if (!entries?.length) break;
    for (const e of entries) {
      if (e?.name) paths.push(`${prefix}/${e.name}`);
    }
    if (entries.length < 1000) break;
    offset += 1000;
  }
  for (let i = 0; i < paths.length; i += BATCH) {
    const batch = paths.slice(i, i + BATCH);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) throw new Error(`storage.remove: ${error.message}`);
  }
  console.log(`Removed ${paths.length} storage object(s) under ${prefix}/`);
}

async function main() {
  console.log(`Deleting match ${matchIdArg}...`);

  await removeStorage(matchIdArg);

  const { error: e1 } = await supabase.from('clips').delete().eq('match_id', matchIdArg);
  if (e1) throw new Error(`clips.delete: ${e1.message}`);
  console.log('Deleted clip rows.');

  const { error: e2 } = await supabase.from('audit_logs').delete().eq('match_id', matchIdArg);
  if (e2) throw new Error(`audit_logs.delete: ${e2.message}`);
  console.log('Deleted audit_logs rows for match.');

  const { error: e3 } = await supabase.from('matches').delete().eq('match_id', matchIdArg);
  if (e3) throw new Error(`matches.delete: ${e3.message}`);
  console.log('Deleted match row (CASCADE cleans access_roles, overrides, match_results).');
  console.log('Done.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
