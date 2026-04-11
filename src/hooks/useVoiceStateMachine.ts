import { useEffect, useCallback, useRef } from 'react';
import { useVoiceStore, type VoiceState } from '../stores/voiceStore';
import { useWebSpeechRecognition } from './useWebSpeechRecognition';
import { audioController } from '../lib/audioController';
import { parseOutcome } from '../lib/voiceParser';
import { sanitizeTranscript, sanitizeForSpeechSynthesis } from '../lib/voiceSecurityFilter';

export interface VoiceStateMachineConfig {
  wakeWord?: string;
  confirmationWord?: string;
  onConfirmed?: (transcript: string) => void;
  onCancelled?: () => void;
}

export function useVoiceStateMachine({
  wakeWord = 'start recording',
  confirmationWord = 'confirmed',
  onConfirmed,
  onCancelled,
}: VoiceStateMachineConfig) {
  const {
    state,
    transcript,
    setState,
    setTranscript,
    setSanitizedTranscript,
    setRawTranscript,
    setConfirmationText,
    setError,
    setConfidenceScore,
    reset,
  } = useVoiceStore();

  const interimTranscriptRef = useRef('');
  const listeningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef(false);

  const triggerHapticFeedback = useCallback((pattern: number[]) => {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        console.debug('Haptic feedback not available');
      }
    }
  }, []);

  const { startListening, stopListening, pauseListening, resumeListening, isSupported } =
    useWebSpeechRecognition({
      onTranscript: (transcript, isFinal) => {
        interimTranscriptRef.current = transcript;
        setTranscript(transcript);

        if (state === 'IDLE' && isFinal) {
          const lowerTranscript = transcript.toLowerCase();
          if (lowerTranscript.includes(wakeWord.toLowerCase())) {
            handleWakeWordDetected();
          }
        }

        if (state === 'CONFIRMING' && isFinal) {
          const lowerTranscript = transcript.toLowerCase();
          if (lowerTranscript.includes(confirmationWord.toLowerCase())) {
            handleConfirmation();
          }
        }
      },
      onError: (error) => {
        setError(error);
      },
    });

  const handleWakeWordDetected = useCallback(async () => {
    await audioController.playBeep(200, 1000);
    triggerHapticFeedback([50]);
    setState('LISTENING');
    setTranscript('');
    interimTranscriptRef.current = '';
    startListening();

    listeningTimeoutRef.current = setTimeout(() => {
      stopListening();
    }, 5000);
  }, [startListening, stopListening, setState, setTranscript]);

  const handleRecordingComplete = useCallback(async () => {
    stopListening();
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
    }

    const finalTranscript = interimTranscriptRef.current.trim();
    if (!finalTranscript) {
      setError('No speech detected. Try again.');
      triggerHapticFeedback([300]);
      setState('IDLE');
      return;
    }

    const sanitized = sanitizeTranscript(finalTranscript);
    setRawTranscript(sanitized.raw_transcript);
    setSanitizedTranscript(sanitized.sanitized_transcript);

    setState('PROCESSING');
    setTranscript(finalTranscript);

    const parsed = parseOutcome(finalTranscript);
    if (parsed.confidence_score) {
      setConfidenceScore(parsed.confidence_score);
    }

    setState('CONFIRMING');
    const confirmationPrompt = `I heard: ${finalTranscript}. Please confirm.`;
    const safeSynthesisText = sanitizeForSpeechSynthesis(confirmationPrompt);
    setConfirmationText(safeSynthesisText);

    pauseListening();
    isSpeakingRef.current = true;
    triggerHapticFeedback([100, 50, 100]);

    const utterance = new SpeechSynthesisUtterance(safeSynthesisText);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    utterance.onstart = () => {
      pauseListening();
    };

    utterance.onend = () => {
      isSpeakingRef.current = false;
      setTimeout(() => {
        resumeListening();
        startListening();
      }, 500);

      listeningTimeoutRef.current = setTimeout(() => {
        handleConfirmationTimeout();
      }, 30000);
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [stopListening, setState, setTranscript, setSanitizedTranscript, setRawTranscript, setConfirmationText, setError, setConfidenceScore, pauseListening, resumeListening, startListening, triggerHapticFeedback]);

  const handleConfirmation = useCallback(async () => {
    stopListening();
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
    }

    await audioController.playSuccessChime();
    triggerHapticFeedback([100, 50, 100]);
    isSpeakingRef.current = true;

    const utterance = new SpeechSynthesisUtterance('Saved!');
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    utterance.onend = () => {
      isSpeakingRef.current = false;
      if (onConfirmed) {
        onConfirmed(interimTranscriptRef.current);
      }
      reset();
      setState('IDLE');
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [stopListening, reset, setState, onConfirmed, triggerHapticFeedback]);

  const handleConfirmationTimeout = useCallback(() => {
    stopListening();
    triggerHapticFeedback([300]);
    setError('Confirmation timeout. Please try again.');
    setState('IDLE');
    if (onCancelled) {
      onCancelled();
    }
  }, [stopListening, setError, setState, onCancelled, triggerHapticFeedback]);

  const cancel = useCallback(() => {
    stopListening();
    window.speechSynthesis.cancel();
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
    }
    setError(null);
    reset();
    setState('IDLE');
    if (onCancelled) {
      onCancelled();
    }
  }, [stopListening, reset, setState, setError, onCancelled]);

  const startLoop = useCallback(() => {
    if (!isSupported) {
      setError('Speech Recognition not supported in your browser');
      return;
    }
    setState('IDLE');
    setTranscript('');
    interimTranscriptRef.current = '';
    startListening();
  }, [isSupported, setState, setTranscript, startListening, setError]);

  useEffect(() => {
    if (state === 'LISTENING') {
      if (!listeningTimeoutRef.current) {
        listeningTimeoutRef.current = setTimeout(() => {
          handleRecordingComplete();
        }, 5000);
      }
    }
  }, [state, handleRecordingComplete]);

  return {
    state,
    transcript,
    startLoop,
    cancel,
    handleRecordingComplete,
    isSupported,
  };
}
