import { supabase } from './supabase';
import { isValidMatchId } from './security';

export type DeleteMatchResult =
  | { ok: true }
  | { ok: false; message: string };

type RpcDeleteResult = { ok?: boolean; error?: string };

/**
 * Permanently removes a match (storage, clips, audit_logs, match + cascaded rows).
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
