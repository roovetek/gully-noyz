import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabase } from '../../src/lib/supabase';
import { cleanupTestData } from '../helpers/factories';

const runIntegration = process.env.RUN_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration('Match Creation Integration', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('should create a match successfully with default rules', async () => {
    const matchId = `TEST-${Date.now()}`;
    const { data, error } = await supabase
      .from('matches')
      .insert({
        match_id: matchId,
        name: 'Default Rules Match',
        is_public: true,
        total_overs: 20,
        balls_per_over: 6,
        max_wickets: 10,
        max_overs_per_bowler: 4,
        is_test_data: true,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.match_id).toBe(matchId);
    expect(data?.total_overs).toBe(20);
    expect(data?.balls_per_over).toBe(6);
    expect(data?.max_wickets).toBe(10);
    expect(data?.max_overs_per_bowler).toBe(4);
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

  // Test Case 2: Should create a match with customized rules
  // Input:
  //    - Overs per innings: 10
  //    - Balls per over: 8
  //    - Max wickets: 8
  //    - Max overs per bowler: 2
  // Expected Output:
  //    - Match is created successfully with the specified custom rules.

  it('should create a match with customized rules', async () => {
    const matchId = `TEST-${Date.now()}`;
    const { data, error } = await supabase
      .from('matches')
      .insert({
        match_id: matchId,
        name: 'Custom Rules Match',
        is_public: true,
        total_overs: 10,
        balls_per_over: 8,
        max_wickets: 8,
        max_overs_per_bowler: 2,
        is_test_data: true,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.match_id).toBe(matchId);
    expect(data?.total_overs).toBe(10);
    expect(data?.balls_per_over).toBe(8);
    expect(data?.max_wickets).toBe(8);
    expect(data?.max_overs_per_bowler).toBe(2);
  });
});
