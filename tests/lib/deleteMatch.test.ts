import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => ({
  list: vi.fn(),
  remove: vi.fn(),
  clipsEq: vi.fn(),
  auditEq: vi.fn(),
  matchesEq: vi.fn(),
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        list: hoisted.list,
        remove: hoisted.remove,
      }),
    },
    from: (table: string) => ({
      delete: () => ({
        eq: (_col: string, _val: string) => {
          if (table === 'clips') return hoisted.clipsEq();
          if (table === 'audit_logs') return hoisted.auditEq();
          if (table === 'matches') return hoisted.matchesEq();
          return Promise.resolve({ error: null });
        },
      }),
    }),
  },
}));

import { deleteMatch } from '../../src/lib/deleteMatch';

describe('deleteMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.list.mockResolvedValue({ data: [], error: null });
    hoisted.remove.mockResolvedValue({ data: [], error: null });
    hoisted.clipsEq.mockResolvedValue({ error: null });
    hoisted.auditEq.mockResolvedValue({ error: null });
    hoisted.matchesEq.mockResolvedValue({ error: null });
  });

  it('rejects invalid match id', async () => {
    const r = await deleteMatch('abc');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/invalid/i);
    expect(hoisted.list).not.toHaveBeenCalled();
  });

  it('removes storage files then clips audit_logs and matches in order', async () => {
    hoisted.list.mockResolvedValue({
      data: [{ name: 'a.webm' }, { name: 'b.webm' }],
      error: null,
    });

    const r = await deleteMatch('AB12CD');
    expect(r.ok).toBe(true);

    expect(hoisted.list).toHaveBeenCalledWith('AB12CD', expect.any(Object));
    expect(hoisted.remove).toHaveBeenCalledWith(['AB12CD/a.webm', 'AB12CD/b.webm']);
    expect(hoisted.clipsEq).toHaveBeenCalled();
    expect(hoisted.auditEq).toHaveBeenCalled();
    expect(hoisted.matchesEq).toHaveBeenCalled();
  });

  it('returns error when storage list fails', async () => {
    hoisted.list.mockResolvedValue({ data: null, error: { message: 'nope' } });

    const r = await deleteMatch('XY34ZZ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('nope');
    expect(hoisted.clipsEq).not.toHaveBeenCalled();
  });

  it('returns error when clips delete fails', async () => {
    hoisted.clipsEq.mockResolvedValue({ error: { message: 'rls' } });

    const r = await deleteMatch('ZZ99AA');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('rls');
    expect(hoisted.matchesEq).not.toHaveBeenCalled();
  });
});
