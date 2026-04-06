import { executeTrackedAction, supabase } from './supabase';
import { hashSecret } from './security';
import { MatchAccessRole } from './types';
import { validateGlobalAdminPasscode } from './globalAdmin';

export async function validateRole(
  matchId: string,
  passcode: string,
  role: MatchAccessRole
): Promise<boolean> {
  if (!role) return false;

  const hashedPasscode = await hashSecret(passcode);

  const { data, error } = await supabase
    .from('access_roles')
    .select('*')
    .eq('match_id', matchId)
    .eq('role', role)
    .maybeSingle();

  if (error || !data) return false;

  return data.passcode_hash === hashedPasscode;
}

export async function createMatchAccess(
  matchId: string,
  umpireCode: string,
  scorerCode: string
): Promise<void> {
  const roles = [
    { match_id: matchId, role: 'umpire' as const, passcode_hash: await hashSecret(umpireCode) },
    { match_id: matchId, role: 'scorer' as const, passcode_hash: await hashSecret(scorerCode) },
  ];

  const requestPayload = roles.map(({ match_id, role }) => ({ match_id, role }));

  const { error } = await executeTrackedAction({
    tableName: 'access_roles',
    action: 'insert',
    matchId,
    payload: requestPayload,
    execute: async (_traceId) =>
      supabase
        .from('access_roles')
        .insert(roles)
        .select('id, match_id, role, created_at'),
  });

  if (error) {
    throw new Error(`Failed to create match access: ${error.message}`);
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
