import { describe, it, expect } from 'vitest';
import { userFriendlyMessage } from '../../src/lib/userFriendlyError';

describe('userFriendlyMessage', () => {
  it('maps permission / RLS style errors', () => {
    expect(
      userFriendlyMessage({ message: 'permission denied for table clips', code: '42501' })
    ).toMatch(/permission/i);
  });

  it('maps network-style errors', () => {
    expect(userFriendlyMessage({ message: 'TypeError: Failed to fetch' })).toMatch(/reach the server/i);
  });

  it('preserves short non-technical validation messages', () => {
    expect(userFriendlyMessage({ message: 'Invalid Admin Console passcode.' })).toBe(
      'Invalid Admin Console passcode.'
    );
  });

  it('uses fallback for unknown technical messages', () => {
    expect(
      userFriendlyMessage({ message: 'unknown_internal_code_xyz_123' }, {
        fallback: 'Custom fallback',
      })
    ).toBe('Custom fallback');
  });
});
