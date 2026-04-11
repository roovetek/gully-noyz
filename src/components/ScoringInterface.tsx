import React, { useCallback, useState } from 'react';
import { VideoCapture } from './VideoCapture';
import { VoiceDashboard } from './VoiceDashboard';
import { useVoiceStateMachine } from '../hooks/useVoiceStateMachine';
import { useVoiceIntegration } from '../hooks/useVoiceIntegration';
import { useMatch } from '../context/MatchContext';
import { useMatchClips } from '../context/MatchClipsContext';
import { useVoiceStore } from '../stores/voiceStore';
import { useVoiceMode } from './VoiceSettings';

export interface ScoringInterfaceProps {
  onDelivered?: (outcome: any) => Promise<void>;
}

export function ScoringInterface({ onDelivered }: ScoringInterfaceProps) {
  const voiceMode = useVoiceMode();
  const { matchId } = useMatch();
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const { handleVoiceConfirmed, handleVoiceCancelled, failureCount } = useVoiceIntegration({
    matchId: matchId || '',
    onDelivered,
    onError: setVoiceError,
  });

  const { startLoop, cancel, handleRecordingComplete, isSupported: isVoiceSupported } =
    useVoiceStateMachine({
      wakeWord: 'start recording',
      confirmationWord: 'confirmed',
      onConfirmed: handleVoiceConfirmed,
      onCancelled: handleVoiceCancelled,
    });

  const { state } = useVoiceStore();

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
