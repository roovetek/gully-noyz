import { useCallback } from 'react';
import { useVoiceStore } from '../stores/voiceStore';
import { useVoiceStateMachine } from './useVoiceStateMachine';
import { logVoiceInteraction } from '../lib/voiceAuditLog';
import { parseOutcome } from '../lib/voiceParser';

export interface VoiceIntegrationConfig {
  matchId: string;
  onDelivered?: (outcome: any) => Promise<void>;
  onError?: (error: string) => void;
}

export function useVoiceIntegration({
  matchId,
  onDelivered,
  onError,
}: VoiceIntegrationConfig) {
  const {
    state,
    traceId,
    rawTranscript,
    sanitizedTranscript,
    confidenceScore,
    failureCount,
    incrementFailureCount,
    resetFailureCount,
  } = useVoiceStore();

  const handleVoiceConfirmed = useCallback(
    async (transcript: string) => {
      try {
        const parsed = parseOutcome(transcript);

        if (parsed.confidence_score < 0.6) {
          await logVoiceInteraction({
            trace_id: traceId,
            match_id: matchId,
            raw_transcript: rawTranscript,
            sanitized_transcript: sanitizedTranscript,
            confidence_score: parsed.confidence_score,
            confirmation_status: 'pending',
            mode: 'voice',
            input_method: 'voice',
            error_message: 'Low confidence - requiring secondary confirmation',
            retry_count: failureCount,
          });

          if (onError) {
            onError('Low confidence score. Please try again.');
          }
          incrementFailureCount();
          return;
        }

        if (onDelivered) {
          await onDelivered(parsed);
        }

        await logVoiceInteraction({
          trace_id: traceId,
          match_id: matchId,
          raw_transcript: rawTranscript,
          sanitized_transcript: sanitizedTranscript,
          confidence_score: parsed.confidence_score,
          confirmation_status: 'confirmed',
          mode: 'voice',
          input_method: 'voice',
          retry_count: failureCount,
        });

        resetFailureCount();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error processing voice input';

        await logVoiceInteraction({
          trace_id: traceId,
          match_id: matchId,
          raw_transcript: rawTranscript,
          sanitized_transcript: sanitizedTranscript,
          confidence_score: confidenceScore,
          confirmation_status: 'cancelled',
          mode: 'voice',
          input_method: 'voice',
          error_message: message,
          retry_count: failureCount,
        });

        if (onError) {
          onError(message);
        }
        incrementFailureCount();
      }
    },
    [
      traceId,
      matchId,
      rawTranscript,
      sanitizedTranscript,
      confidenceScore,
      failureCount,
      onDelivered,
      onError,
      incrementFailureCount,
      resetFailureCount,
    ]
  );

  const handleVoiceCancelled = useCallback(async () => {
    await logVoiceInteraction({
      trace_id: traceId,
      match_id: matchId,
      raw_transcript: rawTranscript,
      sanitized_transcript: sanitizedTranscript,
      confidence_score: confidenceScore,
      confirmation_status: 'cancelled',
      mode: 'voice',
      input_method: 'voice',
      retry_count: failureCount,
    });
  }, [traceId, matchId, rawTranscript, sanitizedTranscript, confidenceScore, failureCount]);

  return {
    handleVoiceConfirmed,
    handleVoiceCancelled,
    failureCount,
    resetFailureCount,
  };
}
