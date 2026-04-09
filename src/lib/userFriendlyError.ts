/**
 * Maps Supabase/Postgres/network errors to stable user-facing copy.
 * Raw errors should still be logged (logger) and stored in audit logs (executeTrackedAction).
 */

export type UserFriendlyContext = {
  /** Shown when the error cannot be classified */
  fallback?: string;
};

const DEFAULT_FALLBACK = 'Something went wrong. Please try again.';

function looksTechnicalMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('relation ') ||
    m.includes('violates') ||
    m.includes('syntax error') ||
    m.includes('column ') ||
    m.includes('duplicate key value') ||
    m.includes('foreign key constraint') ||
    m.includes('stack') ||
    m.includes('postgrest') ||
    m.includes('pgrst')
  );
}

function extractMessage(error: unknown): string {
  if (error == null) return '';
  if (typeof error === 'string') return error.trim();
  if (error instanceof Error) return error.message.trim();
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string') return msg.trim();
  }
  return '';
}

function extractCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const c = (error as { code?: unknown }).code;
    if (typeof c === 'string' && c.length > 0) return c;
  }
  return undefined;
}

/**
 * Returns a safe message for toasts and inline UI. Logs should use the raw error separately.
 */
export function userFriendlyMessage(error: unknown, context?: UserFriendlyContext): string {
  const fallback = context?.fallback ?? DEFAULT_FALLBACK;
  const message = extractMessage(error);
  const code = extractCode(error);

  if (!message && !code) {
    return fallback;
  }

  const m = message;
  const lower = m.toLowerCase();

  // Likely intentional RPC / app messages (keep if not technical)
  if (m.length > 0 && m.length < 120 && !looksTechnicalMessage(m)) {
    if (
      /invalid|incorrect|required|must be|not found|permission|unauthorized|forbidden|try again/i.test(
        m
      ) &&
      !/\b(select|insert|update|delete|from|where)\b/i.test(lower)
    ) {
      return m;
    }
  }

  if (code === '23505' || lower.includes('duplicate key')) {
    return 'This record already exists. Refresh the page or try again.';
  }
  if (code === '23503' || lower.includes('foreign key')) {
    return 'This action could not be completed because something it depends on is missing.';
  }
  if (
    code === '42501' ||
    lower.includes('permission denied') ||
    lower.includes('row-level security') ||
    lower.includes('rls')
  ) {
    return 'You do not have permission to do this. Check your role or match access.';
  }
  if (code === 'PGRST116' || (lower.includes('no rows') && lower.includes('returned'))) {
    return 'No matching record was found. It may have been removed.';
  }
  if (
    code === 'PGRST301' ||
    lower.includes('jwt') ||
    lower.includes('token') && (lower.includes('expired') || lower.includes('invalid'))
  ) {
    return 'Your session may have expired. Refresh the page and try again.';
  }
  if (lower.includes('not authorized') || lower.includes('unauthorized')) {
    return 'You do not have permission to perform this action.';
  }
  if (lower.includes('bucket') && lower.includes('not found')) {
    return 'File storage is not configured correctly. Please contact support.';
  }

  if (
    lower.includes('fetch failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('econnrefused') ||
    lower.includes('load failed') ||
    lower.includes('connection')
  ) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  if (lower.includes('timeout')) {
    return 'The request took too long. Please try again.';
  }

  return fallback;
}
