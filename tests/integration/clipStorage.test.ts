import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestMatch, createTestClip, cleanupTestData } from '../helpers/factories';
import { supabase } from '../../src/lib/supabase';

const runIntegration = process.env.RUN_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration('Clip Storage Integration', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('should create a test clip successfully', async () => {
    const match = await createTestMatch();
    const clip = await createTestClip({
      match_id: match.match_id,
      over_number: 1,
      ball_number: 1,
      outcome: '4',
    });

    expect(clip).toBeDefined();
    expect(clip.match_id).toBe(match.match_id);
    expect(clip.is_test_data).toBe(true);
  });

  it('should not return test clips in production queries', async () => {
    const match = await createTestMatch();
    await createTestClip({
      match_id: match.match_id,
      over_number: 1,
      ball_number: 1,
    });

    const { data } = await supabase
      .from('clips')
      .select('*')
      .eq('match_id', match.match_id)
      .eq('is_test_data', false);

    expect(data?.length).toBe(0);
  });

  it('should store multiple clips for a match', async () => {
    const match = await createTestMatch();

    for (let i = 1; i <= 6; i++) {
      await createTestClip({
        match_id: match.match_id,
        over_number: 1,
        ball_number: i,
        outcome: i === 6 ? '6' : 'dot',
      });
    }

    const { data } = await supabase
      .from('clips')
      .select('*')
      .eq('match_id', match.match_id)
      .eq('is_test_data', true);

    expect(data?.length).toBe(6);
  });

  it('should track innings correctly', async () => {
    const match = await createTestMatch();

    await createTestClip({
      match_id: match.match_id,
      innings_number: 1,
      over_number: 1,
      ball_number: 1,
    });

    await createTestClip({
      match_id: match.match_id,
      innings_number: 2,
      over_number: 1,
      ball_number: 1,
    });

    const { data: innings1 } = await supabase
      .from('clips')
      .select('*')
      .eq('match_id', match.match_id)
      .eq('innings_number', 1)
      .eq('is_test_data', true);

    const { data: innings2 } = await supabase
      .from('clips')
      .select('*')
      .eq('match_id', match.match_id)
      .eq('innings_number', 2)
      .eq('is_test_data', true);

    expect(innings1?.length).toBe(1);
    expect(innings2?.length).toBe(1);
  });
});
