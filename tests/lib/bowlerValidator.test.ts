import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  canBowl,
  checkBowlerOverLimit,
} from '../../src/lib/bowlerValidator';
import { createTestMatch, createTestClip, cleanupTestData } from '../helpers/factories';
import { MatchRules } from '../../src/lib/types';

describe('bowlerValidator', () => {
  const defaultRules: MatchRules = {
    overs_per_innings: 20,
    balls_per_over: 6,
    max_wickets: 10,
    max_overs_per_bowler: 4,
    wide_no_runs: false,
    wide_no_ball_count: false,
    legbye_no_runs: false,
    consecutive_overs_required: false,
  };

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('canBowl', () => {
    it('should allow bowler with no previous overs', async () => {
      const match = await createTestMatch();
      const result = await canBowl(match.match_id, 'Bowler A', 1, 1, defaultRules);
      expect(result.allowed).toBe(true);
    });

    it('should allow bowler within over limits', async () => {
      const match = await createTestMatch();

      for (let i = 1; i <= 6; i++) {
        await createTestClip({
          match_id: match.match_id,
          over_number: 1,
          ball_number: i,
          bowler_name: 'Bowler A',
          innings_number: 1,
          is_valid_ball: true,
        });
      }

      const result = await canBowl(match.match_id, 'Bowler A', 1, 2, defaultRules);
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkBowlerOverLimit', () => {
    it('should return allowed when bowler has not reached limit', async () => {
      const match = await createTestMatch();

      for (let i = 1; i <= 6; i++) {
        await createTestClip({
          match_id: match.match_id,
          over_number: 1,
          ball_number: i,
          bowler_name: 'Bowler A',
          innings_number: 1,
          is_valid_ball: true,
        });
      }

      const result = await checkBowlerOverLimit(match.match_id, 'Bowler A', 1, defaultRules);
      expect(result.allowed).toBe(true);
    });
  });
});
