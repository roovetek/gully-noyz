import { supabase } from './supabase';
import { isValidMatchId } from './security';

const CLIPS_BUCKET = 'clips';
const REMOVE_BATCH = 500;

export type DeleteMatchResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Permanently removes a match: storage objects under matchId/, clip rows,
 * audit_logs rows, then the match row (CASCADE removes access_roles, overrides, match_results).
 */
export async function deleteMatch(matchId: string): Promise<DeleteMatchResult> {
  const trimmed = matchId.trim();
  if (!isValidMatchId(trimmed)) {
    return { ok: false, message: 'Invalid match ID format.' };
  }

  const storageResult = await removeClipStorageForMatch(trimmed);
  if (!storageResult.ok) {
    return storageResult;
  }

  const { error: clipsError } = await supabase.from('clips').delete().eq('match_id', trimmed);
  if (clipsError) {
    return { ok: false, message: `Failed to delete clips: ${clipsError.message}` };
  }

  const { error: auditError } = await supabase.from('audit_logs').delete().eq('match_id', trimmed);
  if (auditError) {
    return { ok: false, message: `Failed to delete audit logs: ${auditError.message}` };
  }

  const { error: matchError } = await supabase.from('matches').delete().eq('match_id', trimmed);
  if (matchError) {
    return { ok: false, message: `Failed to delete match: ${matchError.message}` };
  }

  return { ok: true };
}

async function removeClipStorageForMatch(matchId: string): Promise<DeleteMatchResult> {
  const paths: string[] = [];
  let offset = 0;

  for (;;) {
    const { data: entries, error: listError } = await supabase.storage
      .from(CLIPS_BUCKET)
      .list(matchId, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });

    if (listError) {
      return { ok: false, message: `Failed to list storage files: ${listError.message}` };
    }

    if (!entries?.length) {
      break;
    }

    for (const entry of entries) {
      if (!entry?.name) continue;
      paths.push(`${matchId}/${entry.name}`);
    }

    if (entries.length < 1000) {
      break;
    }
    offset += 1000;
  }

  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const batch = paths.slice(i, i + REMOVE_BATCH);
    const { error: removeError } = await supabase.storage.from(CLIPS_BUCKET).remove(batch);
    if (removeError) {
      return { ok: false, message: `Failed to remove storage files: ${removeError.message}` };
    }
  }

  return { ok: true };
}
