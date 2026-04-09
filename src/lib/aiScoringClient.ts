export type AIScoringMode = 'off' | 'live' | 'mock';

export interface AIScoreDecision {
  outcome: 'dot' | '1' | '2' | '3' | '4' | '6' | 'wicket' | 'wide' | 'noball' | 'other';
  dismissal_type: string | null;
  extra_runs: number;
  confidence: number;
  rationale: string;
  transcript: string;
}

export type AIScoringResult =
  | {
      ok: true;
      mode: Exclude<AIScoringMode, 'off'>;
      decision: AIScoreDecision;
      raw: unknown;
    }
  | {
      ok: false;
      mode: AIScoringMode | 'fallback';
      reason: 'disabled' | 'unavailable' | 'error';
      message: string;
      raw?: unknown;
    };

const LOCAL_MODE_KEY = 'gullystream_ai_mode';
const DEFAULT_TIMEOUT_MS = 15000;
const AI_SERVICE_URL = (import.meta.env.VITE_AI_SERVICE_URL || 'http://127.0.0.1:8000').trim();

export function getAIScoringMode(): AIScoringMode {
  if (typeof window !== 'undefined') {
    const localMode = window.localStorage.getItem(LOCAL_MODE_KEY);
    if (localMode === 'off' || localMode === 'live' || localMode === 'mock') {
      return localMode;
    }
  }
  const envMode = String(import.meta.env.VITE_AI_SCORING_MODE || 'off').toLowerCase();
  if (envMode === 'live' || envMode === 'mock') return envMode;
  return 'off';
}

export function setAIScoringMode(mode: AIScoringMode): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_MODE_KEY, mode);
}

function sanitizeDecision(raw: any): AIScoreDecision {
  const allowed = new Set(['dot', '1', '2', '3', '4', '6', 'wicket', 'wide', 'noball', 'other']);
  const outcome = allowed.has(raw?.outcome) ? raw.outcome : 'other';
  const extraRuns = Number.isFinite(raw?.extra_runs) ? Math.max(0, Number(raw.extra_runs)) : 0;
  const confidence = Number.isFinite(raw?.confidence)
    ? Math.max(0, Math.min(1, Number(raw.confidence)))
    : 0;
  const dismissalType = raw?.dismissal_type ? String(raw.dismissal_type) : null;
  return {
    outcome,
    dismissal_type: outcome === 'wicket' ? dismissalType ?? 'unknown' : null,
    extra_runs: outcome === 'wide' || outcome === 'noball' ? extraRuns : 0,
    confidence,
    rationale: String(raw?.rationale ?? '').trim(),
    transcript: String(raw?.transcript ?? '').trim(),
  };
}

export async function scoreFromAudioWithLocalAI(params: {
  audioBlob: Blob;
  matchId?: string | null;
  timeoutMs?: number;
}): Promise<AIScoringResult> {
  const mode = getAIScoringMode();
  if (mode === 'off') {
    return { ok: false, mode: 'off', reason: 'disabled', message: 'AI scoring is disabled' };
  }

  if (mode === 'mock') {
    const { scoreFromAudioMock } = await import('./mock_ai_service');
    const mock = await scoreFromAudioMock(params.audioBlob);
    return { ok: true, mode: 'mock', decision: mock, raw: mock };
  }

  const controller = new AbortController();
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const formData = new FormData();
    formData.append('file', params.audioBlob, 'clip.webm');
    if (params.matchId) {
      formData.append('match_id', params.matchId);
    }

    const response = await fetch(`${AI_SERVICE_URL}/score-from-audio`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        mode: 'live',
        reason: response.status >= 500 ? 'unavailable' : 'error',
        message: `AI service error (${response.status})`,
      };
    }

    const body = await response.json();
    return {
      ok: true,
      mode: 'live',
      decision: sanitizeDecision(body),
      raw: body,
    };
  } catch (error) {
    return {
      ok: false,
      mode: 'live',
      reason: 'unavailable',
      message: error instanceof Error ? error.message : 'Local AI unavailable',
      raw: error,
    };
  } finally {
    clearTimeout(timeout);
  }
}
