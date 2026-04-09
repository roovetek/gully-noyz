import { createClient } from '@supabase/supabase-js';
import { userFriendlyMessage } from './userFriendlyError';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const rawAuditLoggingEnabled = import.meta.env.VITE_ENABLE_AUDIT_LOGGING;

const trimmedUrl = (typeof rawUrl === 'string' ? rawUrl : '').trim();
const supabaseAnonKey = (typeof rawKey === 'string' ? rawKey : '').trim();
const schemeWasMissing = Boolean(trimmedUrl && !/^https?:\/\//i.test(trimmedUrl));

let supabaseUrl = trimmedUrl;
// Supabase client requires http(s):// — host-only values from .env would otherwise throw at import time.
if (schemeWasMissing) {
  supabaseUrl = `https://${trimmedUrl}`;
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.\n' +
    'Get these values from your Supabase project dashboard at https://supabase.com/dashboard'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
/** Default on; set `VITE_ENABLE_AUDIT_LOGGING=false` to disable. */
export const isAuditLoggingEnabled =
  String(rawAuditLoggingEnabled ?? 'true').trim().toLowerCase() === 'true';

const SENSITIVE_KEY_PATTERN = /(secret|passcode|password|token|authorization|api[_-]?key|hash)/i;
const MAX_SANITIZE_DEPTH = 6;

export interface ExecuteTrackedActionOptions<T> {
  tableName: string;
  action: string;
  payload: unknown;
  matchId?: string | null;
  execute: (traceId: string) => Promise<T>;
}

function createTraceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toSerializableError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (error && typeof error === 'object') {
    return sanitizeAuditPayload(error) as Record<string, unknown>;
  }

  return {
    message: String(error),
  };
}

function getResultStatusCode(result: unknown): 'success' | 'error' {
  if (!result || typeof result !== 'object') {
    return 'success';
  }

  const r = result as { error?: unknown; data?: unknown };
  if (r.error) {
    return 'error';
  }

  const data = r.data;
  if (data && typeof data === 'object' && 'ok' in data && (data as { ok?: boolean }).ok === false) {
    return 'error';
  }

  return 'success';
}

function auditResponseBody(result: unknown, statusCode: 'success' | 'error' | 'pending'): unknown {
  const base = sanitizeAuditPayload(result);
  if (statusCode !== 'error' || !result || typeof result !== 'object') {
    return base;
  }
  const r = result as { error?: unknown; data?: unknown };
  let friendlySource: unknown = r.error;
  if (
    (friendlySource === undefined || friendlySource === null) &&
    r.data &&
    typeof r.data === 'object' &&
    r.data !== null
  ) {
    const d = r.data as { error?: unknown; ok?: boolean };
    if (d.ok === false && d.error !== undefined && d.error !== null) {
      friendlySource = d.error;
    }
  }
  if (friendlySource === undefined || friendlySource === null) {
    return base;
  }
  const friendly = userFriendlyMessage(
    typeof friendlySource === 'string' ? { message: friendlySource } : friendlySource
  );
  if (typeof base === 'object' && base !== null && !Array.isArray(base)) {
    return {
      ...(base as Record<string, unknown>),
      user_friendly_message: friendly,
    };
  }
  return {
    raw: base,
    user_friendly_message: friendly,
  };
}

function auditThrownErrorBody(error: unknown): Record<string, unknown> {
  return {
    ...toSerializableError(error),
    user_friendly_message: userFriendlyMessage(error),
  };
}

export function sanitizeAuditPayload(value: unknown, depth = 0): unknown {
  if (depth > MAX_SANITIZE_DEPTH) {
    return '[MAX_DEPTH_EXCEEDED]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return {
      __type: 'Blob',
      size: value.size,
      contentType: value.type || 'application/octet-stream',
    };
  }

  if (value instanceof Error) {
    return toSerializableError(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditPayload(item, depth + 1));
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};

    Object.entries(value as Record<string, unknown>).forEach(([key, entryValue]) => {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        sanitized[key] = '[REDACTED]';
        return;
      }

      sanitized[key] = sanitizeAuditPayload(entryValue, depth + 1);
    });

    return sanitized;
  }

  if (typeof value === 'function') {
    const fnName = (value as { name?: string }).name || 'anonymous';
    return `[Function ${fnName}]`;
  }

  return value;
}

export async function executeTrackedAction<T>({
  tableName,
  action,
  payload,
  matchId = null,
  execute,
}: ExecuteTrackedActionOptions<T>): Promise<T> {
  const traceId = createTraceId();

  if (!isAuditLoggingEnabled) {
    return execute(traceId);
  }

  try {
    await supabase.rpc('audit_log_create', {
      p_trace_id: traceId,
      p_match_id: matchId,
      p_endpoint_name: `${tableName}.${action}`,
      p_request_payload: sanitizeAuditPayload(payload),
      p_response_body: { status: 'pending' },
      p_status_code: 'pending',
    });
  } catch (auditInsertError) {
    console.error('[AUDIT]: Failed to write pending audit log', auditInsertError);
  }

  try {
    const result = await execute(traceId);
    const statusCode = getResultStatusCode(result);

    try {
      await supabase.rpc('audit_log_update', {
        p_trace_id: traceId,
        p_response_body: auditResponseBody(result, statusCode),
        p_status_code: statusCode,
      });
    } catch (auditUpdateError) {
      console.error('[AUDIT]: Failed to update audit log', auditUpdateError);
    }

    return result;
  } catch (error) {
    try {
      await supabase.rpc('audit_log_update', {
        p_trace_id: traceId,
        p_response_body: auditThrownErrorBody(error),
        p_status_code: 'error',
      });
    } catch (auditUpdateError) {
      console.error('[AUDIT]: Failed to update audit log after error', auditUpdateError);
    }

    throw error;
  }
}

export interface Clip {
  id: string;
  match_id: string;
  innings_number: number;
  over_number: number;
  ball_number: number;
  delivery_index?: number;
  outcome: string;
  dismissal_type: string | null;
  extra_runs?: number;
  is_valid_ball?: boolean;
  video_url: string | null;
  duration: number;
  trim_start_ms?: number | null;
  trim_end_ms?: number | null;
  hit_timestamp_ms?: number | null;
  is_highlight?: boolean | null;
  created_at: string;
}
