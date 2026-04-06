import { supabase } from './supabase';
import { isValidMatchId } from './security';

export type DeleteMatchResult =
  | { ok: true }
  | { ok: false; message: string };

type RpcDeleteResult = { ok?: boolean; error?: string };

async function cleanupMatchStorage(matchId: string): Promise<void> {
  const bucket = supabase.storage.from('clips');

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await bucket.list(matchId, { limit: 100 });

    if (error) {
      console.warn(`Storage cleanup skipped for ${matchId}: ${error.message}`);
      return;
    }

    const filePaths = (data ?? [])
      .map((entry) => entry.name)
      .filter((name): name is string => Boolean(name))
      .map((name) => `${matchId}/${name}`);

    if (filePaths.length === 0) {
      return;
    }

    const { error: removeError } = await bucket.remove(filePaths);
    if (removeError) {
      console.warn(`Storage cleanup skipped for ${matchId}: ${removeError.message}`);
      return;
    }

    if (filePaths.length < 100) {
      return;
    }
  }
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

  const { data: isValidPasscode, error: verifyError } = await supabase.rpc('verify_global_admin_passcode', {
    p_passcode: pass,
  });

  if (verifyError) {
    return { ok: false, message: verifyError.message };
  }
  if (!isValidPasscode) {
    return { ok: false, message: 'Invalid dashboard passcode.' };
  }

  await cleanupMatchStorage(trimmed);

  const { data, error } = await supabase.rpc('admin_delete_match', {
    p_match_id: trimmed,
    p_passcode: pass,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const row = data as RpcDeleteResult | null;
  if (row?.ok) {
    return { ok: true };
  }
  return { ok: false, message: row?.error || 'Failed to delete match.' };
}
