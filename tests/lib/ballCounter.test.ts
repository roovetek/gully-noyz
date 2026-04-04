import { describe, it, expect } from 'vitest';
import {
  isValidBall,
  calculateRuns,
  getOverBallDisplay,
  calculateOverNumber,
  calculateBallInOver,
} from '../../src/lib/ballCounter';
import { MatchRules } from '../../src/lib/types';

describe('ballCounter', () => {
  const defaultRules: MatchRules = {
    wide_no_ball_count: false,
    wide_no_runs: false,
    legbye_no_runs: false,
    consecutive_overs_required: false,
  };

  describe('isValidBall', () => {
    it('should return true for regular outcomes', () => {
      expect(isValidBall('0', defaultRules)).toBe(true);
      expect(isValidBall('1', defaultRules)).toBe(true);
      expect(isValidBall('4', defaultRules)).toBe(true);
      expect(isValidBall('6', defaultRules)).toBe(true);
      expect(isValidBall('wicket', defaultRules)).toBe(true);
    });

    it('should return false for noball', () => {
      expect(isValidBall('noball', defaultRules)).toBe(false);
    });

    it('should return false for wide when wide_no_ball_count is true', () => {
      const rules = { ...defaultRules, wide_no_ball_count: true };
      expect(isValidBall('wide', rules)).toBe(false);
    });

    it('should return true for wide when wide_no_ball_count is false', () => {
      expect(isValidBall('wide', defaultRules)).toBe(true);
    });
  });

  describe('calculateRuns', () => {
    it('should calculate total runs correctly', () => {
      const result = calculateRuns('1', 1, 0, defaultRules);
      expect(result.totalRuns).toBe(1);
      expect(result.effectiveExtraRuns).toBe(0);
    });

    it('should include extra runs', () => {
      const result = calculateRuns('1', 1, 2, defaultRules);
      expect(result.totalRuns).toBe(3);
      expect(result.effectiveExtraRuns).toBe(2);
    });

    it('should ignore wide runs when wide_no_runs is true', () => {
      const rules = { ...defaultRules, wide_no_runs: true };
      const result = calculateRuns('wide', 0, 1, rules);
      expect(result.totalRuns).toBe(0);
      expect(result.effectiveExtraRuns).toBe(0);
    });

    it('should include wide runs when wide_no_runs is false', () => {
      const result = calculateRuns('wide', 0, 1, defaultRules);
      expect(result.totalRuns).toBe(1);
      expect(result.effectiveExtraRuns).toBe(1);
    });

    it('should ignore legbye runs when legbye_no_runs is true', () => {
      const rules = { ...defaultRules, legbye_no_runs: true };
      const result = calculateRuns('legbye', 0, 2, rules);
      expect(result.totalRuns).toBe(0);
      expect(result.effectiveExtraRuns).toBe(0);
    });
  });

  describe('getOverBallDisplay', () => {
    it('should display 0.0 for no balls', () => {
      expect(getOverBallDisplay(0, 6)).toBe('0.0');
    });

    it('should display partial overs correctly', () => {
      expect(getOverBallDisplay(3, 6)).toBe('0.3');
      expect(getOverBallDisplay(5, 6)).toBe('0.5');
    });

    it('should display complete overs correctly', () => {
      expect(getOverBallDisplay(6, 6)).toBe('1.0');
      expect(getOverBallDisplay(12, 6)).toBe('2.0');
    });

    it('should display overs with remaining balls', () => {
      expect(getOverBallDisplay(7, 6)).toBe('1.1');
      expect(getOverBallDisplay(13, 6)).toBe('2.1');
    });
  });

  describe('calculateOverNumber', () => {
    it('should calculate over number correctly', () => {
      expect(calculateOverNumber(0, 6)).toBe(0);
      expect(calculateOverNumber(5, 6)).toBe(0);
      expect(calculateOverNumber(6, 6)).toBe(1);
      expect(calculateOverNumber(12, 6)).toBe(2);
    });
  });

  describe('calculateBallInOver', () => {
    it('should calculate ball in over correctly', () => {
      expect(calculateBallInOver(0, 6)).toBe(1);
      expect(calculateBallInOver(1, 6)).toBe(2);
      expect(calculateBallInOver(5, 6)).toBe(6);
      expect(calculateBallInOver(6, 6)).toBe(1);
      expect(calculateBallInOver(7, 6)).toBe(2);
    });
  });
});
