import { create } from 'zustand';

export type VoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'CONFIRMING';

export interface VoiceStoreState {
  state: VoiceState;
  transcript: string;
  sanitizedTranscript: string;
  rawTranscript: string;
  isListening: boolean;
  error: string | null;
  confirmationText: string;
  traceId: string;
  confidenceScore: number;
  failureCount: number;
  setState: (state: VoiceState) => void;
  setTranscript: (transcript: string) => void;
  setSanitizedTranscript: (transcript: string) => void;
  setRawTranscript: (transcript: string) => void;
  setIsListening: (isListening: boolean) => void;
  setError: (error: string | null) => void;
  setConfirmationText: (text: string) => void;
  setTraceId: (id: string) => void;
  setConfidenceScore: (score: number) => void;
  incrementFailureCount: () => void;
  resetFailureCount: () => void;
  reset: () => void;
}

function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const useVoiceStore = create<VoiceStoreState>((set) => ({
  state: 'IDLE',
  transcript: '',
  sanitizedTranscript: '',
  rawTranscript: '',
  isListening: false,
  error: null,
  confirmationText: '',
  traceId: generateTraceId(),
  confidenceScore: 0,
  failureCount: 0,
  setState: (state) => set({ state }),
  setTranscript: (transcript) => set({ transcript }),
  setSanitizedTranscript: (transcript) => set({ sanitizedTranscript: transcript }),
  setRawTranscript: (transcript) => set({ rawTranscript: transcript }),
  setIsListening: (isListening) => set({ isListening }),
  setError: (error) => set({ error }),
  setConfirmationText: (text) => set({ confirmationText: text }),
  setTraceId: (id) => set({ traceId: id }),
  setConfidenceScore: (score) => set({ confidenceScore: score }),
  incrementFailureCount: () => set((state) => ({ failureCount: state.failureCount + 1 })),
  resetFailureCount: () => set({ failureCount: 0 }),
  reset: () => set({
    state: 'IDLE',
    transcript: '',
    sanitizedTranscript: '',
    rawTranscript: '',
    isListening: false,
    error: null,
    confirmationText: '',
    traceId: generateTraceId(),
    confidenceScore: 0,
    failureCount: 0,
  }),
}));
