import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => ({
  rpc: vi.fn(),
  storageList: vi.fn().mockResolvedValue({ data: [], error: null }),
  storageRemove: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('../../src/lib/supabase', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/supabase')>('../../src/lib/supabase');
  return {
    ...actual,
    isAuditLoggingEnabled: false,
    supabase: {
      ...actual.supabase,
      rpc: hoisted.rpc,
      storage: {
        from: () => ({
          list: hoisted.storageList,
          remove: hoisted.storageRemove,
        }),
      },
    },
  };
});

import { deleteMatch } from '../../src/lib/deleteMatch';

describe('deleteMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.rpc.mockResolvedValue({ data: { ok: true }, error: null });
  });

  it('rejects invalid match id', async () => {
    const r = await deleteMatch('abc', 'secret');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/invalid/i);
    expect(hoisted.rpc).not.toHaveBeenCalled();
  });

  it('rejects empty admin passcode', async () => {
    const r = await deleteMatch('AB12CD', '  ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/passcode/i);
    expect(hoisted.rpc).not.toHaveBeenCalled();
  });

  it('calls admin_delete_match RPC with id and passcode', async () => {
    const r = await deleteMatch('AB12CD', 'mypass');
    expect(r.ok).toBe(true);
    expect(hoisted.rpc).toHaveBeenCalledWith('admin_delete_match', {
      p_match_id: 'AB12CD',
      p_passcode: 'mypass',
    });
  });

  it('returns error when RPC reports failure', async () => {
    hoisted.rpc.mockResolvedValue({
      data: { ok: false, error: 'Invalid dashboard passcode.' },
      error: null,
    });
    const r = await deleteMatch('XY34ZZ', 'wrong');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('Invalid dashboard passcode');
  });

  it('returns error when PostgREST errors', async () => {
    hoisted.rpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });
    const r = await deleteMatch('ZZ99AA', 'x');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('rpc failed');
  });
});
