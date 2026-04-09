import { executeTrackedAction, supabase } from './supabase';

export interface AIDecisionTraceInput {
  matchId: string | null;
  inningsNumber: number;
  overNumber: number;
  ballNumber: number;
  deliveryIndex: number;
  mode: 'live' | 'mock' | 'off' | 'fallback';
  status: 'success' | 'unavailable' | 'error';
  transcript?: string;
  rationale?: string;
  confidence?: number;
  decision?: unknown;
  errorMessage?: string;
  rawResponse?: unknown;
}

export async function writeAIDecisionTrace(input: AIDecisionTraceInput): Promise<void> {
  try {
    await executeTrackedAction({
      tableName: 'ai_decision_logs',
      action: 'insert',
      matchId: input.matchId,
      payload: input,
      execute: async () =>
        supabase.from('ai_decision_logs').insert({
          match_id: input.matchId,
          innings_number: input.inningsNumber,
          over_number: input.overNumber,
          ball_number: input.ballNumber,
          delivery_index: input.deliveryIndex,
          mode: input.mode,
          status: input.status,
          transcript: input.transcript ?? null,
          rationale: input.rationale ?? null,
          confidence: input.confidence ?? null,
          decision: input.decision ?? {},
          error_message: input.errorMessage ?? null,
          raw_response: input.rawResponse ?? null,
        }),
    });
  } catch (error) {
    console.error('Failed to write AI decision trace', error);
  }
}
