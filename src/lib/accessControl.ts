import { executeTrackedAction, supabase } from './supabase';
import { MatchAccessRole } from './types';
import { validateGlobalAdminPasscode } from './globalAdmin';

export async function validateRole(
  matchId: string,
  passcode: string,
  role: MatchAccessRole
): Promise<boolean> {
  if (!role) return false;

  const { data, error } = await supabase.rpc('verify_match_role_passcode', {
    p_match_id: matchId,
    p_role: role,
    p_passcode: passcode,
  });

  if (error) {
    console.error('verify_match_role_passcode failed', error);
    return false;
  }
  return Boolean(data);
}

export async function createMatchAccess(
  matchId: string,
  umpireCode: string,
  scorerCode: string
): Promise<void> {
  const requestPayload = [
    { match_id: matchId, role: 'umpire' as const },
    { match_id: matchId, role: 'scorer' as const },
  ];

  const { data, error } = await executeTrackedAction({
    tableName: 'access_roles',
    action: 'insert',
    matchId,
    payload: requestPayload,
    execute: async (_traceId) =>
      supabase.rpc('create_match_access_roles', {
        p_match_id: matchId,
        p_umpire_passcode: umpireCode,
        p_scorer_passcode: scorerCode,
      }),
  });

  if (error) {
    throw new Error(`Failed to create match access: ${error.message}`);
  }
  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    throw new Error(result?.error || 'Failed to create match access.');
  }
}

export function hasPermission(role: MatchAccessRole | null, action: string): boolean {
  const permissions: Record<MatchAccessRole, string[]> = {
    umpire: ['view', 'score', 'override_rules', 'complete_match', 'delete_ball'],
    scorer: ['view', 'score'],
    captain: ['view'],
  };

  if (!role) return false;
  return permissions[role]?.includes(action) || false;
}

/** Dashboard (global) admin — password stored in `app_settings`, not per-match roles. */
export async function validateAdminAccess(passcode: string): Promise<boolean> {
  return validateGlobalAdminPasscode(passcode);
}
