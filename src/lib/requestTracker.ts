import { executeTrackedAction, sanitizeAuditPayload } from './supabase';

export interface TrackUiOperationOptions<T> {
  eventType: string;
  entityName: string;
  operation: 'insert' | 'update' | 'delete' | 'upload' | 'rpc' | 'other';
  matchId?: string | null;
  userRole?: string | null;
  requestPayload: unknown;
  execute: () => Promise<T>;
}

export const sanitizePayloadForLogging = sanitizeAuditPayload;

export async function trackUiOperation<T>({
  eventType,
  entityName,
  operation,
  matchId = null,
  requestPayload,
  execute,
}: TrackUiOperationOptions<T>): Promise<T> {
  return executeTrackedAction({
    tableName: entityName,
    action: eventType || operation,
    matchId,
    payload: requestPayload,
    execute: () => execute(),
  });
}
