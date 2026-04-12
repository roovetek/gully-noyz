import { useEffect, useCallback, useRef } from 'react';
import { useVoiceStore } from '../stores/voiceStore';
import { useWebSpeechRecognition } from './useWebSpeechRecognition';
import { audioController } from '../lib/audioController';
import { groundVoiceIntent } from '../lib/voiceOutcomeMapper';
import { sanitizeTranscript, sanitizeForSpeechSynthesis } from '../lib/voiceSecurityFilter';

export interface VoiceStateMachineConfig {
  wakeWord?: string;
  confirmationWord?: string;
  onConfirmed?: (transcript: string) => void | Promise<void>;
  onCancelled?: () => void;
}

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
  return 'Failed to save voice outcome.';
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

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const capturedRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onConfirmedRef = useRef(onConfirmed);
  const onCancelledRef = useRef(onCancelled);
  useEffect(() => {
    onConfirmedRef.current = onConfirmed;
  }, [onConfirmed]);
  useEffect(() => {
    onCancelledRef.current = onCancelled;
  }, [onCancelled]);

  const pauseListeningRef = useRef<(() => void) | null>(null);
  const resumeListeningRef = useRef<(() => void) | null>(null);
  const handleRecordingCompleteRef = useRef<() => void>(() => {});

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const triggerHapticFeedback = useCallback((pattern: number[]) => {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Haptics are optional and not supported consistently on desktop browsers.
    }
  }, []);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.9;
      u.pitch = 1;
      u.volume = 1;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }, []);

  const beginListeningWindow = useCallback(async () => {
    clearTimer();
    await audioController.playBeep(150, 880);
    triggerHapticFeedback([50]);
    capturedRef.current = '';
    setTranscript('');
    setError(null);
    setState('LISTENING');
    timerRef.current = setTimeout(() => {
      handleRecordingCompleteRef.current();
    }, 5000);
  }, [clearTimer, triggerHapticFeedback, setTranscript, setError, setState]);

  const doConfirmAndSave = useCallback(async () => {
    clearTimer();
    stopListeningRef.current?.();
    window.speechSynthesis.cancel();
    setState('PROCESSING');

    const safeTranscript = sanitizeTranscript(capturedRef.current).sanitized_transcript;
    try {
      if (onConfirmedRef.current) {
        await onConfirmedRef.current(safeTranscript);
      }
      await audioController.playSuccessChime();
      await speak('Saved!');
      triggerHapticFeedback([100, 50, 100]);

      reset();
      stateRef.current = 'IDLE';
    } catch (error) {
      await audioController.playBeep(180, 320);
      triggerHapticFeedback([220]);
      const message = getErrorMessage(error);
      setError(message);
      setState('IDLE');
    }
  }, [clearTimer, setState, speak, triggerHapticFeedback, reset]);

  const handleRecordingComplete = useCallback(async () => {
    clearTimer();
    stopListeningRef.current?.();

    const finalTranscript = capturedRef.current.trim();
    if (!finalTranscript) {
      setError("No outcome heard. Say 'Start Recording' to try again.");
      triggerHapticFeedback([300]);
      setState('IDLE');
      return;
    }

    const sanitized = sanitizeTranscript(finalTranscript);
    setRawTranscript(sanitized.raw_transcript);
    setSanitizedTranscript(sanitized.sanitized_transcript);
    setTranscript(finalTranscript);

    setState('PROCESSING');
    const parsed = groundVoiceIntent(finalTranscript);
    setConfidenceScore(parsed.confidence ?? 0);

    const readback = sanitizeForSpeechSynthesis(parsed.displayLabel || finalTranscript);
    const prompt = `${readback}. Say confirmed to save, or cancel.`;
    setConfirmationText(prompt);
    setState('CONFIRMING');

    pauseListeningRef.current?.();
    await speak(prompt);
    resumeListeningRef.current?.();

    timerRef.current = setTimeout(() => {
      setError('No confirmation heard. Ready again.');
      triggerHapticFeedback([250]);
      setState('IDLE');
      if (onCancelledRef.current) onCancelledRef.current();
    }, 10000);
  }, [
    clearTimer,
    setError,
    triggerHapticFeedback,
    setState,
    setRawTranscript,
    setSanitizedTranscript,
    setTranscript,
    setConfidenceScore,
    setConfirmationText,
    speak,
  ]);

  useEffect(() => {
    handleRecordingCompleteRef.current = () => {
      void handleRecordingComplete();
    };
  }, [handleRecordingComplete]);

  const {
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    isSupported,
  } = useWebSpeechRecognition({
    onTranscript: useCallback(
      (text: string, isFinal: boolean) => {
        const cur = stateRef.current;

        if (cur === 'IDLE') {
          if (isFinal && text.toLowerCase().includes(wakeWord.toLowerCase())) {
            void beginListeningWindow();
          }
          return;
        }

        if (cur === 'LISTENING') {
          capturedRef.current = text;
          setTranscript(text);
          if (isFinal) void handleRecordingComplete();
          return;
        }

        if (cur === 'CONFIRMING' && isFinal) {
          const lower = text.toLowerCase();
          if (
            lower.includes(confirmationWord.toLowerCase()) ||
            lower.includes('yes') ||
            lower.includes('save')
          ) {
            void doConfirmAndSave();
          } else if (lower.includes('cancel') || lower.includes('no')) {
            clearTimer();
            setError(null);
            setState('IDLE');
            if (onCancelledRef.current) onCancelledRef.current();
          }
        }
      },
      [
        wakeWord,
        confirmationWord,
        beginListeningWindow,
        doConfirmAndSave,
        setError,
      ]
    ),
    onError: (error) => {
      if (!error.includes('no-speech')) setError(error);
    },
  });

  const stopListeningRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    stopListeningRef.current = stopListening;
  }, [stopListening]);

  useEffect(() => {
    pauseListeningRef.current = pauseListening;
    resumeListeningRef.current = resumeListening;
  }, [pauseListening, resumeListening]);

  const startLoop = useCallback(() => {
    if (!isSupported) {
      setError('Speech Recognition not supported in your browser');
      return;
    }

    clearTimer();
    window.speechSynthesis.cancel();
    reset();
    setState('IDLE');
    stateRef.current = 'IDLE';
    setTranscript('');
    setRawTranscript('');
    setSanitizedTranscript('');
    setConfidenceScore(0);
    capturedRef.current = '';
    startListening();
    void beginListeningWindow();
  }, [
    isSupported,
    clearTimer,
    reset,
    setState,
    setTranscript,
    setRawTranscript,
    setSanitizedTranscript,
    setConfidenceScore,
    startListening,
    beginListeningWindow,
    setError,
  ]);

  const confirmCurrent = useCallback(() => {
    if (stateRef.current !== 'CONFIRMING') {
      setError('No voice outcome is awaiting confirmation.');
      return;
    }
    void doConfirmAndSave();
  }, [setError, doConfirmAndSave]);

  const cancel = useCallback(() => {
    clearTimer();
    window.speechSynthesis.cancel();
    stopListening();
    setError(null);
    reset();
    setState('IDLE');
    stateRef.current = 'IDLE';
    if (onCancelledRef.current) onCancelledRef.current();
  }, [clearTimer, stopListening, setError, reset, setState]);

  return {
    state,
    transcript,
    startLoop,
    cancel,
    handleRecordingComplete,
    confirmCurrent,
    isSupported,
  };
}
