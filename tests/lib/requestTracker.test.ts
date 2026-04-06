import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => {
  const eqMock = vi.fn().mockResolvedValue({ error: null });
  const updateMock = vi.fn(() => ({ eq: eqMock }));
  const insertMock = vi.fn().mockResolvedValue({ error: null });
  const fromMock = vi.fn((tableName: string) => {
    if (tableName === 'audit_logs') {
      return {
        insert: insertMock,
        update: updateMock,
      };
    }

    return {
      insert: vi.fn(),
      update: vi.fn(),
    };
  });

  return {
    eqMock,
    updateMock,
    insertMock,
    fromMock,
  };
});

vi.mock('../../src/lib/supabase', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/supabase')>('../../src/lib/supabase');

  return {
    ...actual,
    supabase: {
      from: supabaseMocks.fromMock,
    },
    isAuditLoggingEnabled: true,
  };
});

import { executeTrackedAction, sanitizeAuditPayload } from '../../src/lib/supabase';

describe('executeTrackedAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.eqMock.mockResolvedValue({ error: null });
    supabaseMocks.insertMock.mockResolvedValue({ error: null });
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
    expect(supabaseMocks.fromMock).toHaveBeenCalledWith('audit_logs');
    expect(supabaseMocks.insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        match_id: 'MATCH1',
        endpoint_name: 'matches.create_match',
        status_code: 'pending',
        request_payload: {
          name: 'Finals',
          matchSecret: '[REDACTED]',
        },
      })
    );
    expect(supabaseMocks.updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        response_body: { data: { id: 'match-row' }, error: null },
        status_code: 'success',
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

    expect(supabaseMocks.updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status_code: 'error',
        response_body: expect.objectContaining({
          message: 'database failed',
        }),
      })
    );
  });
});
