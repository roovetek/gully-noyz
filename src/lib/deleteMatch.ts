import { executeTrackedAction, supabase } from './supabase';
import { isValidMatchId } from './security';

export type DeleteMatchResult =
  | { ok: true }
  | { ok: false; message: string };

type RpcDeleteResult = { ok?: boolean; error?: string };

type CleanupOutcome = 'no_objects' | 'removed' | 'list_error' | 'remove_error';

function deleteMatchErrorHint(message: string): string {
  const m = message.toLowerCase();
  const looksLikeDirectStorageSql =
    m.includes('storage.objects') ||
    (m.includes('storage') && m.includes('api')) ||
    m.includes('use the storage') ||
    (m.includes('permission denied') && m.includes('object'));
  if (looksLikeDirectStorageSql) {
    return `${message} Apply pending Supabase migrations (e.g. 20260408120000 or 20260409140000: admin_delete_match without deleting storage.objects).`;
  }
  return message;
}

async function cleanupMatchStorage(matchId: string): Promise<CleanupOutcome> {
  const bucket = supabase.storage.from('clips');

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await bucket.list(matchId, { limit: 100 });

    if (error) {
      console.warn(`Storage cleanup skipped for ${matchId}: ${error.message}`);
      return 'list_error';
    }

    const filePaths = (data ?? [])
      .map((entry) => entry.name)
      .filter((name): name is string => Boolean(name))
      .map((name) => `${matchId}/${name}`);

    if (filePaths.length === 0) {
      return 'no_objects';
    }

    const { error: removeError } = await bucket.remove(filePaths);
    if (removeError) {
      console.warn(`Storage cleanup skipped for ${matchId}: ${removeError.message}`);
      return 'remove_error';
    }

    if (filePaths.length < 100) {
      return 'removed';
    }
  }
  return 'removed';
}

/**
 * Permanently removes a match and attempts best-effort clip storage cleanup first.
 * Requires dashboard passcode; enforced server-side via admin_delete_match RPC.
 */
export async function deleteMatch(matchId: string, adminPasscode: string): Promise<DeleteMatchResult> {
  const trimmed = matchId.trim();
  if (!isValidMatchId(trimmed)) {
    return { ok: false, message: 'Invalid match ID format.' };
  }
  const pass = adminPasscode.trim();
  if (!pass) {
    return { ok: false, message: 'Dashboard passcode is required.' };
  }

  const verifyResult = await executeTrackedAction({
    tableName: 'rpc',
    action: 'verify_global_admin_passcode',
    matchId: null,
    payload: {},
    execute: () =>
      supabase.rpc('verify_global_admin_passcode', {
        p_passcode: pass,
      }),
  });

  const { data: isValidPasscode, error: verifyError } = verifyResult;
  if (verifyError) {
    return { ok: false, message: verifyError.message };
  }
  if (!isValidPasscode) {
    return { ok: false, message: 'Invalid dashboard passcode.' };
  }

  await executeTrackedAction({
    tableName: 'storage.clips',
    action: 'remove_match_objects',
    matchId: trimmed,
    payload: { prefix: trimmed },
    execute: async () => {
      await cleanupMatchStorage(trimmed);
      return { error: null };
    },
  });

  const { data, error } = await executeTrackedAction({
    tableName: 'rpc',
    action: 'admin_delete_match',
    matchId: trimmed,
    payload: { match_id: trimmed },
    execute: () =>
      supabase.rpc('admin_delete_match', {
        p_match_id: trimmed,
        p_passcode: pass,
      }),
  });

  if (error) {
    return { ok: false, message: deleteMatchErrorHint(error.message) };
  }

  const row = data as RpcDeleteResult | null;
  if (row?.ok) {
    return { ok: true };
  }
  return {
    ok: false,
    message: deleteMatchErrorHint(row?.error || 'Failed to delete match.'),
  };
}
