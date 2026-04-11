import { supabase } from './supabase';

export interface VoiceAuditLogEntry {
  trace_id: string;
  match_id: string;
  raw_transcript: string;
  sanitized_transcript: string;
  confidence_score: number;
  confirmation_status: 'pending' | 'confirmed' | 'timeout' | 'cancelled';
  mode: string;
  input_method: 'voice';
  error_message?: string;
  retry_count: number;
}

export async function logVoiceInteraction(entry: VoiceAuditLogEntry): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('ai_decision_logs')
      .insert([
        {
          trace_id: entry.trace_id,
          match_id: entry.match_id,
          raw_transcript: entry.raw_transcript,
          sanitized_transcript: entry.sanitized_transcript,
          confidence_score: entry.confidence_score,
          confirmation_status: entry.confirmation_status,
          mode: entry.mode,
          input_method: entry.input_method,
          error_message: entry.error_message || null,
          retry_count: entry.retry_count,
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error('Voice audit log error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Voice audit log exception:', message);
    return { success: false, error: message };
  }
}

export async function getVoiceInteractionHistory(
  matchId: string,
  limit: number = 50
): Promise<VoiceAuditLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('ai_decision_logs')
      .select('*')
      .eq('match_id', matchId)
      .eq('input_method', 'voice')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Voice history retrieval error:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Voice history retrieval exception:', err);
    return [];
  }
}

export async function logVoiceStateTransition(
  traceId: string,
  matchId: string,
  fromState: string,
  toState: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('ai_decision_logs').insert([
      {
        trace_id: traceId,
        match_id: matchId,
        mode: 'voice_state_transition',
        input_method: 'voice',
        raw_transcript: `${fromState} -> ${toState}`,
        sanitized_transcript: `${fromState} -> ${toState}`,
        confidence_score: null,
        confirmation_status: 'pending',
        error_message: JSON.stringify(metadata || {}),
        retry_count: 0,
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.error('State transition logging error:', err);
  }
}
