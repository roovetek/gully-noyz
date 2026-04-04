import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabase } from '../../src/lib/supabase';
import { cleanupTestData } from '../helpers/factories';

describe('Match Creation Integration', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('should create a test match successfully', async () => {
    const matchId = `TEST-${Date.now()}`;
    const { data, error } = await supabase
      .from('matches')
      .insert({
        match_id: matchId,
        name: 'Integration Test Match',
        is_public: true,
        total_overs: 20,
        balls_per_over: 6,
        is_test_data: true,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.match_id).toBe(matchId);
    expect(data?.is_test_data).toBe(true);
  });

  it('should not return test matches in production queries', async () => {
    const testMatchId = `TEST-${Date.now()}`;
    await supabase
      .from('matches')
      .insert({
        match_id: testMatchId,
        name: 'Test Match',
        is_test_data: true,
      });

    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('is_test_data', false);

    const testMatches = data?.filter(m => m.match_id === testMatchId);
    expect(testMatches?.length).toBe(0);
  });

  it('should return test matches when explicitly requested', async () => {
    const testMatchId = `TEST-${Date.now()}`;
    await supabase
      .from('matches')
      .insert({
        match_id: testMatchId,
        name: 'Test Match',
        is_test_data: true,
      });

    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('is_test_data', true)
      .eq('match_id', testMatchId);

    expect(data?.length).toBeGreaterThan(0);
    expect(data?.[0].match_id).toBe(testMatchId);
  });
});
