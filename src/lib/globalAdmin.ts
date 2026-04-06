import { supabase } from './supabase';
import { hashSecret } from './security';

const SETTINGS_ROW_ID = 1;
const LEGACY_LS_KEY = 'admin_passcode_hash';

export interface AppSettingsRow {
  id: number;
  global_admin_passcode_hash: string | null;
  updated_at: string | null;
}

async function fetchSettingsRow(): Promise<AppSettingsRow | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('id, global_admin_passcode_hash, updated_at')
    .eq('id', SETTINGS_ROW_ID)
    .maybeSingle();

  if (error) {
    console.error('app_settings fetch failed', error);
    return null;
  }
  return data as AppSettingsRow | null;
}

/**
 * One-time: copy legacy browser hash into app_settings so existing installs keep the same password.
 */
async function migrateLegacyLocalStorageHash(storedHash: string | null): Promise<void> {
  if (!storedHash || typeof window === 'undefined') return;
  const { error } = await supabase.from('app_settings').upsert(
    {
      id: SETTINGS_ROW_ID,
      global_admin_passcode_hash: storedHash,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (!error) {
    try {
      localStorage.removeItem(LEGACY_LS_KEY);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Dashboard (global) admin login. If no hash exists yet, the first successful passcode is stored.
 * Migrates legacy localStorage `admin_passcode_hash` into `app_settings` when DB hash is null.
 */
export async function validateGlobalAdminPasscode(passcode: string): Promise<boolean> {
  const trimmed = passcode.trim();
  if (!trimmed) return false;

  const inputHash = await hashSecret(trimmed);
  let row = await fetchSettingsRow();

  if (!row?.global_admin_passcode_hash && typeof window !== 'undefined') {
    const legacy = localStorage.getItem(LEGACY_LS_KEY);
    if (legacy) {
      await migrateLegacyLocalStorageHash(legacy);
      row = await fetchSettingsRow();
    }
  }

  const stored = row?.global_admin_passcode_hash ?? null;

  if (!stored) {
    const { error } = await supabase.from('app_settings').upsert(
      {
        id: SETTINGS_ROW_ID,
        global_admin_passcode_hash: inputHash,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (!error && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(LEGACY_LS_KEY);
      } catch {
        /* ignore */
      }
    }
    return !error;
  }

  if (inputHash !== stored) return false;

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LEGACY_LS_KEY);
    } catch {
      /* ignore */
    }
  }
  return true;
}

export async function changeGlobalAdminPasscode(
  currentPasscode: string,
  newPasscode: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const newTrim = newPasscode.trim();
  if (newTrim.length < 4) {
    return { ok: false, message: 'New password must be at least 4 characters.' };
  }

  const row = await fetchSettingsRow();
  const stored = row?.global_admin_passcode_hash ?? null;
  if (!stored) {
    return {
      ok: false,
      message: 'No dashboard password is set yet. Sign in once to create it.',
    };
  }

  const currentHash = await hashSecret(currentPasscode.trim());
  if (currentHash !== stored) {
    return { ok: false, message: 'Current password is incorrect.' };
  }

  const nextHash = await hashSecret(newTrim);
  const { error } = await supabase
    .from('app_settings')
    .update({
      global_admin_passcode_hash: nextHash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', SETTINGS_ROW_ID);

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
