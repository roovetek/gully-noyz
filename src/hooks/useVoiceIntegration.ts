import { useCallback } from 'react';
import { useVoiceStore } from '../stores/voiceStore';
import { logVoiceInteraction } from '../lib/voiceAuditLog';
import { groundVoiceIntent, type VoiceExtraType } from '../lib/voiceOutcomeMapper';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>;
    const candidate =
      value.message ??
      value.error_description ??
      value.details ??
      value.hint ??
      value.code;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }
  return 'Unknown error processing voice input';
}

function getExplicitConfirmationMessage(reasons: string[] | undefined): string {
  if (!reasons?.length) {
    return 'Ambiguous voice command. Please repeat with one outcome only.';
  }

  if (reasons.includes('wicket-type-required')) {
    return 'Specify the dismissal type, for example wicket bowled, wicket caught, or wicket lbw.';
  }

  if (reasons.includes('run-wicket-conflict')) {
    return 'Say either the wicket or the runs, not both in the same command.';
  }

  if (reasons.includes('conflicting-extras')) {
    return 'Use one extras type only, for example wide or leg bye.';
  }

  if (reasons.includes('multiple-run-values')) {
    return 'Use one run value only, for example one run or four.';
  }

  if (reasons.includes('fuzzy-match') || reasons.includes('ambiguous-sound')) {
    return 'That sounded close to a cricket term, but not clear enough to save. Please repeat it explicitly.';
  }

  return 'Could not determine the outcome clearly. Please repeat the command.';
}

export interface VoiceDeliveryOutcome {
  outcome: string;
  extraRuns: number;
  batterRuns: number;
  extraType?: VoiceExtraType | null;
  dismissalType?: string;
  confidence: number;
  label: string;
  rawTranscript: string;
  traceId?: string;
  inputMethod?: 'voice';
}

export interface VoiceIntegrationConfig {
  matchId: string;
  onDelivered?: (outcome: VoiceDeliveryOutcome) => Promise<void>;
  onError?: (error: string) => void;
}

export function useVoiceIntegration({
  matchId,
  onDelivered,
  onError,
}: VoiceIntegrationConfig) {
  const {
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
        const mapped = groundVoiceIntent(transcript);
        const parsedConfidence = mapped.confidence ?? 0;

        if (mapped.requiresManualConfirmation) {
          const manualConfirmationMessage = getExplicitConfirmationMessage(
            mapped.confirmationReasons
          );

          await logVoiceInteraction({
            trace_id: traceId,
            match_id: matchId,
            raw_transcript: rawTranscript,
            sanitized_transcript: sanitizedTranscript,
            confidence_score: parsedConfidence,
            confirmation_status: 'pending',
            mode: 'voice',
            input_method: 'voice',
            error_message: manualConfirmationMessage,
            retry_count: failureCount,
          });

          if (onError) {
            onError(manualConfirmationMessage);
          }
          incrementFailureCount();
          return;
        }

        if (parsedConfidence < 0.6) {
          await logVoiceInteraction({
            trace_id: traceId,
            match_id: matchId,
            raw_transcript: rawTranscript,
            sanitized_transcript: sanitizedTranscript,
            confidence_score: parsedConfidence,
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
          await onDelivered({
            outcome: mapped.outcome,
            extraRuns: Math.max(0, mapped.extraRuns ?? 0),
            batterRuns: Math.max(0, mapped.batterRuns ?? 0),
            extraType: mapped.extraType ?? null,
            dismissalType: mapped.dismissalType,
            confidence: parsedConfidence,
            label: mapped.displayLabel,
            rawTranscript: mapped.sanitizedTranscript,
            traceId,
            inputMethod: 'voice',
          });
        }

        await logVoiceInteraction({
          trace_id: traceId,
          match_id: matchId,
          raw_transcript: rawTranscript,
          sanitized_transcript: sanitizedTranscript,
          confidence_score: parsedConfidence,
          confirmation_status: 'confirmed',
          mode: 'voice',
          input_method: 'voice',
          retry_count: failureCount,
        });

        resetFailureCount();
      } catch (err) {
        const message = getErrorMessage(err);

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
