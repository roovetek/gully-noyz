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
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
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
