import { supabase } from './supabase';
import { hashSecret } from './security';
import { UserRole } from './types';

export async function validateRole(
  matchId: string,
  passcode: string,
  role: UserRole
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
  scorerCode: string,
  adminCode?: string
): Promise<void> {
  const roles = [
    { match_id: matchId, role: 'umpire', passcode_hash: await hashSecret(umpireCode) },
    { match_id: matchId, role: 'scorer', passcode_hash: await hashSecret(scorerCode) },
  ];

  if (adminCode) {
    roles.push({ match_id: matchId, role: 'admin', passcode_hash: await hashSecret(adminCode) });
  }

  const { error } = await supabase
    .from('access_roles')
    .insert(roles);

  if (error) {
    throw new Error(`Failed to create match access: ${error.message}`);
  }
}

export function hasPermission(role: UserRole, action: string): boolean {
  const permissions: Record<string, string[]> = {
    admin: ['view', 'score', 'override_rules', 'complete_match', 'edit_global_rules', 'create_match'],
    umpire: ['view', 'override_rules', 'complete_match', 'delete_ball'],
    scorer: ['view', 'score'],
    captain: ['view'],
  };

  if (!role) return false;
  return permissions[role]?.includes(action) || false;
}

export async function validateAdminAccess(passcode: string): Promise<boolean> {
  const adminHash = await hashSecret(passcode);
  const storedHash = localStorage.getItem('admin_passcode_hash');

  if (!storedHash) {
    localStorage.setItem('admin_passcode_hash', adminHash);
    return true;
  }

  return adminHash === storedHash;
}
