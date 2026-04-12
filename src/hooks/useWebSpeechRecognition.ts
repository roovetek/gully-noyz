import { useEffect, useRef, useCallback } from 'react';
import { useVoiceStore } from '../stores/voiceStore';
import { audioController } from '../lib/audioController';

interface UseWebSpeechRecognitionProps {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export function useWebSpeechRecognition({
  onTranscript,
  onError,
}: UseWebSpeechRecognitionProps) {
  const recognitionRef = useRef<any>(null);
  const isActiveRef = useRef(false);
  // Always-fresh callback refs — avoids stale closures in recognition event handlers
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  useEffect(() => { onTranscriptRef.current = onTranscript; });
  useEffect(() => { onErrorRef.current = onError; });

  const { setIsListening, setError } = useVoiceStore();

  const createRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // simpler than continuous; we auto-restart on onend
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      // NOTE: VoiceState transitions are owned by the state machine, NOT here
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (interim) onTranscriptRef.current(interim, false);
      if (final) onTranscriptRef.current(final.trim(), true);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart for continuous wake-word polling
      if (isActiveRef.current) {
        setTimeout(() => {
          if (isActiveRef.current && recognitionRef.current) {
            try { recognitionRef.current.start(); } catch (_) {}
          }
        }, 150);
      }
    };

    recognition.onerror = (event: any) => {
      // no-speech and aborted are expected during idle polling — suppress them
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      const msg = `Speech error: ${event.error}`;
      setError(msg);
      if (onErrorRef.current) onErrorRef.current(msg);
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [setIsListening, setError]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) createRecognition();
    if (!recognitionRef.current) return;
    isActiveRef.current = true;
    try { recognitionRef.current.start(); } catch (_) {}
  }, [createRecognition]);

  const stopListening = useCallback(() => {
    isActiveRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }
  }, []);

  const pauseListening = useCallback(() => {
    isActiveRef.current = false;
    audioController.pauseRecognition(recognitionRef.current);
  }, []);

  const resumeListening = useCallback(() => {
    isActiveRef.current = true;
    audioController.resumeRecognition(recognitionRef.current);
  }, []);

  useEffect(() => {
    createRecognition();
    return () => {
      isActiveRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }
    };
  }, [createRecognition]);

  const isSupported =
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return { startListening, stopListening, pauseListening, resumeListening, isSupported };
}
