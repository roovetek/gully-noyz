import type { AIScoreDecision } from './aiScoringClient';

const FIXED_SEQUENCE: AIScoreDecision[] = [
  {
    outcome: 'dot',
    dismissal_type: null,
    extra_runs: 0,
    confidence: 0.84,
    rationale: 'Mock sequence: settled opening delivery',
    transcript: 'dot ball',
  },
  {
    outcome: '1',
    dismissal_type: null,
    extra_runs: 0,
    confidence: 0.86,
    rationale: 'Mock sequence: single rotated strike',
    transcript: 'one run',
  },
  {
    outcome: '4',
    dismissal_type: null,
    extra_runs: 0,
    confidence: 0.88,
    rationale: 'Mock sequence: boundary through cover',
    transcript: 'four runs',
  },
  {
    outcome: 'wicket',
    dismissal_type: 'bowled',
    extra_runs: 0,
    confidence: 0.9,
    rationale: 'Mock sequence: cleanup bowled',
    transcript: 'batsman bowled',
  },
  {
    outcome: 'wide',
    dismissal_type: null,
    extra_runs: 1,
    confidence: 0.81,
    rationale: 'Mock sequence: line drifted wide',
    transcript: 'called wide',
  },
];

let pointer = 0;

export async function scoreFromAudioMock(_audioBlob: Blob): Promise<AIScoreDecision> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const decision = FIXED_SEQUENCE[pointer % FIXED_SEQUENCE.length];
  pointer += 1;
  return decision;
}
