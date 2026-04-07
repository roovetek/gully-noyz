import { beforeEach, describe, expect, it, vi } from 'vitest';

const auditRpc = vi.hoisted(() => vi.fn());

vi.mock('../../src/lib/supabase', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/supabase')>('../../src/lib/supabase');

  auditRpc.mockImplementation((name: string) => {
    if (name === 'audit_log_create' || name === 'audit_log_update') {
      return Promise.resolve({ data: { ok: true }, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });

  return {
    ...actual,
    supabase: {
      ...actual.supabase,
      rpc: auditRpc,
    },
    isAuditLoggingEnabled: true,
  };
});

import { executeTrackedAction, sanitizeAuditPayload } from '../../src/lib/supabase';

describe('executeTrackedAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditRpc.mockImplementation((name: string) => {
      if (name === 'audit_log_create' || name === 'audit_log_update') {
        return Promise.resolve({ data: { ok: true }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
  });

  it('redacts sensitive values and summarizes binary payloads', () => {
    const sanitized = sanitizeAuditPayload({
      matchSecret: 'super-secret',
      umpirePasscode: '4321',
      nested: {
        videoBlob: new Blob(['clip-data'], { type: 'video/webm' }),
      },
    });

    expect(sanitized).toEqual({
      matchSecret: '[REDACTED]',
      umpirePasscode: '[REDACTED]',
      nested: {
        videoBlob: {
          __type: 'Blob',
          size: 9,
          contentType: 'video/webm',
        },
      },
    });
  });

  it('stores request and success response payloads', async () => {
    const response = await executeTrackedAction({
      tableName: 'matches',
      action: 'create_match',
      matchId: 'MATCH1',
      payload: { name: 'Finals', matchSecret: 'hide-me' },
      execute: async () => ({ data: { id: 'match-row' }, error: null }),
    });

    expect(response).toEqual({ data: { id: 'match-row' }, error: null });
    expect(auditRpc).toHaveBeenCalledWith(
      'audit_log_create',
      expect.objectContaining({
        p_match_id: 'MATCH1',
        p_endpoint_name: 'matches.create_match',
        p_status_code: 'pending',
        p_request_payload: {
          name: 'Finals',
          matchSecret: '[REDACTED]',
        },
      })
    );
    expect(auditRpc).toHaveBeenCalledWith(
      'audit_log_update',
      expect.objectContaining({
        p_status_code: 'success',
        p_response_body: { data: { id: 'match-row' }, error: null },
      })
    );
  });

  it('stores error responses and rethrows the original error', async () => {
    const failure = new Error('database failed');

    await expect(
      executeTrackedAction({
        tableName: 'clips',
        action: 'insert',
        matchId: 'MATCH2',
        payload: { overNumber: 3, ballNumber: 2 },
        execute: async () => {
          throw failure;
        },
      })
    ).rejects.toThrow('database failed');

    expect(auditRpc).toHaveBeenCalledWith(
      'audit_log_update',
      expect.objectContaining({
        p_status_code: 'error',
        p_response_body: expect.objectContaining({
          message: 'database failed',
        }),
      })
    );
  });
});
