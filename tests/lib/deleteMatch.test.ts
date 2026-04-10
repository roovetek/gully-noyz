import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => ({
  supabase: {
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      })),
    },
  } as any,
}));

vi.mock('../../src/lib/supabase', () => ({
  isAuditLoggingEnabled: false,
  executeTrackedAction: vi.fn(async ({ execute }: any) => execute()),
  supabase: hoisted.supabase,
}));

import { deleteMatch } from '../../src/lib/deleteMatch';

describe('deleteMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.supabase.rpc.mockResolvedValue({ data: { ok: true }, error: null });
  });

  it('rejects invalid match id', async () => {
    const r = await deleteMatch('abc', 'secret');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/invalid/i);
    expect(hoisted.supabase.rpc).not.toHaveBeenCalled();
  });

  it('rejects empty admin passcode', async () => {
    const r = await deleteMatch('AB12CD', '  ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/passcode/i);
    expect(hoisted.supabase.rpc).not.toHaveBeenCalled();
  });

  it('calls admin_delete_match RPC with id and passcode', async () => {
    const r = await deleteMatch('AB12CD', 'mypass');
    expect(r.ok).toBe(true);
    expect(hoisted.supabase.rpc).toHaveBeenCalledWith('admin_delete_match', {
      p_match_id: 'AB12CD',
      p_passcode: 'mypass',
    });
  });

  it('returns error when RPC reports failure', async () => {
    hoisted.supabase.rpc.mockResolvedValue({
      data: { ok: false, error: 'Invalid Admin Console passcode.' },
      error: null,
    });
    const r = await deleteMatch('XY34ZZ', 'wrong');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('Invalid Admin Console passcode');
  });

  it('returns error when PostgREST errors', async () => {
    hoisted.supabase.rpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });
    const r = await deleteMatch('ZZ99AA', 'x');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toMatch(/something went wrong|try again/i);
    }
  });
});
