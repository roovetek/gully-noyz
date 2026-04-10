import { execSync } from 'node:child_process';

const targetArg = process.argv.find((arg) => arg.startsWith('--target=')) ?? '--target=local';
const target = targetArg.split('=')[1];

const requiredClipColumns = [
  'delivery_index',
  'extra_runs',
  'is_valid_ball',
  'trim_start_ms',
  'trim_end_ms',
  'hit_timestamp_ms',
  'is_highlight',
];

function runSupabaseQuery(sql, mode) {
  const localOrLinked = mode === 'remote' ? '--linked' : '--local';
  const command = `npx supabase db query "${sql}" ${localOrLinked} --output json`;
  const raw = execSync(command, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  return JSON.parse(raw);
}

function assertLocalOrRemote(mode) {
  const clipColumns = runSupabaseQuery(
    "select column_name from information_schema.columns where table_schema='public' and table_name='clips' and column_name in ('delivery_index','extra_runs','is_valid_ball','trim_start_ms','trim_end_ms','hit_timestamp_ms','is_highlight') order by column_name;",
    mode
  );
  const columns = new Set((clipColumns.rows ?? []).map((r) => r.column_name));
  for (const col of requiredClipColumns) {
    if (!columns.has(col)) {
      throw new Error(`[${mode}] missing required clips column: ${col}`);
    }
  }

  const aiTable = runSupabaseQuery(
    "select table_name from information_schema.tables where table_schema='public' and table_name='ai_decision_logs';",
    mode
  );
  if (!aiTable.rows?.length) {
    throw new Error(`[${mode}] missing table: ai_decision_logs`);
  }
}

function checkTarget(mode) {
  try {
    assertLocalOrRemote(mode);
    console.log(`schema-sanity-check: ${mode} OK`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`schema-sanity-check: ${mode} FAILED`);
    console.error(message);
    return false;
  }
}

const modes =
  target === 'both' ? ['local', 'remote'] : target === 'remote' ? ['remote'] : ['local'];
let ok = true;
for (const mode of modes) {
  ok = checkTarget(mode) && ok;
}

if (!ok) {
  process.exit(1);
}

