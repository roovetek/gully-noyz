import { createClient } from '@supabase/supabase-js';

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
export const isAuditLoggingEnabled = String(rawAuditLoggingEnabled ?? 'false').trim().toLowerCase() === 'true';

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

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return String(error);
}

function getResultStatusCode(result: unknown): 'success' | 'error' {
  if (result && typeof result === 'object' && 'error' in result && (result as { error?: unknown }).error) {
    return 'error';
  }

  return 'success';
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
    return `[Function ${(value as Function).name || 'anonymous'}]`;
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
    await supabase.from('audit_logs').insert({
      trace_id: traceId,
      match_id: matchId,
      endpoint_name: `${tableName}.${action}`,
      request_payload: sanitizeAuditPayload(payload),
      response_body: { status: 'pending' },
      status_code: 'pending',
    });
  } catch (auditInsertError) {
    console.error('[AUDIT]: Failed to write pending audit log', auditInsertError);
  }

  try {
    const result = await execute(traceId);
    const statusCode = getResultStatusCode(result);

    try {
      await supabase
        .from('audit_logs')
        .update({
          response_body: sanitizeAuditPayload(result),
          status_code: statusCode,
        })
        .eq('trace_id', traceId);
    } catch (auditUpdateError) {
      console.error('[AUDIT]: Failed to update audit log', auditUpdateError);
    }

    return result;
  } catch (error) {
    try {
      await supabase
        .from('audit_logs')
        .update({
          response_body: toSerializableError(error),
          status_code: 'error',
        })
        .eq('trace_id', traceId);
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
  outcome: string;
  dismissal_type: string | null;
  video_url: string | null;
  duration: number;
  created_at: string;
}
