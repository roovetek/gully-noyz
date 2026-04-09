import { executeTrackedAction, supabase } from './supabase';
import { MatchAccessRole } from './types';
import { validateGlobalAdminPasscode } from './globalAdmin';
import { logger } from './logger';
import { userFriendlyMessage } from './userFriendlyError';

export async function validateRole(
  matchId: string,
  passcode: string,
  role: MatchAccessRole
): Promise<boolean> {
  if (!role) return false;

  const { data, error } = await executeTrackedAction({
    tableName: 'rpc',
    action: 'verify_match_role_passcode',
    matchId,
    payload: { role },
    execute: () =>
      supabase.rpc('verify_match_role_passcode', {
        p_match_id: matchId,
        p_role: role,
        p_passcode: passcode,
      }),
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
  scorerCode?: string
): Promise<void> {
  const scorerPasscode = (scorerCode && scorerCode.trim().length >= 4)
    ? scorerCode
    : `scorer-${Math.random().toString(36).slice(2, 10)}`;

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
        p_scorer_passcode: scorerPasscode,
      }),
  });

  if (error) {
    logger.error('create_match_access RPC failed', error);
    throw new Error(
      userFriendlyMessage(error, { fallback: 'Could not set up match access. Please try again.' })
    );
  }
  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    logger.error('create_match_access rejected', result);
    throw new Error(
      userFriendlyMessage(typeof result?.error === 'string' ? result.error : result, {
        fallback: 'Could not set up match access. Please try again.',
      })
    );
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
