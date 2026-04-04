import { supabase } from '../../src/lib/supabase';

export interface TestMatchOptions {
  match_id?: string;
  name?: string;
  is_public?: boolean;
  total_overs?: number;
  balls_per_over?: number;
  current_innings?: number;
}

export interface TestClipOptions {
  match_id: string;
  over_number?: number;
  ball_number?: number;
  outcome?: string;
  innings_number?: number;
  bowler_name?: string;
  extra_runs?: number;
  is_valid_ball?: boolean;
  ball_in_over?: number;
}

export async function createTestMatch(options: TestMatchOptions = {}) {
  const matchId = options.match_id || `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const { data, error } = await supabase
    .from('matches')
    .insert({
      match_id: matchId,
      name: options.name || 'Test Match',
      is_public: options.is_public ?? true,
      total_overs: options.total_overs || 20,
      balls_per_over: options.balls_per_over || 6,
      current_innings: options.current_innings || 1,
      is_test_data: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test match: ${error.message}`);
  }

  return data;
}

export async function createTestClip(options: TestClipOptions) {
  const { data, error } = await supabase
    .from('clips')
    .insert({
      match_id: options.match_id,
      over_number: options.over_number || 1,
      ball_number: options.ball_number || 1,
      outcome: options.outcome || 'dot',
      innings_number: options.innings_number || 1,
      bowler_name: options.bowler_name || 'Test Bowler',
      extra_runs: options.extra_runs || 0,
      is_valid_ball: options.is_valid_ball ?? true,
      ball_in_over: options.ball_in_over || 0,
      video_url: 'test://video.mp4',
      duration: 5,
      is_test_data: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test clip: ${error.message}`);
  }

  return data;
}

export async function setupTestMatch(config: {
  matchOptions?: TestMatchOptions;
  clips?: TestClipOptions[];
}) {
  const match = await createTestMatch(config.matchOptions);

  const clips = [];
  if (config.clips) {
    for (const clipOptions of config.clips) {
      const clip = await createTestClip({
        ...clipOptions,
        match_id: match.match_id,
      });
      clips.push(clip);
    }
  }

  return { match, clips };
}

export async function cleanupTestData() {
  await supabase.from('clips').delete().eq('is_test_data', true);
  await supabase.from('matches').delete().eq('is_test_data', true);
}
