import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAIScoringMode,
  scoreFromAudioWithLocalAI,
  setAIScoringMode,
} from '../../src/lib/aiScoringClient';

describe('aiScoringClient', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('uses local storage mode override when set', () => {
    setAIScoringMode('mock');
    expect(getAIScoringMode()).toBe('mock');
  });

  it('returns disabled result when mode is off', async () => {
    setAIScoringMode('off');
    const result = await scoreFromAudioWithLocalAI({
      audioBlob: new Blob(['x'], { type: 'audio/webm' }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('disabled');
    }
  });

  it('sanitizes successful live responses', async () => {
    setAIScoringMode('live');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          outcome: 'wide',
          dismissal_type: 'caught',
          extra_runs: 3,
          confidence: 2,
          rationale: '  looks wide ',
          transcript: '  called wide ',
        }),
      })
    );

    const result = await scoreFromAudioWithLocalAI({
      audioBlob: new Blob(['x'], { type: 'audio/webm' }),
      matchId: 'M1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mode).toBe('live');
      expect(result.decision).toEqual({
        outcome: 'wide',
        dismissal_type: null,
        extra_runs: 3,
        confidence: 1,
        rationale: 'looks wide',
        transcript: 'called wide',
      });
    }
  });

  it('returns unavailable for live 5xx errors', async () => {
    setAIScoringMode('live');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      })
    );

    const result = await scoreFromAudioWithLocalAI({
      audioBlob: new Blob(['x'], { type: 'audio/webm' }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('unavailable');
      expect(result.message).toContain('503');
    }
  });
});

