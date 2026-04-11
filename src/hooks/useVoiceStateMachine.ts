import { useEffect, useCallback, useRef } from 'react';
import { useVoiceStore, type VoiceState } from '../stores/voiceStore';
import { useWebSpeechRecognition } from './useWebSpeechRecognition';
import { audioController } from '../lib/audioController';
import { parseOutcome } from '../lib/voiceParser';

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
    setConfirmationText,
    setError,
    reset,
  } = useVoiceStore();

  const interimTranscriptRef = useRef('');
  const listeningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef(false);

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
      setState('IDLE');
      return;
    }

    setState('PROCESSING');
    setTranscript(finalTranscript);

    const parsed = parseOutcome(finalTranscript);

    setState('CONFIRMING');
    const confirmationPrompt = `I heard: ${finalTranscript}. Please confirm.`;
    setConfirmationText(confirmationPrompt);

    pauseListening();
    isSpeakingRef.current = true;

    const utterance = new SpeechSynthesisUtterance(confirmationPrompt);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    utterance.onend = () => {
      isSpeakingRef.current = false;
      resumeListening();
      startListening();

      listeningTimeoutRef.current = setTimeout(() => {
        handleConfirmationTimeout();
      }, 30000);
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [stopListening, setState, setTranscript, setConfirmationText, setError, pauseListening, resumeListening, startListening]);

  const handleConfirmation = useCallback(async () => {
    stopListening();
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
    }

    await audioController.playSuccessChime();
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
  }, [stopListening, reset, setState, onConfirmed]);

  const handleConfirmationTimeout = useCallback(() => {
    stopListening();
    setError('Confirmation timeout. Please try again.');
    setState('IDLE');
    if (onCancelled) {
      onCancelled();
    }
  }, [stopListening, setError, setState, onCancelled]);

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
