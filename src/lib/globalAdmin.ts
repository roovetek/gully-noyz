import { supabase } from './supabase';

const LEGACY_LS_KEY = 'admin_passcode_hash';

async function rpcConfigured(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_global_admin_password_configured');
  if (error) {
    console.error('is_global_admin_password_configured failed', error);
    return false;
  }
  return Boolean(data);
}

/**
 * Dashboard (global) admin login. If no hash exists yet, the first successful passcode is stored.
 * Migrates legacy localStorage `admin_passcode_hash` into `app_settings` when DB hash is null.
 */
export async function validateGlobalAdminPasscode(passcode: string): Promise<boolean> {
  const trimmed = passcode.trim();
  if (!trimmed) return false;

  if (typeof window !== 'undefined') {
    const legacy = localStorage.getItem(LEGACY_LS_KEY);
    if (legacy && !(await rpcConfigured())) {
      const { data: migrated, error } = await supabase.rpc('migrate_legacy_dashboard_hash', {
        p_legacy_hash: legacy,
      });
      if (!error && migrated) {
        try {
          localStorage.removeItem(LEGACY_LS_KEY);
        } catch {
          /* ignore */
        }
      }
    }
  }

  const configured = await rpcConfigured();

  if (!configured) {
    const { data, error } = await supabase.rpc('bootstrap_global_admin_passcode', {
      p_passcode: trimmed,
    });
    if (error) {
      console.error('bootstrap_global_admin_passcode failed', error);
      return false;
    }
    const row = data as { ok?: boolean } | null;
    const ok = Boolean(row?.ok);
    if (ok && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(LEGACY_LS_KEY);
      } catch {
        /* ignore */
      }
    }
    return ok;
  }

  const { data: valid, error: verifyError } = await supabase.rpc('verify_global_admin_passcode', {
    p_passcode: trimmed,
  });
  if (verifyError) {
    console.error('verify_global_admin_passcode failed', verifyError);
    return false;
  }
  if (valid && typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LEGACY_LS_KEY);
    } catch {
      /* ignore */
    }
  }
  return Boolean(valid);
}

export async function changeGlobalAdminPasscode(
  currentPasscode: string,
  newPasscode: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('change_global_admin_passcode', {
    p_current: currentPasscode.trim(),
    p_new: newPasscode.trim(),
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  const row = data as { ok?: boolean; error?: string } | null;
  if (row?.ok) {
    return { ok: true };
  }
  return { ok: false, message: row?.error || 'Failed to change password.' };
}

export interface ResetMatchCredentialsInput {
  matchId: string;
  adminPasscode: string;
  newMatchSecret: string;
  newUmpirePasscode: string;
  newScorerPasscode: string;
}

export async function resetMatchCredentials(
  input: ResetMatchCredentialsInput
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('admin_reset_match_credentials', {
    p_match_id: input.matchId.trim().toUpperCase(),
    p_admin_passcode: input.adminPasscode.trim(),
    p_new_match_secret: input.newMatchSecret.trim(),
    p_new_umpire_passcode: input.newUmpirePasscode.trim(),
    p_new_scorer_passcode: input.newScorerPasscode.trim(),
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  const row = data as { ok?: boolean; error?: string } | null;
  if (row?.ok) {
    return { ok: true };
  }
  return { ok: false, message: row?.error || 'Failed to reset match credentials.' };
}
