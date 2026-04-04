import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getGlobalRules,
  updateGlobalRules,
  getEffectiveRules,
  applyOverride,
} from '../../src/lib/rulesEngine';
import { createTestMatch, cleanupTestData } from '../helpers/factories';

describe('rulesEngine', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('getGlobalRules', () => {
    it('should return global rules if they exist', async () => {
      const rules = await getGlobalRules();
      expect(rules).toBeDefined();
      if (rules) {
        expect(rules).toHaveProperty('overs_per_innings');
        expect(rules).toHaveProperty('balls_per_over');
        expect(rules).toHaveProperty('max_wickets');
      }
    });
  });

  describe('getEffectiveRules', () => {
    it('should return match rules for a valid match', async () => {
      const match = await createTestMatch({
        total_overs: 10,
        balls_per_over: 5,
      });

      const rules = await getEffectiveRules(match.match_id);
      expect(rules).toBeDefined();
      if (rules) {
        expect(rules.overs_per_innings).toBe(20);
        expect(rules.balls_per_over).toBe(5);
      }
    });

    it('should return null for non-existent match', async () => {
      const rules = await getEffectiveRules('NON_EXISTENT_MATCH');
      expect(rules).toBeNull();
    });
  });

  describe('applyOverride', () => {
    it('should apply rule override correctly', async () => {
      const match = await createTestMatch();

      await applyOverride(
        match.match_id,
        'max_overs_per_bowler',
        5,
        'Test override',
        'admin'
      );

      const rules = await getEffectiveRules(match.match_id);
      expect(rules?.max_overs_per_bowler).toBe(5);
    });
  });
});
