import { executeTrackedAction, supabase } from './supabase';
import { userFriendlyMessage } from './userFriendlyError';

const LEGACY_LS_KEY = 'admin_passcode_hash';

type ConfigStatus =
  | { ok: true; configured: boolean }
  | { ok: false; message: string };

async function getGlobalAdminConfigured(): Promise<ConfigStatus> {
  const { data, error } = await supabase.rpc('is_global_admin_password_configured');
  if (error) {
    console.error('is_global_admin_password_configured failed', error);
    return { ok: false, message: userFriendlyMessage(error) };
  }
  return { ok: true, configured: Boolean(data) };
}

export type ValidateGlobalAdminPasscodeResult =
  | { ok: true }
  | { ok: false; kind: 'invalid' }
  | { ok: false; kind: 'server'; message: string };

/**
 * Dashboard (global) admin login. If no hash exists yet, the first successful passcode is stored.
 * Migrates legacy localStorage `admin_passcode_hash` into `app_settings` when DB hash is null.
 */
export async function validateGlobalAdminPasscodeResult(
  passcode: string
): Promise<ValidateGlobalAdminPasscodeResult> {
  const trimmed = passcode.trim();
  if (!trimmed) {
    return { ok: false, kind: 'invalid' };
  }

  let status = await getGlobalAdminConfigured();
  if (!status.ok) {
    return { ok: false, kind: 'server', message: status.message };
  }

  if (typeof window !== 'undefined') {
    const legacy = localStorage.getItem(LEGACY_LS_KEY);
    if (legacy && !status.configured) {
      const { data: migrated, error } = await executeTrackedAction({
        tableName: 'rpc',
        action: 'migrate_legacy_dashboard_hash',
        matchId: null,
        payload: {},
        execute: () =>
          supabase.rpc('migrate_legacy_dashboard_hash', {
            p_legacy_hash: legacy,
          }),
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

  status = await getGlobalAdminConfigured();
  if (!status.ok) {
    return { ok: false, kind: 'server', message: status.message };
  }

  if (!status.configured) {
    const { data, error } = await executeTrackedAction({
      tableName: 'rpc',
      action: 'bootstrap_global_admin_passcode',
      matchId: null,
      payload: {},
      execute: () =>
        supabase.rpc('bootstrap_global_admin_passcode', {
          p_passcode: trimmed,
        }),
    });
    if (error) {
      console.error('bootstrap_global_admin_passcode failed', error);
      return { ok: false, kind: 'server', message: userFriendlyMessage(error) };
    }
    const row = data as { ok?: boolean } | null;
    const bootOk = Boolean(row?.ok);
    if (bootOk && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(LEGACY_LS_KEY);
      } catch {
        /* ignore */
      }
    }
    return bootOk ? { ok: true } : { ok: false, kind: 'invalid' };
  }

  const { data: valid, error: verifyError } = await executeTrackedAction({
    tableName: 'rpc',
    action: 'verify_global_admin_passcode',
    matchId: null,
    payload: {},
    execute: () =>
      supabase.rpc('verify_global_admin_passcode', {
        p_passcode: trimmed,
      }),
  });
  if (verifyError) {
    console.error('verify_global_admin_passcode failed', verifyError);
    return { ok: false, kind: 'server', message: userFriendlyMessage(verifyError) };
  }
  if (valid && typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LEGACY_LS_KEY);
    } catch {
      /* ignore */
    }
  }
  return Boolean(valid) ? { ok: true } : { ok: false, kind: 'invalid' };
}

export async function validateGlobalAdminPasscode(passcode: string): Promise<boolean> {
  const r = await validateGlobalAdminPasscodeResult(passcode);
  return r.ok === true;
}

export async function changeGlobalAdminPasscode(
  currentPasscode: string,
  newPasscode: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await executeTrackedAction({
    tableName: 'rpc',
    action: 'change_global_admin_passcode',
    matchId: null,
    payload: {},
    execute: () =>
      supabase.rpc('change_global_admin_passcode', {
        p_current: currentPasscode.trim(),
        p_new: newPasscode.trim(),
      }),
  });
  if (error) {
    return { ok: false, message: userFriendlyMessage(error) };
  }
  const row = data as { ok?: boolean; error?: string } | null;
  if (row?.ok) {
    return { ok: true };
  }
  return {
    ok: false,
    message: userFriendlyMessage(row?.error, { fallback: 'Failed to change password.' }),
  };
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
  const mid = input.matchId.trim().toUpperCase();
  const { data, error } = await executeTrackedAction({
    tableName: 'rpc',
    action: 'admin_reset_match_credentials',
    matchId: mid,
    payload: { match_id: mid },
    execute: () =>
      supabase.rpc('admin_reset_match_credentials', {
        p_match_id: mid,
        p_admin_passcode: input.adminPasscode.trim(),
        p_new_match_secret: input.newMatchSecret.trim(),
        p_new_umpire_passcode: input.newUmpirePasscode.trim(),
        p_new_scorer_passcode: input.newScorerPasscode.trim(),
      }),
  });
  if (error) {
    return { ok: false, message: userFriendlyMessage(error) };
  }
  const row = data as { ok?: boolean; error?: string } | null;
  if (row?.ok) {
    return { ok: true };
  }
  return {
    ok: false,
    message: userFriendlyMessage(row?.error, { fallback: 'Failed to reset match credentials.' }),
  };
}
