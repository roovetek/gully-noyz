import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestMatch, createTestClip, cleanupTestData } from '../helpers/factories';
import { supabase } from '../../src/lib/supabase';

const runIntegration = process.env.RUN_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration('Match Deletion Integration', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('should create and retrieve test match', async () => {
    const match = await createTestMatch();

    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('match_id', match.match_id)
      .eq('is_test_data', true);

    expect(data?.length).toBeGreaterThan(0);
    expect(data?.[0].match_id).toBe(match.match_id);
  });

  it('should create test clips for a match', async () => {
    const match = await createTestMatch();

    for (let i = 1; i <= 3; i++) {
      await createTestClip({
        match_id: match.match_id,
        over_number: 1,
        ball_number: i,
      });
    }

    const { data: clips } = await supabase
      .from('clips')
      .select('*')
      .eq('match_id', match.match_id)
      .eq('is_test_data', true);

    expect(clips?.length).toBe(3);
  });

  it('should mark test data correctly', async () => {
    const match1 = await createTestMatch({ match_id: 'TEST-MARK-1' });
    const match2 = await createTestMatch({ match_id: 'TEST-MARK-2' });

    const { data: testMatches } = await supabase
      .from('matches')
      .select('*')
      .eq('is_test_data', true)
      .in('match_id', [match1.match_id, match2.match_id]);

    expect(testMatches?.length).toBe(2);
    testMatches?.forEach(match => {
      expect(match.is_test_data).toBe(true);
    });
  });
});
