import { describe, expect, it } from 'vitest';
import {
  SecureStorage,
  generateSecureMatchId,
  hashSecret,
  isValidMatchId,
  sanitizeInput,
  verifySecret,
} from '../../src/lib/security';

describe('security', () => {
  describe('hashSecret and verifySecret', () => {
    it('produces deterministic sha256 hex hashes', async () => {
      const first = await hashSecret('umpire-passcode');
      const second = await hashSecret('umpire-passcode');

      expect(first).toBe(second);
      expect(first).toMatch(/^[a-f0-9]{64}$/);
    });

    it('verifies matching and mismatched secrets', async () => {
      const hash = await hashSecret('secret-1234');

      await expect(verifySecret('secret-1234', hash)).resolves.toBe(true);
      await expect(verifySecret('wrong-secret', hash)).resolves.toBe(false);
    });
  });

  describe('input and match ids', () => {
    it('sanitizes user input by trimming and removing angle brackets', () => {
      expect(sanitizeInput('  <script>alert(1)</script>  ')).toBe('scriptalert(1)/script');
      expect(sanitizeInput(' normal input ')).toBe('normal input');
    });

    it('validates only six-character uppercase alphanumeric match ids', () => {
      expect(isValidMatchId('ABC123')).toBe(true);
      expect(isValidMatchId('abc123')).toBe(false);
      expect(isValidMatchId('ABCDE')).toBe(false);
      expect(isValidMatchId('ABC1234')).toBe(false);
      expect(isValidMatchId('ABC-12')).toBe(false);
    });

    it('generates secure match ids in the required format', () => {
      const ids = Array.from({ length: 64 }, () => generateSecureMatchId());

      for (const id of ids) {
        expect(id).toMatch(/^[A-Z0-9]{6}$/);
      }

      expect(new Set(ids).size).toBeGreaterThan(1);
    });
  });

  describe('SecureStorage', () => {
    it('set/get/remove use prefixed keys', () => {
      SecureStorage.setItem('match_secret_ABC123', '1234');
      expect(sessionStorage.getItem('gs_match_secret_ABC123')).toBe('1234');
      expect(SecureStorage.getItem('match_secret_ABC123')).toBe('1234');

      SecureStorage.removeItem('match_secret_ABC123');
      expect(SecureStorage.getItem('match_secret_ABC123')).toBeNull();
      expect(sessionStorage.getItem('gs_match_secret_ABC123')).toBeNull();
    });

    it('clear removes only SecureStorage keys', () => {
      sessionStorage.setItem('non_prefixed', 'keep-me');
      SecureStorage.setItem('one', '1');
      SecureStorage.setItem('two', '2');

      SecureStorage.clear();

      expect(sessionStorage.getItem('non_prefixed')).toBe('keep-me');
      expect(SecureStorage.getItem('one')).toBeNull();
      expect(SecureStorage.getItem('two')).toBeNull();
    });
  });
});

