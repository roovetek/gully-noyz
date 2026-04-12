import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { VideoCapture } from './VideoCapture';
import { VoiceDashboard } from './VoiceDashboard';
import { useVoiceStateMachine } from '../hooks/useVoiceStateMachine';
import { useVoiceIntegration, type VoiceDeliveryOutcome } from '../hooks/useVoiceIntegration';
import { useMatch } from '../context/MatchContext';
import { useMatchClipsOptional } from '../context/MatchClipsContext';
import { useVoiceStore } from '../stores/voiceStore';
import { useVoiceMode } from './VoiceSettings';
import { executeTrackedAction, supabase } from '../lib/supabase';
import { deriveRecorderHudFromInningsClips } from '../lib/recorderFromClips';
import { DEFAULT_GLOBAL_RULES, getEffectiveRules } from '../lib/rulesEngine';
import type { BallOutcome, MatchRules } from '../lib/types';
import { useMatchEngine } from '../hooks/useMatchEngine';
import { deliveryPayloadToClipInsert } from '../engine/adapters';
import { ExtraType, WicketType, type DeliverBallActionPayload } from '../engine/types';

export interface ScoringInterfaceProps {
  onDelivered?: (outcome: VoiceDeliveryOutcome) => Promise<void>;
}

export function ScoringInterface({ onDelivered }: ScoringInterfaceProps) {
  const voiceMode = useVoiceMode();
  const { matchId } = useMatch();
  const matchClips = useMatchClipsOptional();
  const { initialize: initializeEngine, dispatch: dispatchEngine } = useMatchEngine();

  // Some tests mount Record/ScoringInterface without MatchClipsProvider.
  if (!matchClips) {
    return <VideoCapture />;
  }

  const { clips, refresh, currentInnings, ballsPerOver, totalOvers } = matchClips;

  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [rules, setRules] = useState<MatchRules>(DEFAULT_GLOBAL_RULES);

  const inningsClips = useMemo(
    () => clips.filter((clip) => clip.innings_number === currentInnings),
    [clips, currentInnings]
  );
  const hud = useMemo(
    () => deriveRecorderHudFromInningsClips(inningsClips, ballsPerOver, totalOvers),
    [inningsClips, ballsPerOver, totalOvers]
  );

  useEffect(() => {
    if (!matchId) return;
    void (async () => {
      const effectiveRules = (await getEffectiveRules(matchId)) ?? DEFAULT_GLOBAL_RULES;
      setRules(effectiveRules);
    })();
  }, [matchId]);

  useEffect(() => {
    if (!matchId) return;
    initializeEngine(matchId, rules);
  }, [matchId, rules, initializeEngine]);

  const mapVoiceExtraType = useCallback(
    (extraType: VoiceDeliveryOutcome['extraType'], outcomeValue: BallOutcome): ExtraType => {
      if (extraType === 'wide') return ExtraType.Wide;
      if (extraType === 'noball') return ExtraType.NoBall;
      if (extraType === 'bye') return ExtraType.Bye;
      if (extraType === 'legbye') return ExtraType.LegBye;
      if (outcomeValue === 'wide') return ExtraType.Wide;
      if (outcomeValue === 'noball') return ExtraType.NoBall;
      if (outcomeValue === 'bye') return ExtraType.Bye;
      if (outcomeValue === 'legbye') return ExtraType.LegBye;
      return ExtraType.None;
    },
    []
  );

  const mapDismissalType = useCallback((value?: string): WicketType | null => {
    if (!value) return null;
    const lower = value.toLowerCase();
    const allowed = new Set<string>(Object.values(WicketType));
    return allowed.has(lower) ? (lower as WicketType) : WicketType.Unknown;
  }, []);

  const handleDelivered = useCallback(
    async (outcome: VoiceDeliveryOutcome) => {
      if (!matchId) throw new Error('Missing match id for voice delivery');

      if (hud.usedDeliveries.has(hud.deliveryNumber)) {
        throw new Error(
          `Delivery ${hud.deliveryNumber} already exists for over ${hud.overNumber}. Refresh and retry.`
        );
      }

      const outcomeValue = outcome.outcome.toLowerCase() as BallOutcome;
      const highlight = ['4', '6', 'wicket'].includes(outcomeValue);
      const deliveryPayload: DeliverBallActionPayload = {
        outcome_label: outcomeValue,
        runs_batter: Math.max(0, outcome.batterRuns),
        runs_extras: Math.max(0, outcome.extraRuns),
        extra_type: mapVoiceExtraType(outcome.extraType, outcomeValue),
        wicket_type: mapDismissalType(outcome.dismissalType),
        wicket_counts: Boolean(outcome.dismissalType || outcomeValue === 'wicket'),
        metadata: {
          hit_timestamp_ms: null,
          video_clip_id: null,
          voice_intent_confidence: outcome.confidence,
          is_highlight: highlight,
          transcript: outcome.rawTranscript,
          input_method: outcome.inputMethod ?? 'voice',
          trace_id: outcome.traceId ?? null,
        },
      };

      const clipInsert = deliveryPayloadToClipInsert({
        matchId,
        inningsNumber: currentInnings,
        overNumber: hud.overNumber,
        ballNumber: hud.ballNumber,
        deliveryIndex: hud.deliveryNumber,
        payload: deliveryPayload,
        rules,
      });

      const { error: dbError } = await executeTrackedAction({
        tableName: 'clips',
        action: 'insert',
        payload: {
          ...clipInsert,
          video_url: null,
          duration: 0,
          trim_start_ms: null,
          trim_end_ms: null,
          hit_timestamp_ms: null,
          is_highlight: highlight,
          input_method: outcome.inputMethod ?? 'voice',
        },
        matchId,
        execute: async () =>
          supabase.from('clips').insert({
            ...clipInsert,
            video_url: null,
            duration: 0,
            trim_start_ms: null,
            trim_end_ms: null,
            hit_timestamp_ms: null,
            is_highlight: highlight,
            input_method: outcome.inputMethod ?? 'voice',
          }),
      });

      if (dbError) {
        throw dbError;
      }

      dispatchEngine({
        type: 'DELIVER_BALL',
        payload: {
          ...deliveryPayload,
          metadata: deliveryPayload.metadata,
        },
      });

      await refresh();

      if (onDelivered) {
        await onDelivered(outcome);
      }
    },
    [
      currentInnings,
      dispatchEngine,
      hud.ballNumber,
      hud.deliveryNumber,
      hud.overNumber,
      hud.usedDeliveries,
      matchId,
      onDelivered,
      refresh,
      rules,
      mapDismissalType,
      mapVoiceExtraType,
    ]
  );

  const { handleVoiceConfirmed, handleVoiceCancelled, failureCount } = useVoiceIntegration({
    matchId: matchId || '',
    onDelivered: handleDelivered,
    onError: setVoiceError,
  });

  const { startLoop, cancel, handleRecordingComplete, isSupported: isVoiceSupported } =
    useVoiceStateMachine({
      wakeWord: 'start recording',
      confirmationWord: 'confirmed',
      onConfirmed: handleVoiceConfirmed,
      onCancelled: handleVoiceCancelled,
    });

  const handleVoiceStart = useCallback(() => {
    setVoiceError(null);
    startLoop();
  }, [startLoop]);

  const handleVoiceStop = useCallback(() => {
    handleRecordingComplete();
  }, [handleRecordingComplete]);

  const handleVoiceConfirm = useCallback(() => {
    const voiceState = useVoiceStore.getState();
    handleVoiceConfirmed(voiceState.sanitizedTranscript);
  }, [handleVoiceConfirmed]);

  const handleVoiceCancel = useCallback(() => {
    cancel();
    setVoiceError(null);
  }, [cancel]);

  if (!voiceMode || !isVoiceSupported || failureCount >= 3) {
    return <VideoCapture />;
  }

  if (voiceMode && isVoiceSupported) {
    return (
      <VoiceDashboard
        onStart={handleVoiceStart}
        onStop={handleVoiceStop}
        onConfirm={handleVoiceConfirm}
        onCancel={handleVoiceCancel}
        error={voiceError}
      />
    );
  }

  return <VideoCapture />;
}
