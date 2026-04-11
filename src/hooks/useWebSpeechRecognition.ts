import { useEffect, useRef, useCallback } from 'react';
import { useVoiceStore } from '../stores/voiceStore';
import { audioController } from '../lib/audioController';

interface UseWebSpeechRecognitionProps {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  listeningTimeout?: number;
}

export function useWebSpeechRecognition({
  onTranscript,
  onError,
  listeningTimeout = 15000,
}: UseWebSpeechRecognitionProps) {
  const recognitionRef = useRef<any>(null);
  const listeningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { setState, setIsListening, setError } = useVoiceStore();

  const initRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setState('LISTENING');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        onTranscript(interimTranscript, false);
      }

      if (finalTranscript) {
        onTranscript(finalTranscript.trim(), true);
        if (listeningTimeoutRef.current) {
          clearTimeout(listeningTimeoutRef.current);
        }
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
      }
    };

    recognition.onerror = (event: any) => {
      const errorMessage = `Speech recognition error: ${event.error}`;
      setError(errorMessage);
      setIsListening(false);
      if (onError) onError(errorMessage);
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [onTranscript, onError, setIsListening, setState, setError]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      initRecognition();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        listeningTimeoutRef.current = setTimeout(() => {
          stopListening();
        }, listeningTimeout);
      } catch (e) {
      }
    }
  }, [initRecognition, listeningTimeout]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
    }
  }, []);

  const pauseListening = useCallback(() => {
    audioController.pauseRecognition(recognitionRef.current);
  }, []);

  const resumeListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
      }
    }
  }, []);

  useEffect(() => {
    initRecognition();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
      }
    };
  }, [initRecognition]);

  return {
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    isSupported: !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
  };
}
