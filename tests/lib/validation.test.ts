import { describe, expect, it } from 'vitest';
import {
  normalizeMatchId,
  sanitizeString,
  validateDismissal,
  validateMatchId,
  validateMatchName,
  validateMatchSecret,
  validateOutcome,
  validateOversConfig,
} from '../../src/lib/validation';

describe('validation', () => {
  describe('validateMatchName', () => {
    it('rejects empty names', () => {
      expect(validateMatchName('   ').isValid).toBe(false);
    });

    it('rejects short names', () => {
      const result = validateMatchName('ab');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 3');
    });

    it('accepts valid names', () => {
      expect(validateMatchName('Final Match').isValid).toBe(true);
    });
  });

  describe('validateMatchSecret', () => {
    it('allows empty secret for public matches', () => {
      expect(validateMatchSecret('', false).isValid).toBe(true);
    });

    it('requires secret for private matches', () => {
      expect(validateMatchSecret('', true).isValid).toBe(false);
      expect(validateMatchSecret('12345', true).isValid).toBe(false);
      expect(validateMatchSecret('123456', true).isValid).toBe(true);
    });
  });

  describe('validateMatchId', () => {
    it('normalizes and validates id format', () => {
      expect(validateMatchId('ab12cd').isValid).toBe(true);
      expect(validateMatchId('abc').isValid).toBe(false);
      expect(validateMatchId('AB-12C').isValid).toBe(false);
    });
  });

  describe('validateOversConfig', () => {
    it('validates overs and balls-per-over ranges', () => {
      expect(validateOversConfig(20, 6).isValid).toBe(true);
      expect(validateOversConfig(0, 6).isValid).toBe(false);
      expect(validateOversConfig(20, 1).isValid).toBe(false);
    });
  });

  describe('outcome and dismissal validation', () => {
    it('requires outcome', () => {
      expect(validateOutcome(null).isValid).toBe(false);
    });

    it('requires dismissal type for out outcome', () => {
      expect(validateDismissal('out', null).isValid).toBe(false);
      expect(validateDismissal('out', 'bowled').isValid).toBe(true);
    });
  });

  describe('sanitizers', () => {
    it('sanitizes strings and normalizes match ids', () => {
      expect(sanitizeString(' <Test> ')).toBe('Test');
      expect(normalizeMatchId(' ab12cd ')).toBe('AB12CD');
    });
  });
});

